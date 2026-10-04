/**
 * Phone-size screenshots of the dev server with demo data (src/db/demo.ts), for design review.
 *
 * Drives Chrome/Edge over the DevTools protocol (CDP) instead of the CLI --screenshot flag:
 * on this machine --screenshot fires at the page's load event, before the demo data finishes
 * writing to IndexedDB and React renders it, producing blank PNGs — and raising
 * --virtual-time-budget does not help, because virtual time stalls IndexedDB outright. CDP lets
 * the script wait for the actual rendered content before capturing, using one browser process for
 * every shot instead of spawning Chrome 34 times.
 *
 *   bun run dev                         (in another terminal)
 *   bun run screens                     every shot at 390×844 and 375×667
 *   bun run screens --only=today,workout --reduced
 *
 * Output: .impeccable/review/<name>-<width>[-reduced].png. Set CHROME to the browser executable
 * when Chrome or Edge is not in a standard place, BASE_URL when the server is not on port 5173.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const browser = [
  process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].find((path) => path !== undefined && existsSync(path));
if (!browser) throw new Error('Chrome or Edge not found: set CHROME to the browser executable.');

const base = process.env.BASE_URL ?? 'http://localhost:5173';
const out = resolve('.impeccable/review');
const viewports: [number, number][] = [
  [390, 844],
  [375, 667],
];
const shots: [string, string][] = [
  ['today', '/?demo'],
  ['today-active', '/?demo=workout'],
  ['workout', '/workout/demo-session?demo=workout'],
  ['workout-rest-done', '/workout/demo-session?demo=rest-done'],
  ['summary', '/workout/demo-done/summary?demo'],
  ['programs', '/programs?demo'],
  ['program', '/programs/demo-program?demo'],
  ['day', '/programs/demo-program/days/demo-day-a?demo'],
  ['library', '/programs?tab=exercises&demo'],
  ['exercise', '/exercises/demo-panca-piana-con-bilanciere?demo'],
  ['history', '/history?demo'],
  ['session', '/history/demo-done?demo'],
  ['progress', '/progress?demo'],
  ['progress-groups', '/progress?tab=groups&demo'],
  ['progress-consistency', '/progress?tab=consistency&demo'],
  ['bodyweight', '/progress/bodyweight?demo'],
  ['settings', '/settings?demo'],
];

const args = process.argv.slice(2);
const reduced = args.includes('--reduced');
const only = args
  .find((arg) => arg.startsWith('--only='))
  ?.slice('--only='.length)
  .split(',');
mkdirSync(out, { recursive: true });

const profile = mkdtempSync(join(tmpdir(), 'palestra-shots-'));
const chrome = spawn(
  browser,
  [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    `--user-data-dir=${profile}`,
    '--remote-debugging-port=0',
    ...(reduced ? ['--force-prefers-reduced-motion'] : []),
  ],
  { stdio: ['ignore', 'ignore', 'pipe'] },
);

function cleanup(): void {
  chrome.kill();
  try {
    rmSync(profile, { recursive: true, force: true });
  } catch {
    // Chrome can still hold the profile for a moment on Windows: the OS cleans tmp later.
  }
}
process.on('exit', cleanup);

/** Chrome prints "DevTools listening on ws://127.0.0.1:<port>/devtools/browser/<id>" on stderr. */
async function readDevToolsPort(): Promise<number> {
  return new Promise((resolvePort, reject) => {
    let buf = '';
    const timeout = setTimeout(() => {
      reject(new Error('Chrome did not open a DevTools port in time.'));
    }, 10_000);
    chrome.stderr?.on('data', (chunk: Buffer) => {
      buf += chunk.toString();
      const match = buf.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)\//);
      if (match?.[1]) {
        clearTimeout(timeout);
        resolvePort(Number(match[1]));
      }
    });
    chrome.on('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error(`Chrome exited before opening a DevTools port (code ${code}).`));
    });
  });
}

async function cdpHttp(
  port: number,
  path: string,
  method = 'GET',
): Promise<{ id: string; webSocketDebuggerUrl: string }> {
  const res = await fetch(`http://127.0.0.1:${port}${path}`, { method });
  return res.json();
}

/** Loose shape of a CDP command result: just enough for the two fields this script reads. */
interface CdpResult {
  result?: { value?: unknown };
  data?: string;
}

/** A command gets this long to answer before its call is rejected (tab crash, hung renderer). */
const COMMAND_TIMEOUT_MS = 8_000;

type Send = (method: string, params?: Record<string, unknown>) => Promise<CdpResult>;

let msgId = 0;

interface PendingCall {
  resolve: (result: CdpResult) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * Wires one tab's websocket to a `send(method, params)` function. Every in-flight call gets its
 * own timeout, and a disconnect (close/error) rejects every call still waiting — otherwise a
 * crashed tab or a silently dropped socket would hang `await send(...)` forever, taking the whole
 * script down with it instead of surfacing a FAIL for that one shot.
 */
function connectClient(ws: WebSocket): Send {
  const pending = new Map<number, PendingCall>();

  const failAll = (error: Error) => {
    for (const { reject, timer } of pending.values()) {
      clearTimeout(timer);
      reject(error);
    }
    pending.clear();
  };

  ws.addEventListener('message', (event: MessageEvent) => {
    const msg = JSON.parse(event.data as string);
    const entry = pending.get(msg.id);
    if (!entry) return;
    clearTimeout(entry.timer);
    pending.delete(msg.id);
    if (msg.error) entry.reject(new Error(msg.error.message));
    else entry.resolve(msg.result);
  });
  ws.addEventListener('close', () => failAll(new Error('DevTools WebSocket closed unexpectedly.')));
  ws.addEventListener('error', () => failAll(new Error('DevTools WebSocket error.')));

  return (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++msgId;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`CDP call "${method}" timed out after ${COMMAND_TIMEOUT_MS} ms.`));
      }, COMMAND_TIMEOUT_MS);
      pending.set(id, { resolve, reject, timer });
      ws.send(JSON.stringify({ id, method, params }));
    });
}

/**
 * Opens a tab, navigates it, waits for the demo screen to render (seedDemo + React, not just the
 * page's load event) and captures a PNG. The wait is a poll on the rendered text rather than a
 * fixed delay, because a running rest timer keeps re-rendering (SPEC §7.1) and would never let the
 * page "settle".
 */
async function captureShot(
  port: number,
  path: string,
  width: number,
  height: number,
  file: string,
): Promise<void> {
  const target = await cdpHttp(port, '/json/new?about:blank', 'PUT');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  const send = connectClient(ws);
  await new Promise((resolveOpen, reject) => {
    ws.onopen = () => resolveOpen(undefined);
    ws.onerror = () => reject(new Error('DevTools WebSocket connection failed.'));
  });
  try {
    await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 2,
      mobile: false,
    });
    await send('Page.navigate', { url: `${base}${path}` });

    const deadline = Date.now() + 10_000;
    let rendered = false;
    while (Date.now() < deadline) {
      const result = await send('Runtime.evaluate', {
        expression: '(document.getElementById("root")?.innerText ?? "").trim().length',
      });
      if ((result.result?.value ?? 0) > 20) {
        rendered = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 150));
    }
    if (!rendered) throw new Error('timed out waiting for content to render');
    // Let the final layout/paint settle; summary screens count up (600 ms) and list records after.
    await new Promise((r) => setTimeout(r, path.includes('/summary') ? 1500 : 300));

    const shot = await send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: false,
    });
    writeFileSync(file, Buffer.from(shot.data as string, 'base64'));
  } finally {
    ws.close();
    await cdpHttp(port, `/json/close/${target.id}`).catch(() => {});
  }
}

async function main(): Promise<void> {
  const port = await readDevToolsPort();
  let failures = 0;
  for (const [name, path] of shots) {
    if (only && !only.includes(name)) continue;
    for (const [width, height] of viewports) {
      const file = join(out, `${name}-${width}${reduced ? '-reduced' : ''}.png`);
      try {
        await captureShot(port, path, width, height, file);
        console.log(`ok    ${file}`);
      } catch (error) {
        failures++;
        console.log(`FAIL  ${name}-${width}: ${String(error)}`);
      }
    }
  }
  process.exitCode = failures > 0 ? 1 : 0;
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(cleanup);
