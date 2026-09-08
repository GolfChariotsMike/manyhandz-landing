import {
  GEO_COOKIE,
  cookieHeader,
  countryFromHeaders,
  decide,
} from './lib/geo.mjs';

export const config = {
  matcher: ['/', '/index.html'],
};

function readCookie(header, name) {
  if (!header) return null;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    if (key === name) {
      try {
        return decodeURIComponent(part.slice(idx + 1).trim());
      } catch {
        return part.slice(idx + 1).trim();
      }
    }
  }
  return null;
}

export default function middleware(request) {
  const url = new URL(request.url);
  const decision = decide({
    pathname: url.pathname,
    searchParams: url.searchParams,
    cookieGeo: readCookie(request.headers.get('cookie'), GEO_COOKIE),
    ipCountry: countryFromHeaders(request.headers),
    userAgent: request.headers.get('user-agent') || '',
    method: request.method,
  });

  if (decision.action !== 'redirect') {
    if (!decision.setCookie) return;
    // Continue to the origin (AU `/`) and overwrite a stale geo=us cookie.
    // `x-middleware-next` is the Vercel / @vercel/edge continue signal.
    return new Response(null, {
      headers: {
        'x-middleware-next': '1',
        'Set-Cookie': cookieHeader(decision.setCookie),
      },
    });
  }

  const dest = new URL(url.href);
  dest.pathname = decision.pathname;
  if (decision.stripGeo) dest.searchParams.delete('geo');

  const headers = new Headers({
    Location: dest.toString(),
    'Cache-Control': 'private, no-store',
  });
  if (decision.setCookie) {
    headers.append('Set-Cookie', cookieHeader(decision.setCookie));
  }
  return new Response(null, { status: 302, headers });
}
