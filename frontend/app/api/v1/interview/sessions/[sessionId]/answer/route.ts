import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'https://krino-backend.onrender.com'

export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const auth = req.headers.get('authorization') ?? ''
  const url = `${BACKEND}/api/v1/interview/sessions/${params.sessionId}/answer`
  const body = await req.text()

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(auth ? { Authorization: auth } : {}),
    },
    body,
  })

  const data = await res.text()
  return new NextResponse(data, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
