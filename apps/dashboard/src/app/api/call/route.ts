import { NextRequest, NextResponse } from 'next/server';

const CONSUMER_SERVICE_URL =
  process.env.CONSUMER_SERVICE_URL || 'http://localhost:3002';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const res = await fetch(`${CONSUMER_SERVICE_URL}/api/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        status: 0,
        body: null,
        targetEndpoint: '/api/protected/middleware-steps',
        error: err instanceof Error ? err.message : 'Backend unreachable',
      },
      { status: 502 },
    );
  }
}
