import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  countryFromHeaders,
  decide,
  normalizeGeo,
  resolveRegion,
} from './geo.mjs';

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

  it('cookie wins over IP', () => {
    assert.equal(
      resolveRegion({ queryGeo: null, cookieGeo: 'us', ipCountry: 'AU' }),
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

  it('honors ?geo=us from an AU IP', () => {
    const d = decision({
      ipCountry: 'AU',
      searchParams: new URLSearchParams('geo=us&utm=1'),
    });
    assert.equal(d.action, 'redirect');
    assert.equal(d.pathname, '/us');
    assert.equal(d.stripGeo, true);
    assert.equal(d.setCookie, 'us');
  });

  it('honors ?geo=au from a US IP without sending them to /us', () => {
    const d = decision({
      ipCountry: 'US',
      searchParams: new URLSearchParams('geo=au'),
    });
    assert.equal(d.action, 'redirect');
    assert.equal(d.pathname, '/');
    assert.equal(d.setCookie, 'au');
  });

  it('cookie us on / redirects; cookie au on / with US IP does not', () => {
    const toUs = decision({ ipCountry: 'AU', cookieGeo: 'us' });
    assert.equal(toUs.action, 'redirect');
    assert.equal(toUs.pathname, '/us');

    const stay = decision({ ipCountry: 'US', cookieGeo: 'au' });
    assert.equal(stay.action, 'next');
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

  it('still honors ?geo=us for crawlers (explicit override)', () => {
    const d = decision({
      ipCountry: 'AU',
      userAgent: 'Googlebot',
      searchParams: new URLSearchParams('geo=us'),
    });
    assert.equal(d.action, 'redirect');
    assert.equal(d.pathname, '/us');
  });

  it('ignores POST', () => {
    assert.equal(decision({ ipCountry: 'US', method: 'POST' }).action, 'next');
  });
});
