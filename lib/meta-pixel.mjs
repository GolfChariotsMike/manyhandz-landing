/** Meta Pixel bootstrap for manyhandz.ai (served by Vercel Edge Middleware). */

export const PIXEL_PATH = '/js/meta-pixel.js';
export const PIXEL_ENV = 'NEXT_PUBLIC_META_PIXEL_ID';

/**
 * Accept a real Meta Pixel ID only. Empty, whitespace, or placeholders
 * are treated as unset so the landing page injects nothing.
 */
export function readPixelId(value) {
  if (value == null) return '';
  const id = String(value).trim();
  if (!id) return '';
  // Meta Pixel IDs are numeric. Reject "YOUR_PIXEL_ID" / "undefined" / URLs.
  if (!/^\d{5,20}$/.test(id)) return '';
  return id;
}

export function isPixelPath(pathname) {
  return pathname === PIXEL_PATH;
}

export function isSignupUrl(href, base = 'https://manyhandz.ai/') {
  if (!href) return false;
  try {
    const u = new URL(String(href), base);
    const host = u.hostname.replace(/^www\./, '');
    const signupPath = u.pathname === '/signup' || u.pathname.startsWith('/signup/');
    if (!signupPath) return false;
    return host === 'app.manyhandz.ai' || host === 'manyhandz.ai';
  } catch {
    return /(?:app\.)?manyhandz\.ai\/signup/i.test(String(href));
  }
}

export function isTelUrl(href) {
  return /^tel:/i.test(String(href || '').trim());
}

/** Map a clicked href to a standard Meta event, or null. */
export function eventForClick(href, base) {
  if (isSignupUrl(href, base)) return 'StartTrial';
  if (isTelUrl(href)) return 'Contact';
  return null;
}

/**
 * Browser script. Loads fbevents.js only when pixelId is valid.
 * Returns '' when unset so the response body injects nothing.
 */
export function buildClientScript(pixelId) {
  const id = readPixelId(pixelId);
  if (!id) return '';

  return `(function(){
  var PIXEL_ID = ${JSON.stringify(id)};
  if (!PIXEL_ID || window.__mhPixelLoaded) return;
  window.__mhPixelLoaded = true;

  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
  n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');

  fbq('init', PIXEL_ID);
  fbq('track', 'PageView');

  function track(name, params) {
    if (typeof fbq === 'function') fbq('track', name, params || {});
  }

  window.mhPixel = {
    track: track,
    lead: function () { track('Lead', { content_name: 'specialist_callback' }); }
  };

  function hrefOf(el) {
    if (!el) return '';
    return (el.getAttribute && el.getAttribute('href')) || el.href || '';
  }

  function isSignup(href) {
    if (!href) return false;
    try {
      var u = new URL(href, window.location.href);
      var host = u.hostname.replace(/^www\\./, '');
      var path = u.pathname === '/signup' || u.pathname.indexOf('/signup/') === 0;
      return path && (host === 'app.manyhandz.ai' || host === 'manyhandz.ai');
    } catch (err) {
      return /(?:app\\.)?manyhandz\\.ai\\/signup/i.test(href);
    }
  }

  function isTel(href) {
    return /^tel:/i.test(String(href || '').trim());
  }

  document.addEventListener('click', function (event) {
    var node = event.target;
    var a = node && node.closest ? node.closest('a[href]') : null;
    if (!a) return;
    var href = hrefOf(a);
    if (isSignup(href)) track('StartTrial', { content_name: 'signup_cta' });
    else if (isTel(href)) track('Contact', { content_name: 'click_to_call' });
  }, true);

  function watchPricing() {
    var pricing = document.getElementById('pricing');
    if (!pricing || !('IntersectionObserver' in window)) return;
    var fired = false;
    var io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (fired || !entries[i].isIntersecting) continue;
        fired = true;
        track('ViewContent', { content_name: 'pricing', content_type: 'product' });
        io.disconnect();
      }
    }, { threshold: 0.2 });
    io.observe(pricing);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watchPricing);
  } else {
    watchPricing();
  }
})();
`;
}

export function pixelHeaders(hasPixel) {
  return {
    'Content-Type': 'application/javascript; charset=utf-8',
    'Cache-Control': hasPixel ? 'public, max-age=300' : 'private, no-store',
  };
}

/**
 * If this request is the pixel script path, return a Response.
 * Unset / invalid ID → empty body (no fbq, no Facebook script).
 */
export function pixelScriptResponse(pathname, env = {}) {
  if (!isPixelPath(pathname)) return null;
  const id = readPixelId(env[PIXEL_ENV] ?? env.NEXT_PUBLIC_META_PIXEL_ID);
  const body = buildClientScript(id);
  return new Response(body, {
    status: 200,
    headers: pixelHeaders(Boolean(id)),
  });
}
