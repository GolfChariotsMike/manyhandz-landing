import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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
];

function connectsBlock(html) {
  const start = html.indexOf('id="connects"');
  const end = html.indexOf('id="how-it-works"', start);
  assert.ok(start !== -1 && end !== -1, 'connects section should sit before how-it-works');
  return html.slice(start, end);
}

describe('landing pages — typewriter, SimPRO, no particles', () => {
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

    it(`${file} tools section is SimPRO-only`, () => {
      const block = connectsBlock(read(file));
      assert.match(block, /simPRO|SimPRO/);
      assert.match(block, /Open Leads/);
      for (const name of FAKE_LOGOS) {
        assert.doesNotMatch(block, new RegExp(name, 'i'), `${file} connects must not mention ${name}`);
      }
      assert.doesNotMatch(block, /\bGmail\b/);
      assert.doesNotMatch(block, /\bStripe\b/);
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
});
