// Fixed upstream: never accept a target URL from a browser request.
export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname === '/api/v1' || url.pathname.startsWith('/api/v1/')) {
      url.protocol = 'https:'
      url.hostname = 'api.coulson-finance.com'
      url.port = ''
      const upstream = new Request(url, request)
      upstream.headers.delete('host')
      try {
        const response = await fetch(upstream, { redirect: 'manual' })
        const headers = new Headers(response.headers)
        headers.set('Cache-Control', 'no-store')
        const cookie = headers.get('set-cookie')
        if (cookie && !/;\s*secure(?:;|$)/i.test(cookie)) headers.set('set-cookie', cookie + '; Secure')
        return new Response(response.body, { status: response.status, headers })
      } catch {
        return Response.json({ detail: 'BACKEND_UNAVAILABLE' }, { status: 502, headers: { 'Cache-Control': 'no-store' } })
      }
    }
    if (url.pathname.startsWith('/api/')) return Response.json({ detail: 'NOT_FOUND' }, { status: 404 })
    return env.ASSETS.fetch(request)
  }
}
