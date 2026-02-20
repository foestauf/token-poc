const CONSUMER_SERVICE_URL =
  process.env.CONSUMER_SERVICE_URL || 'http://localhost:3002';

export async function GET() {
  try {
    const upstream = await fetch(`${CONSUMER_SERVICE_URL}/api/token/watch`, {
      headers: { Accept: 'text/event-stream' },
    });

    if (!upstream.body) {
      return new Response('Upstream returned no body', { status: 502 });
    }

    return new Response(upstream.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Backend unreachable';
    return new Response(`data: ${JSON.stringify({ type: 'error', message, timestamp: Date.now() })}\n\n`, {
      headers: { 'Content-Type': 'text/event-stream' },
      status: 502,
    });
  }
}
