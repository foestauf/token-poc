import { NextRequest, NextResponse } from 'next/server';

const TOKEN_SERVICE_URL =
  process.env.TOKEN_SERVICE_URL || 'http://localhost:3001';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const res = await fetch(`${TOKEN_SERVICE_URL}/api/token/info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Backend unreachable' },
      { status: 502 },
    );
  }
}
