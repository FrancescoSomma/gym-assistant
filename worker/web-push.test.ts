import { afterEach, describe, expect, it, vi } from 'vitest';
import { sendRestPush } from './web-push';

const base64url = (bytes: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

async function fixtures() {
  // Workers types return unions from generateKey/exportKey: narrow them explicitly.
  const vapid = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
    'sign',
    'verify',
  ])) as CryptoKeyPair;
  const browser = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
    'deriveBits',
  ])) as CryptoKeyPair;
  const raw = async (key: CryptoKey) =>
    base64url((await crypto.subtle.exportKey('raw', key)) as ArrayBuffer);
  // Env also holds TIMER and literal-typed vars: the test only needs the VAPID fields.
  const env = {
    VAPID_SUBJECT: 'mailto:test@example.com',
    VAPID_PUBLIC_KEY: await raw(vapid.publicKey),
    VAPID_PRIVATE_KEY:
      ((await crypto.subtle.exportKey('jwk', vapid.privateKey)) as JsonWebKey).d ?? '',
  } as unknown as Env;
  const keys = {
    p256dh: await raw(browser.publicKey),
    auth: base64url(crypto.getRandomValues(new Uint8Array(16)).buffer),
  };
  return { env, keys };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('sendRestPush', () => {
  it('posts an encrypted aes128gcm payload with TTL 60 and high urgency', async () => {
    const { env, keys } = await fixtures();
    const fetchMock = vi.fn(
      async (_url: string, _init: RequestInit) => new Response(null, { status: 201 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await sendRestPush(
      {
        subscription: { endpoint: 'https://web.push.apple.com/abc', keys },
        durationMs: 90_000,
        title: 'Recupero finito',
        body: 'Panca, serie 1 di 3',
      },
      env,
    );

    expect(response.status).toBe(201);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('https://web.push.apple.com/abc');
    const headers = new Headers(init?.headers);
    expect(headers.get('ttl')).toBe('60');
    expect(headers.get('urgency')).toBe('high');
    expect(headers.get('content-encoding')).toBe('aes128gcm');
    expect(headers.get('authorization')).toMatch(/^vapid t=.+, k=.+$/);
  });
});
