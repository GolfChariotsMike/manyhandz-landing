import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (name) => readFileSync(join(root, name), 'utf8');

const ADS_TAG = 'AW-18432126614';
const SIGNUP = 'https://app.manyhandz.ai/signup';

describe('AU homepage (/) — Ads-safe default', () => {
  const html = read('index.html');

  it('is framed for Australian small businesses / Perth, not the US', () => {
    assert.match(html, /lang="en-AU"/);
    assert.match(html, /og:locale" content="en_AU"/);
    assert.match(html, /for Australian small businesses/);
    assert.match(html, /Perth/);
    assert.match(html, /Dedicated Australian number/);
    assert.match(html, /Australian owned/i);
    assert.match(html, /tradies/);
    assert.match(html, /HVAC, plumbing, electrical/);
    assert.doesNotMatch(html, /for US businesses/);
    assert.doesNotMatch(html, /Dedicated US number/);
    assert.doesNotMatch(html, /Built for US contractors/);
    assert.doesNotMatch(html, /country=US/);
  });

  it('prices Small / Big Business in AUD and keeps Enterprise custom', () => {
    assert.match(html, /\$199<span>\/mo AUD<\/span>/);
    assert.match(html, /\$499<span>\/mo AUD<\/span>/);
    assert.match(html, />Custom</);
    assert.match(html, /"priceCurrency": "AUD"/);
  });

  it('uses free-trial signup + /try CTAs with no US country flag', () => {
    assert.match(html, new RegExp(`${SIGNUP.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`));
    assert.match(html, /href="\/try"/);
    assert.doesNotMatch(html, /signup\?country=US/);
  });

  it('keeps Google Ads tag and does not ship DraftPilot or Meta Pixel', () => {
    assert.match(html, new RegExp(ADS_TAG));
    assert.doesNotMatch(html, /DraftPilot/i);
    assert.doesNotMatch(html, /fbq\(|facebook\.net|connect\.facebook|Meta Pixel/i);
  });

  it('declares AU as the indexable default via canonical + hreflang', () => {
    assert.match(html, /rel="canonical" href="https:\/\/manyhandz\.ai\/"/);
    assert.match(html, /hreflang="en-AU" href="https:\/\/manyhandz\.ai\/"/);
    assert.match(html, /hreflang="en-US" href="https:\/\/manyhandz\.ai\/us"/);
    assert.match(html, /hreflang="x-default" href="https:\/\/manyhandz\.ai\/"/);
    assert.match(html, /Perth, Australia/);
  });

  it('has no public country toggle in nav or footer', () => {
    assert.doesNotMatch(html, /class="nav-locale"/);
    assert.doesNotMatch(html, /href="\/\?geo=us"/);
    assert.doesNotMatch(html, />United States</);
  });
});

describe('US marketing page (/us)', () => {
  const html = read('us.html');

  it('stays US-framed with USD signup and US number copy', () => {
    assert.match(html, /lang="en-US"/);
    assert.match(html, /for US businesses/);
    assert.match(html, /Dedicated US number/);
    assert.match(html, /signup\?country=US/);
    assert.match(html, /\$199<span>\/mo USD<\/span>/);
    assert.doesNotMatch(html, /Perth/);
    assert.doesNotMatch(html, /\/mo AUD/);
  });

  it('prices Small / Big Business in USD and keeps Enterprise custom', () => {
    assert.match(html, /\$199<span>\/mo USD<\/span>/);
    assert.match(html, /\$499<span>\/mo USD<\/span>/);
    assert.match(html, />Custom</);
    assert.match(html, /"name": "Big Business"/);
    assert.match(html, /"price": "499"/);
    assert.match(html, /"priceCurrency": "USD"/);
  });

  it('keeps Google Ads tag, no DraftPilot, and no public country toggle', () => {
    assert.match(html, new RegExp(ADS_TAG));
    assert.doesNotMatch(html, /DraftPilot/i);
    assert.doesNotMatch(html, /class="nav-locale"/);
    assert.doesNotMatch(html, /href="\/\?geo=au"/);
    assert.doesNotMatch(html, />Australia</);
    assert.match(html, /rel="canonical" href="https:\/\/manyhandz\.ai\/us"/);
  });
});
