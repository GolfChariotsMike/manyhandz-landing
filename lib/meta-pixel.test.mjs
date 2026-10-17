import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  PIXEL_ENV,
  PIXEL_PATH,
  buildClientScript,
  eventForClick,
  isPixelPath,
  isSignupUrl,
  isTelUrl,
  pixelScriptResponse,
  readPixelId,
} from './meta-pixel.mjs';

describe('readPixelId', () => {
  it('treats missing, blank, and placeholders as unset', () => {
    assert.equal(readPixelId(undefined), '');
    assert.equal(readPixelId(null), '');
    assert.equal(readPixelId(''), '');
    assert.equal(readPixelId('   '), '');
    assert.equal(readPixelId('YOUR_PIXEL_ID'), '');
    assert.equal(readPixelId('undefined'), '');
    assert.equal(readPixelId('fbq'), '');
  });

  it('accepts a numeric Meta Pixel ID', () => {
    assert.equal(readPixelId('123456789012345'), '123456789012345');
    assert.equal(readPixelId(' 9988776655443322 '), '9988776655443322');
  });
});

describe('click mapping', () => {
  it('maps app and site signup URLs to StartTrial', () => {
    assert.equal(eventForClick('https://app.manyhandz.ai/signup'), 'StartTrial');
    assert.equal(eventForClick('https://app.manyhandz.ai/signup?country=US'), 'StartTrial');
    assert.equal(eventForClick('https://manyhandz.ai/signup'), 'StartTrial');
    assert.equal(eventForClick('/signup', 'https://manyhandz.ai/'), 'StartTrial');
  });

  it('maps click-to-call to Contact', () => {
    assert.equal(eventForClick('tel:+18005551212'), 'Contact');
    assert.equal(isTelUrl('TEL:+6180000'), true);
  });

  it('ignores non-conversion links', () => {
    assert.equal(eventForClick('/try'), null);
    assert.equal(eventForClick('https://app.manyhandz.ai/login'), null);
    assert.equal(eventForClick('mailto:info@manyhandz.ai'), null);
    assert.equal(eventForClick('#pricing'), null);
    assert.equal(isSignupUrl('https://app.manyhandz.ai/login'), false);
  });
});

describe('buildClientScript', () => {
  it('injects nothing when the ID is unset', () => {
    assert.equal(buildClientScript(''), '');
    assert.equal(buildClientScript(undefined), '');
    assert.equal(buildClientScript('YOUR_PIXEL_ID'), '');
  });

  it('emits official events and no invented fallback ID', () => {
    const js = buildClientScript('123456789012345');
    assert.match(js, /fbq\('init', PIXEL_ID\)/);
    assert.match(js, /fbq\('track', 'PageView'\)/);
    assert.match(js, /StartTrial/);
    assert.match(js, /Lead/);
    assert.match(js, /Contact/);
    assert.match(js, /ViewContent/);
    assert.match(js, /specialist_callback/);
    assert.match(js, /connect\.facebook\.net\/en_US\/fbevents\.js/);
    assert.match(js, /123456789012345/);
    assert.doesNotMatch(js, /YOUR_PIXEL_ID/);
    assert.equal((js.match(/123456789012345/g) || []).length, 1);
  });
});

describe('pixelScriptResponse', () => {
  it('ignores other paths', () => {
    assert.equal(pixelScriptResponse('/', { [PIXEL_ENV]: '123456789012345' }), null);
  });

  it('serves empty JS when env is unset', async () => {
    assert.equal(isPixelPath(PIXEL_PATH), true);
    const res = pixelScriptResponse(PIXEL_PATH, {});
    assert.equal(res.status, 200);
    assert.equal(await res.text(), '');
    assert.match(res.headers.get('content-type'), /javascript/);
    assert.match(res.headers.get('cache-control'), /no-store/);
  });

  it('serves the bootstrap only when env is a real ID', async () => {
    const res = pixelScriptResponse(PIXEL_PATH, { [PIXEL_ENV]: '123456789012345' });
    const body = await res.text();
    assert.equal(res.status, 200);
    assert.match(body, /123456789012345/);
    assert.match(body, /PageView/);
  });
});
