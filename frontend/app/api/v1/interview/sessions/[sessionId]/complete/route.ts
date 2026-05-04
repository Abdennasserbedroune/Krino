import { NextRequest, NextResponse } from 'next/server'

const BACKEND = (process.env.BACKEND_API_URL ?? '').replace(/\/$/, '') || 'https://krino-backend.onrender.com'

export async function PATCH(req: NextRequest, { params }: { params: { sessionId: string } }) {
  const auth = req.headers.get('authorization') ?? ''
  const res = await fetch(`${BACKEND}/api/v1/interview/sessions/${params.sessionId}/complete`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(auth ? { Authorization: auth } : {}),
    },
  })
  const data = await res.text()
  return new NextResponse(data, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
