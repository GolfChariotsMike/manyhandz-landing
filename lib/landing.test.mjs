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

  it('uses an outcome hero with supporting typewriter and no particles / aurora / orbs', () => {
    assert.match(html, /id="typewriter"/);
    assert.match(html, /Missed calls become/);
    assert.match(html, /booked jobs/);
    assert.match(html, /AI that answers the phone and your website/);
    assert.match(html, /\['missed call', 'after-hours lead', 'website enquiry'\]/);
    assert.match(html, /class="typewriter-line"/);
    assert.match(html, /class="typewriter-reduced"/);
    assert.match(html, /prefers-reduced-motion: reduce/);
    assert.doesNotMatch(html, /typewriter disabled/);
    assert.doesNotMatch(html, /particle-canvas|class="aurora"|hero-orb|animateParticles|createParticles/);
    assert.doesNotMatch(html, /Calls and chat\. One setup\./);
  });

  it('leads the hero with Hear it live and shows trade chips plus a dual-channel mock', () => {
    const hero = html.slice(html.indexOf('<!-- HERO -->'), html.indexOf('<!-- HONEST PROOF -->'));
    assert.match(hero, /href="\/try"[^>]*>Hear it live/);
    assert.match(hero, /Get started free/);
    assert.match(html, /class="trade-chip"[^>]*>HVAC/);
    assert.match(html, /class="trade-chip"[^>]*>Plumbing/);
    assert.match(html, /class="trade-chip"[^>]*>Electrical/);
    assert.match(html, /class="demo-stage/);
    assert.match(html, /Incoming call/);
    assert.match(html, /Website chat/);
    assert.match(html, /Knowledge base/);
    assert.doesNotMatch(html, /<span class="feature-icon">/);
  });

  it('keeps honest proof and pricing, and drops fake testimonials and counters', () => {
    assert.match(html, /Dedicated AU number/);
    assert.match(html, /14-day free trial/);
    assert.match(html, /Less than missing one job/);
    assert.match(html, /Phone answering \+ website chat/);
    assert.match(html, /600 minutes of phone talk time/);
    assert.doesNotMatch(html, /Sarah M\./);
    assert.doesNotMatch(html, /James T\./);
    assert.doesNotMatch(html, /Leanne B\./);
    assert.doesNotMatch(html, /data-target=/);
    assert.doesNotMatch(html, /750k|job dispatch|crew scheduling|ServiceM8|SimPRO/i);
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

  it('uses an outcome hero with supporting typewriter and no particles / aurora / orbs', () => {
    assert.match(html, /id="typewriter"/);
    assert.match(html, /Missed calls become/);
    assert.match(html, /booked jobs/);
    assert.match(html, /AI that answers the phone and your website/);
    assert.match(html, /\['missed call', 'after-hours lead', 'website inquiry'\]/);
    assert.match(html, /class="typewriter-line"/);
    assert.match(html, /class="typewriter-reduced"/);
    assert.doesNotMatch(html, /typewriter disabled/);
    assert.doesNotMatch(html, /particle-canvas|class="aurora"|hero-orb|animateParticles|createParticles/);
    assert.doesNotMatch(html, /Calls and chat\. One setup\./);
  });

  it('leads the hero with Hear it live and shows trade chips plus a dual-channel mock', () => {
    const hero = html.slice(html.indexOf('<!-- HERO -->'), html.indexOf('<!-- HONEST PROOF -->'));
    assert.match(hero, /href="\/try"[^>]*>Hear it live/);
    assert.match(hero, /Get started free/);
    assert.match(html, /class="demo-stage/);
    assert.match(html, /Dedicated US number/);
    assert.match(html, /Phone answering \+ website chat/);
    assert.doesNotMatch(html, /<span class="feature-icon">/);
    assert.doesNotMatch(html, /Sarah M\./);
    assert.doesNotMatch(html, /data-target=/);
    assert.doesNotMatch(html, /ServiceM8|SimPRO/i);
  });
});

describe('shared marketing pages', () => {
  it('/try has no particle canvas, aurora, or orbs', () => {
    const html = read('try.html');
    assert.doesNotMatch(html, /particle-canvas|class="aurora"|hero-orb|animateParticles|createParticles/);
  });
});

const WIDGET_EMBED = '<script src="https://app.manyhandz.ai/widget.js" data-key="a7ca502a-74f2-414f-8462-71a70db16e98"></script>';
const GLACIER_WIDGET_KEY = '0f840990';

describe('ManyHandz chat widget (dogfood)', () => {
  for (const name of ['index.html', 'us.html', 'try.html']) {
    it(`embeds the ManyHandz widget once on ${name}`, () => {
      const html = read(name);
      const matches = html.split(WIDGET_EMBED).length - 1;
      assert.equal(matches, 1);
      assert.doesNotMatch(html, new RegExp(GLACIER_WIDGET_KEY));
    });
  }
});
