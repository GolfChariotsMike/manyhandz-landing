/** Homepage geo routing for manyhandz.ai (Vercel Edge Middleware). */

export const GEO_COOKIE = 'geo';
export const GEO_COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours
export const US_HOME = '/us';

const BOT_UA =
  /bot|crawler|spider|slurp|facebookexternalhit|preview|bingpreview|google-inspectiontool|adsbot|mediapartners/i;

export function normalizeGeo(value) {
  if (value == null) return null;
  const v = String(value).trim().toLowerCase();
  return v === 'us' || v === 'au' ? v : null;
}

function headerGet(headers, name) {
  if (!headers) return '';
  if (typeof headers.get === 'function') return headers.get(name) || '';
  return headers[name] || headers[name.toLowerCase()] || '';
}

export function countryFromHeaders(headers) {
  const raw =
    headerGet(headers, 'x-vercel-ip-country') ||
    headerGet(headers, 'cf-ipcountry') ||
    headerGet(headers, 'cloudfront-viewer-country') ||
    '';
  return String(raw).trim().toUpperCase();
}

/**
 * Query `?geo=` always wins (one-shot testing).
 * Cookie `au` may keep a US IP on AU `/`.
 * Cookie `us` must not keep a non-US IP on `/us` — only a current
 * `?geo=us` can send an AU (or other non-US) IP to the US page.
 */
export function resolveRegion({ queryGeo, cookieGeo, ipCountry }) {
  const query = normalizeGeo(queryGeo);
  if (query) return query;

  const ipIsUs = String(ipCountry || '').toUpperCase() === 'US';
  const cookie = normalizeGeo(cookieGeo);

  if (cookie === 'au') return 'au';
  if (cookie === 'us' && ipIsUs) return 'us';

  return ipIsUs ? 'us' : 'au';
}

export function isHomePath(pathname) {
  return pathname === '/' || pathname === '' || pathname === '/index.html';
}

export function isUsPath(pathname) {
  const p = String(pathname || '');
  return p === '/us' || p === '/us.html' || p.startsWith('/us/');
}

export function isSkippedPath(pathname) {
  const p = String(pathname || '').toLowerCase();
  if (!p || isUsPath(p)) return true;
  if (/\.(png|jpe?g|gif|webp|svg|ico|css|js|map|txt|xml|woff2?|ttf|eot)$/i.test(p)) {
    return true;
  }
  const prefixes = ['/login', '/signup', '/try', '/api', '/privacy', '/terms'];
  return prefixes.some((s) => p === s || p.startsWith(`${s}/`) || p.startsWith(`${s}.`));
}

function searchGet(searchParams, key) {
  if (!searchParams) return null;
  if (typeof searchParams.get === 'function') return searchParams.get(key);
  const value = searchParams[key];
  return value == null ? null : String(value);
}

/**
 * Decide whether `/` should 302 to `/us`.
 * Current-request `?geo=` wins. Cookie `au` can keep a US IP on `/`.
 * Cookie `us` is ignored for non-US IPs (stale Ads / locale-nav trap).
 * `/us` and other paths are never bounced.
 */
export function decide({
  pathname,
  searchParams,
  cookieGeo,
  ipCountry,
  userAgent = '',
  method = 'GET',
}) {
  if (method && method !== 'GET' && method !== 'HEAD') {
    return { action: 'next' };
  }

  const queryGeo = normalizeGeo(searchGet(searchParams, 'geo'));
  const cookie = normalizeGeo(cookieGeo);
  const ipIsUs = String(ipCountry || '').toUpperCase() === 'US';
  const region = resolveRegion({ queryGeo, cookieGeo, ipCountry });
  const path = pathname || '/';

  if (!isHomePath(path)) {
    if (queryGeo) {
      return {
        action: 'redirect',
        pathname: path,
        stripGeo: true,
        setCookie: queryGeo,
      };
    }
    return { action: 'next' };
  }

  // Only the current-request query is an explicit override for bots.
  // A stored cookie must not send crawlers (or AU IPs) to /us.
  const hasOverride = Boolean(queryGeo);
  const isBot = Boolean(userAgent) && BOT_UA.test(userAgent);
  const sendHomeToUs = region === 'us' && (!isBot || hasOverride);

  if (sendHomeToUs) {
    return {
      action: 'redirect',
      pathname: US_HOME,
      // Keep ?geo=us so the override survives clients that do not store cookies.
      stripGeo: !queryGeo,
      setCookie: queryGeo,
    };
  }

  // ?geo=au stays on / (AU home). Do not 302-away the param — US IPs
  // following a stripped redirect would otherwise bounce to /us.
  if (queryGeo) {
    return { action: 'next', setCookie: queryGeo };
  }

  // AU (or any non-US) IP + stale geo=us: stay on / and overwrite the cookie
  // so the trap ends. Cookie-only us is ignored; ?geo=us still redirects.
  if (cookie === 'us' && !ipIsUs) {
    return { action: 'next', setCookie: 'au' };
  }

  return { action: 'next' };
}

export function cookieHeader(value) {
  return `${GEO_COOKIE}=${value}; Path=/; Max-Age=${GEO_COOKIE_MAX_AGE}; SameSite=Lax; Secure`;
}
