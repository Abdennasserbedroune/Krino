import { NextRequest, NextResponse } from 'next/server'

// NEVER use NEXT_PUBLIC_* here — that points to Vercel itself and causes a 508 loop.
// BACKEND_API_URL must be a server-only env var pointing to Render.
const BACKEND = (process.env.BACKEND_API_URL ?? '').replace(/\/$/, '') || 'https://krino-backend.onrender.com'

async function proxy(req: NextRequest, path: string) {
  const auth = req.headers.get('authorization') ?? ''
  const url = `${BACKEND}${path}`

  const isGet = req.method === 'GET'
  const body = isGet ? undefined : await req.text()

  const res = await fetch(url, {
    method: req.method,
    headers: {
      'Content-Type': 'application/json',
      ...(auth ? { Authorization: auth } : {}),
    },
    ...(body ? { body } : {}),
  })

  const data = await res.text()
  return new NextResponse(data, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function GET(req: NextRequest) {
  return proxy(req, '/api/v1/interview/sessions')
}

export async function POST(req: NextRequest) {
  return proxy(req, '/api/v1/interview/sessions')
}
