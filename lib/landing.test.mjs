import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
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

const CONSULTING = [
  'AI consultancy',
  'AI consulting',
  'integrate AI into',
  'transform your business',
  'digital transformation',
];

function connectsBlock(html) {
  const start = html.indexOf('id="connects"');
  const end = html.indexOf('id="how-it-works"', start);
  assert.ok(start !== -1 && end !== -1, 'connects section should sit before how-it-works');
  return html.slice(start, end);
}

describe('landing pages — hero, tools, about, SEO', () => {
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

    it(`${file} has a short product About, not consulting copy`, () => {
      const html = read(file);
      assert.match(html, /id="about"/);
      assert.match(html, /one knowledge base/i);
      for (const phrase of CONSULTING) {
        assert.doesNotMatch(html, new RegExp(phrase, 'i'));
      }
      assert.doesNotMatch(html, /founder|headshot/i);
    });

    it(`${file} has SoftwareApplication + FAQPage JSON-LD and no Meta Pixel`, () => {
      const html = read(file);
      assert.match(html, /"@type": "SoftwareApplication"/);
      assert.match(html, /"@type": "FAQPage"/);
      assert.match(html, /rel="canonical"/);
      assert.match(html, /og:image/);
      assert.match(html, /twitter:card/);
      assert.doesNotMatch(html, /fbq\(|facebook\.net|connect\.facebook|Meta Pixel/i);
    });
  }

  it('try.html also has no aurora / orbs / canvas', () => {
    const html = read('try.html');
    assert.doesNotMatch(html, /particle-canvas|class="aurora"|hero-orb|<canvas\b/i);
  });

  it('/ and /us titles are unique and contractor/phone+chat focused', () => {
    const au = read('index.html');
    const us = read('us.html');
    const auTitle = au.match(/<title>([^<]+)<\/title>/)[1];
    const usTitle = us.match(/<title>([^<]+)<\/title>/)[1];
    assert.notEqual(auTitle, usTitle);
    assert.match(auTitle, /phone answering/i);
    assert.match(usTitle, /phone answering/i);
    assert.match(usTitle, /contractor/i);
  });

  it('robots + sitemap allow crawl and point at manyhandz.ai', () => {
    const robots = read('robots.txt');
    const sitemap = read('sitemap.xml');
    assert.match(robots, /Allow: \//);
    assert.match(robots, /Sitemap: https:\/\/manyhandz\.ai\/sitemap\.xml/);
    assert.match(sitemap, /https:\/\/manyhandz\.ai\//);
    assert.match(sitemap, /https:\/\/manyhandz\.ai\/us/);
    assert.match(sitemap, /https:\/\/manyhandz\.ai\/llms\.txt/);
  });

  it('llms.txt files describe the product and SimPRO only', () => {
    assert.ok(existsSync(join(root, 'llms.txt')));
    assert.ok(existsSync(join(root, 'llms-full.txt')));
    const short = read('llms.txt');
    const full = read('llms-full.txt');
    assert.match(short, /SimPRO/);
    assert.match(short, /not a consultancy/i);
    assert.match(short, /SimPRO only/);
    assert.match(full, /Open Leads/);
    assert.match(full, /\/us/);
  });
});
