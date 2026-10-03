import { describe, expect, it } from 'vitest';
import { endpointId, isAllowedEndpoint, timerRequest } from './validate';

const request = (overrides: Record<string, unknown> = {}) => ({
  subscription: {
    endpoint: 'https://web.push.apple.com/QGuQyavXutnMH',
    keys: { p256dh: 'BOr1', auth: 'k3y' },
  },
  durationMs: 90_000,
  title: 'Recupero finito',
  body: 'Panca piana con bilanciere, serie 3 di 4',
  ...overrides,
});

describe('isAllowedEndpoint (SPEC §7.2)', () => {
  it.each([
    'https://web.push.apple.com/abc',
    'https://api.push.apple.com/abc',
    'https://fcm.googleapis.com/fcm/send/abc',
    'https://updates.push.services.mozilla.com/wpush/v2/abc',
  ])('allows %s', (url) => {
    expect(isAllowedEndpoint(url)).toBe(true);
  });

  it.each([
    'http://web.push.apple.com/abc',
    'https://push.apple.com.evil.example/abc',
    'https://evil-push.apple.com/abc',
    'https://example.com/abc',
    'not a url',
  ])('rejects %s', (url) => {
    expect(isAllowedEndpoint(url)).toBe(false);
  });
});

describe('timerRequest', () => {
  it('accepts the documented payload', () => {
    expect(timerRequest.safeParse(request()).success).toBe(true);
  });

  it.each([
    ['durationMs below 1 s', { durationMs: 999 }],
    ['durationMs above 1 h', { durationMs: 3_600_001 }],
    ['a title over 60 characters', { title: 'x'.repeat(61) }],
    ['a body over 120 characters', { body: 'x'.repeat(121) }],
    [
      'a foreign endpoint',
      { subscription: { endpoint: 'https://example.com/x', keys: { p256dh: 'a', auth: 'b' } } },
    ],
  ])('rejects %s', (_, overrides) => {
    expect(timerRequest.safeParse(request(overrides)).success).toBe(false);
  });
});

describe('endpointId', () => {
  it('is a stable sha256 hex digest', async () => {
    const id = await endpointId('https://web.push.apple.com/abc');
    expect(id).toMatch(/^[0-9a-f]{64}$/);
    expect(await endpointId('https://web.push.apple.com/abc')).toBe(id);
  });
});
