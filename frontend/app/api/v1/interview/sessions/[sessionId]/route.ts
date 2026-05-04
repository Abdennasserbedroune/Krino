import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'https://krino-backend.onrender.com'

async function proxy(req: NextRequest, path: string) {
  const auth = req.headers.get('authorization') ?? ''
  const url = `${BACKEND}/api/v1${path}`
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

export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  return proxy(req, `/interview/sessions/${params.sessionId}`)
}
