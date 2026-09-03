import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { describe, it } from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (name) => readFileSync(join(root, name), 'utf8');

const FAKE_LOGOS = [
  'Jobber',
  'Housecall',
  'ServiceTitan',
  'HubSpot',
  'Tradify',
  'ServiceM8',
  'Twilio',
  'ElevenLabs',
  'Xero',
  'Google Calendar',
  'Outlook',
  'simPRO',
  'SimPRO',
  'Gmail',
];

function connectsBlock(html) {
  const start = html.indexOf('id="connects"');
  const end = html.indexOf('id="how-it-works"', start);
  assert.ok(start !== -1 && end !== -1, 'connects section should sit before how-it-works');
  return html.slice(start, end);
}

describe('landing pages — typewriter, connections, no particles, favicon', () => {
  for (const file of ['index.html', 'us.html']) {
    it(`${file} has a clean navy hero (no particles / aurora / orbs)`, () => {
      const html = read(file);
      assert.doesNotMatch(html, /particle-canvas|tsparticles|class="aurora"|hero-orb/);
      assert.doesNotMatch(html, /<canvas\b/i);
    });

    it(`${file} typewriter is accessible and reduced-motion safe`, () => {
      const html = read(file);
      assert.match(html, /id="typewriter"/);
      assert.match(html, /Your AI team that handles calls, web chats, bookings, quotes, and customer service/);
      assert.match(html, /prefers-reduced-motion/);
      assert.match(html, /aria-hidden="true"/);
      assert.match(html, /typewriter-reduced/);
      assert.match(html, /'calls', 'web chats', 'bookings', 'quotes', 'customer service'/);
    });

    it(`${file} connections section is honest integrations copy, no logo parade`, () => {
      const html = read(file);
      const block = connectsBlock(html);
      assert.match(block, /Connects with the software you use/);
      assert.match(block, /can be integrated with tools you already run/i);
      assert.match(block, /job software, CRM, calendar/);
      assert.match(block, /no extra cost/i);
      assert.match(block, /Not a marketplace of logos/);
      assert.match(block, /not a wall of native apps we don't ship/i);
      assert.doesNotMatch(block, /custom-integrated/i);
      assert.doesNotMatch(block, /simpro-card|simpro-mono|simpro-name/);
      for (const name of FAKE_LOGOS) {
        assert.doesNotMatch(block, new RegExp(name, 'i'), `${file} connects must not mention ${name}`);
      }
    });

    it(`${file} has no About section and no Meta Pixel`, () => {
      const html = read(file);
      assert.doesNotMatch(html, /id="about"/);
      assert.doesNotMatch(html, /AI consultancy|integrate AI into|transform your business/i);
      assert.doesNotMatch(html, /fbq\(|facebook\.net|connect\.facebook|Meta Pixel/i);
    });
  }

  it('try.html also has no aurora / orbs / canvas', () => {
    const html = read('try.html');
    assert.doesNotMatch(html, /particle-canvas|class="aurora"|hero-orb|<canvas\b/i);
  });

  it('favicon files exist and every landing page links them', () => {
    for (const name of ['favicon.svg', 'favicon.ico', 'favicon-32.png', 'apple-touch-icon.png']) {
      const path = join(root, name);
      assert.ok(existsSync(path), `${name} must exist`);
      assert.ok(statSync(path).size > 100, `${name} must not be empty`);
    }
    for (const file of ['index.html', 'us.html', 'try.html', 'privacy.html', 'terms.html']) {
      const html = read(file);
      assert.match(html, /rel="icon"[^>]+favicon\.svg/);
      assert.match(html, /favicon\.ico/);
      assert.match(html, /apple-touch-icon\.png/);
    }
  });
});
