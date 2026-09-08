import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  countryFromHeaders,
  decide,
  normalizeGeo,
  resolveRegion,
} from './geo.mjs';
import middleware from '../middleware.js';

function decision(overrides = {}) {
  return decide({
    pathname: '/',
    searchParams: new URLSearchParams(),
    cookieGeo: null,
    ipCountry: 'AU',
    userAgent: 'Mozilla/5.0',
    method: 'GET',
    ...overrides,
  });
}

describe('normalizeGeo', () => {
  it('accepts us/au in any case', () => {
    assert.equal(normalizeGeo('US'), 'us');
    assert.equal(normalizeGeo(' au '), 'au');
  });

  it('rejects unknown values', () => {
    assert.equal(normalizeGeo('gb'), null);
    assert.equal(normalizeGeo(''), null);
    assert.equal(normalizeGeo(null), null);
  });
});

describe('countryFromHeaders', () => {
  it('prefers x-vercel-ip-country', () => {
    assert.equal(
      countryFromHeaders({
        'x-vercel-ip-country': 'US',
        'cf-ipcountry': 'AU',
      }),
      'US'
    );
  });

  it('falls back to other host headers', () => {
    assert.equal(countryFromHeaders({ 'cf-ipcountry': 'gb' }), 'GB');
  });
});

describe('resolveRegion', () => {
  it('query wins over cookie and IP', () => {
    assert.equal(
      resolveRegion({ queryGeo: 'au', cookieGeo: 'us', ipCountry: 'US' }),
      'au'
    );
  });

  it('cookie au keeps a US IP on AU; cookie us cannot override a non-US IP', () => {
    assert.equal(
      resolveRegion({ queryGeo: null, cookieGeo: 'au', ipCountry: 'US' }),
      'au'
    );
    assert.equal(
      resolveRegion({ queryGeo: null, cookieGeo: 'us', ipCountry: 'AU' }),
      'au'
    );
    assert.equal(
      resolveRegion({ queryGeo: null, cookieGeo: 'us', ipCountry: 'GB' }),
      'au'
    );
    assert.equal(
      resolveRegion({ queryGeo: null, cookieGeo: 'us', ipCountry: 'US' }),
      'us'
    );
  });

  it('query geo=us still overrides an AU IP', () => {
    assert.equal(
      resolveRegion({ queryGeo: 'us', cookieGeo: null, ipCountry: 'AU' }),
      'us'
    );
  });

  it('only US IP maps to us; everyone else is au', () => {
    assert.equal(resolveRegion({ ipCountry: 'US' }), 'us');
    assert.equal(resolveRegion({ ipCountry: 'AU' }), 'au');
    assert.equal(resolveRegion({ ipCountry: 'GB' }), 'au');
    assert.equal(resolveRegion({ ipCountry: '' }), 'au');
  });
});

describe('decide — homepage geo', () => {
  it('sends US country on / to /us', () => {
    const d = decision({ ipCountry: 'US' });
    assert.equal(d.action, 'redirect');
    assert.equal(d.pathname, '/us');
    assert.equal(d.setCookie, null);
  });

  it('leaves AU and other countries on /', () => {
    assert.equal(decision({ ipCountry: 'AU' }).action, 'next');
    assert.equal(decision({ ipCountry: 'GB' }).action, 'next');
    assert.equal(decision({ ipCountry: 'NZ' }).action, 'next');
  });

  it('never bounces /us to AU', () => {
    assert.equal(decision({ pathname: '/us', ipCountry: 'AU' }).action, 'next');
    assert.equal(decision({ pathname: '/us', ipCountry: 'US' }).action, 'next');
    const override = decision({
      pathname: '/us',
      ipCountry: 'US',
      searchParams: new URLSearchParams('geo=au'),
    });
    assert.equal(override.action, 'redirect');
    assert.equal(override.pathname, '/us');
    assert.equal(override.setCookie, 'au');
  });

  it('never bounces / with AU IP to /us', () => {
    assert.equal(decision({ ipCountry: 'AU' }).action, 'next');
  });

  it('honors ?geo=us from an AU IP and keeps the override on the URL', () => {
    const d = decision({
      ipCountry: 'AU',
      searchParams: new URLSearchParams('geo=us&utm=1'),
    });
    assert.equal(d.action, 'redirect');
    assert.equal(d.pathname, '/us');
    assert.equal(d.stripGeo, false);
    assert.equal(d.setCookie, 'us');
  });

  it('honors ?geo=au from a US IP without sending them to /us', () => {
    const d = decision({
      ipCountry: 'US',
      searchParams: new URLSearchParams('geo=au'),
    });
    assert.equal(d.action, 'next');
    assert.equal(d.setCookie, 'au');
  });

  it('AU IP + cookie us stays on / and overwrites the cookie to au', () => {
    const d = decision({ ipCountry: 'AU', cookieGeo: 'us' });
    assert.equal(d.action, 'next');
    assert.equal(d.setCookie, 'au');
  });

  it('GB (non-US) IP + cookie us stays on / and overwrites the cookie to au', () => {
    const d = decision({ ipCountry: 'GB', cookieGeo: 'us' });
    assert.equal(d.action, 'next');
    assert.equal(d.setCookie, 'au');
  });

  it('US IP + cookie au stays on /', () => {
    const stay = decision({ ipCountry: 'US', cookieGeo: 'au' });
    assert.equal(stay.action, 'next');
  });

  it('AU IP + query geo=us still redirects to /us', () => {
    const d = decision({
      ipCountry: 'AU',
      cookieGeo: 'au',
      searchParams: new URLSearchParams('geo=us'),
    });
    assert.equal(d.action, 'redirect');
    assert.equal(d.pathname, '/us');
    assert.equal(d.setCookie, 'us');
  });

  it('does not geo-redirect app, try, or asset paths', () => {
    for (const pathname of ['/login', '/signup', '/try', '/og-image.png', '/privacy']) {
      assert.equal(decision({ pathname, ipCountry: 'US' }).action, 'next', pathname);
    }
  });

  it('skips IP geo for crawlers so / stays indexable', () => {
    const d = decision({
      ipCountry: 'US',
      userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1)',
    });
    assert.equal(d.action, 'next');
  });

  it('does not let a stored geo=us cookie send crawlers to /us', () => {
    const d = decision({
      ipCountry: 'US',
      cookieGeo: 'us',
      userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1)',
    });
    assert.equal(d.action, 'next');
  });

  it('still honors ?geo=us for crawlers (explicit override)', () => {
    const d = decision({
      ipCountry: 'AU',
      userAgent: 'Googlebot',
      searchParams: new URLSearchParams('geo=us'),
    });
    assert.equal(d.action, 'redirect');
    assert.equal(d.pathname, '/us');
    assert.equal(d.stripGeo, false);
  });

  it('keeps AdsBot and Google Ads crawlers on AU /', () => {
    for (const userAgent of [
      'AdsBot-Google (+http://www.google.com/adsbot.html)',
      'AdsBot-Google-Mobile',
      'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/W.X.Y.Z Mobile Safari/537.36 (compatible; Google-InspectionTool/1.0;)',
    ]) {
      const d = decision({ ipCountry: 'US', userAgent });
      assert.equal(d.action, 'next', userAgent);
    }
  });

  it('ignores POST', () => {
    assert.equal(decision({ ipCountry: 'US', method: 'POST' }).action, 'next');
  });
});

function homeRequest({ cookie, country, search = '', ua = 'Mozilla/5.0' }) {
  const headers = {
    'x-vercel-ip-country': country,
    'user-agent': ua,
  };
  if (cookie) headers.cookie = `geo=${cookie}`;
  return new Request(`https://manyhandz.ai/${search}`, { headers });
}

describe('middleware — cookie trap', () => {
  it('AU IP + cookie us continues to / and overwrites cookie to au', () => {
    const res = middleware(homeRequest({ cookie: 'us', country: 'AU' }));
    assert.ok(res);
    assert.notEqual(res.status, 302);
    assert.equal(res.headers.get('x-middleware-next'), '1');
    assert.match(res.headers.get('set-cookie'), /geo=au/);
  });

  it('AU IP + query geo=us still 302s to /us', () => {
    const res = middleware(homeRequest({ country: 'AU', search: '?geo=us' }));
    assert.equal(res.status, 302);
    assert.match(res.headers.get('location'), /\/us/);
    assert.match(res.headers.get('set-cookie'), /geo=us/);
  });

  it('US IP + cookie au stays on /', () => {
    const res = middleware(homeRequest({ cookie: 'au', country: 'US' }));
    assert.equal(res, undefined);
  });

  it('US IP bare 302s to /us', () => {
    const res = middleware(homeRequest({ country: 'US' }));
    assert.equal(res.status, 302);
    assert.match(res.headers.get('location'), /\/us/);
  });
});
