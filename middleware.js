import {
  GEO_COOKIE,
  cookieHeader,
  countryFromHeaders,
  decide,
} from './lib/geo.mjs';
import { pixelScriptResponse } from './lib/meta-pixel.mjs';

export const config = {
  matcher: ['/', '/index.html', '/js/meta-pixel.js'],
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
  const pixel = pixelScriptResponse(url.pathname, process.env);
  if (pixel) return pixel;

  const decision = decide({
    pathname: url.pathname,
    searchParams: url.searchParams,
    cookieGeo: readCookie(request.headers.get('cookie'), GEO_COOKIE),
    ipCountry: countryFromHeaders(request.headers),
    userAgent: request.headers.get('user-agent') || '',
    method: request.method,
  });

  if (decision.action !== 'redirect') return;

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
