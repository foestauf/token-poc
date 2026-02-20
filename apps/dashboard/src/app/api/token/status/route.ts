import { NextResponse } from 'next/server';

const CONSUMER_SERVICE_URL =
  process.env.CONSUMER_SERVICE_URL || 'http://localhost:3002';

export async function GET() {
  try {
    const res = await fetch(`${CONSUMER_SERVICE_URL}/api/token/status`, {
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { exists: false, error: err instanceof Error ? err.message : 'Backend unreachable' },
      { status: 502 },
    );
  }
}
