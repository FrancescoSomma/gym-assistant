import { cancelRequest, endpointId, timerRequest } from './validate';

export { TimerDO } from './timer-do';

const status = (code: number, headers?: HeadersInit) =>
  new Response(null, { status: code, headers });

// Never log subscriptions or payloads (SPEC §7.2).
export default {
  async fetch(request, env): Promise<Response> {
    if (new URL(request.url).pathname !== '/api/timer') return status(404);
    const body: unknown = await request.json().catch(() => null);

    if (request.method === 'POST') {
      const parsed = timerRequest.safeParse(body);
      if (!parsed.success) return status(400);
      const stub = env.TIMER.getByName(await endpointId(parsed.data.subscription.endpoint));
      await stub.schedule(parsed.data);
      return status(204);
    }

    if (request.method === 'DELETE') {
      const parsed = cancelRequest.safeParse(body);
      if (!parsed.success) return status(400);
      await env.TIMER.getByName(await endpointId(parsed.data.endpoint)).cancel();
      return status(204);
    }

    return status(405, { Allow: 'POST, DELETE' });
  },
} satisfies ExportedHandler<Env>;
