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

export function resolveRegion({ queryGeo, cookieGeo, ipCountry }) {
  const override = normalizeGeo(queryGeo) || normalizeGeo(cookieGeo);
  if (override) return override;
  return String(ipCountry || '').toUpperCase() === 'US' ? 'us' : 'au';
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
 * Query/cookie override wins over IP. `/us` and other paths are never bounced.
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

  const hasOverride = Boolean(queryGeo || normalizeGeo(cookieGeo));
  const isBot = Boolean(userAgent) && BOT_UA.test(userAgent);
  const sendHomeToUs = region === 'us' && (!isBot || hasOverride);

  if (sendHomeToUs) {
    return {
      action: 'redirect',
      pathname: US_HOME,
      stripGeo: true,
      setCookie: queryGeo,
    };
  }

  if (queryGeo) {
    return {
      action: 'redirect',
      pathname: path === '/index.html' ? '/' : path,
      stripGeo: true,
      setCookie: queryGeo,
    };
  }

  return { action: 'next' };
}

export function cookieHeader(value) {
  return `${GEO_COOKIE}=${value}; Path=/; Max-Age=${GEO_COOKIE_MAX_AGE}; SameSite=Lax; Secure`;
}
