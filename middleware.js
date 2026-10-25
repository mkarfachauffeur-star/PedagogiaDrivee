import { isRequestPathServed } from './src/lib/publicPaths.js'

export const config = {
  matcher: ['/((?!assets/).*)'],
}

export default async function middleware(request) {
  const { pathname } = new URL(request.url)
  if (isRequestPathServed(pathname)) return

  const indexResponse = await fetch(new URL('/index.html', request.url))
  const body = request.method === 'HEAD' ? null : await indexResponse.arrayBuffer()

  return new Response(body, {
    status: 404,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex',
    },
  })
}
