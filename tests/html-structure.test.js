const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const htmlPath = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf-8');
const dom = new JSDOM(html);
const doc = dom.window.document;

describe('HTML structure', () => {
  it('has correct doctype and lang attribute', () => {
    assert.match(html, /<!DOCTYPE html>/i);
    assert.equal(doc.documentElement.lang, 'en');
  });

  it('has required meta tags', () => {
    const charset = doc.querySelector('meta[charset]');
    assert.ok(charset, 'charset meta tag missing');
    assert.equal(charset.getAttribute('charset'), 'UTF-8');

    const viewport = doc.querySelector('meta[name="viewport"]');
    assert.ok(viewport, 'viewport meta tag missing');
    assert.match(viewport.getAttribute('content'), /width=device-width/);

    const description = doc.querySelector('meta[name="description"]');
    assert.ok(description, 'description meta tag missing');
  });

  it('has correct title', () => {
    assert.equal(doc.title, 'Ajax Fan Experience');
  });

  it('loads Google Fonts with preconnect', () => {
    const preconnects = doc.querySelectorAll('link[rel="preconnect"]');
    assert.ok(preconnects.length >= 2, 'should have at least 2 preconnect links');

    const fontLink = doc.querySelector('link[href*="fonts.googleapis.com/css2"]');
    assert.ok(fontLink, 'Google Fonts CSS link missing');
    assert.match(fontLink.getAttribute('href'), /Oswald/);
    assert.match(fontLink.getAttribute('href'), /Barlow\+Condensed/);
  });

  it('links the stylesheet', () => {
    const cssLink = doc.querySelector('link[rel="stylesheet"][href="styles.css"]');
    assert.ok(cssLink, 'styles.css link missing');
  });
});

describe('Loader section', () => {
  it('has loader with canvas and text', () => {
    const loader = doc.getElementById('loader');
    assert.ok(loader, '#loader missing');
    assert.ok(loader.classList.contains('loader'));

    const canvas = doc.getElementById('loaderCanvas');
    assert.ok(canvas, '#loaderCanvas missing');
    assert.equal(canvas.tagName, 'CANVAS');

    const text = loader.querySelector('.loader-text');
    assert.ok(text, '.loader-text missing');
    assert.equal(text.textContent, 'ENTERING THE ARENA');
  });
});

describe('Hero section', () => {
  const hero = doc.getElementById('hero');

  it('exists with correct classes', () => {
    assert.ok(hero, '#hero missing');
    assert.ok(hero.classList.contains('section'));
    assert.ok(hero.classList.contains('hero'));
  });

  it('has canvas for Three.js particles', () => {
    const canvas = doc.getElementById('heroCanvas');
    assert.ok(canvas, '#heroCanvas missing');
    assert.equal(canvas.tagName, 'CANVAS');
  });

  it('has title with two lines', () => {
    const lines = hero.querySelectorAll('.hero-line');
    assert.equal(lines.length, 2, 'should have 2 hero-line spans');
    assert.equal(lines[0].textContent, 'AJAX IS');
    assert.equal(lines[1].textContent, 'MY RELIGION');
    assert.ok(lines[1].classList.contains('accent'), 'second line should have accent class');
  });

  it('has subtitle', () => {
    const subtitle = hero.querySelector('.hero-subtitle');
    assert.ok(subtitle);
    assert.match(subtitle.textContent, /Johan Cruijff ArenA/);
  });

  it('has scroll indicator', () => {
    const indicator = hero.querySelector('.scroll-indicator');
    assert.ok(indicator, 'scroll indicator missing');
    const chevron = indicator.querySelector('.chevron');
    assert.ok(chevron, 'chevron SVG missing');
  });
});

describe('Formation section', () => {
  const formation = doc.getElementById('formation');

  it('exists with correct structure', () => {
    assert.ok(formation, '#formation missing');
    assert.ok(formation.classList.contains('formation'));
  });

  it('has section header with title', () => {
    const title = formation.querySelector('.section-title');
    assert.ok(title);
    assert.equal(title.textContent, 'THE STARTING XI');
  });

  it('has SVG pitch with correct viewBox', () => {
    const svg = doc.getElementById('pitchSvg');
    assert.ok(svg, '#pitchSvg missing');
    assert.equal(svg.getAttribute('viewBox'), '0 0 680 1000');
  });

  it('has pitch markings (lines, circles, rects)', () => {
    const svg = doc.getElementById('pitchSvg');
    const rects = svg.querySelectorAll('rect');
    assert.ok(rects.length >= 4, 'should have at least 4 rects (field, penalty areas, goal areas)');

    const circles = svg.querySelectorAll('circle');
    assert.ok(circles.length >= 2, 'should have center circle and spots');

    const line = svg.querySelector('line');
    assert.ok(line, 'halfway line missing');
  });

  it('has empty groups for JS-injected content', () => {
    assert.ok(doc.getElementById('formationLines'), '#formationLines group missing');
    assert.ok(doc.getElementById('playerDots'), '#playerDots group missing');
  });
});

describe('Player Cards section', () => {
  const cards = doc.getElementById('cards');

  it('exists with correct structure', () => {
    assert.ok(cards, '#cards missing');
    assert.ok(cards.classList.contains('cards'));
  });

  it('has section header', () => {
    const title = cards.querySelector('.section-title');
    assert.equal(title.textContent, 'PLAYER CARDS');
  });

  it('has scrollable track container', () => {
    const wrapper = cards.querySelector('.cards-track-wrapper');
    assert.ok(wrapper, '.cards-track-wrapper missing');
    const track = doc.getElementById('cardsTrack');
    assert.ok(track, '#cardsTrack missing');
  });

  it('has Dream XI counter', () => {
    const counter = doc.getElementById('dreamXiCount');
    assert.ok(counter, '#dreamXiCount missing');
    assert.equal(counter.textContent, '0');
  });
});

describe('Countdown section', () => {
  const countdown = doc.getElementById('countdown');

  it('exists with correct structure', () => {
    assert.ok(countdown, '#countdown missing');
    assert.ok(countdown.classList.contains('countdown'));
  });

  it('has heartbeat background', () => {
    assert.ok(countdown.querySelector('.countdown-bg'), '.countdown-bg missing');
  });

  it('has match info with teams', () => {
    const home = countdown.querySelector('.match-team.home');
    assert.ok(home, 'home team missing');
    assert.match(home.textContent, /AFC AJAX/);

    const away = countdown.querySelector('.match-team.away');
    assert.ok(away, 'away team missing');
  });

  it('has countdown timer units', () => {
    assert.ok(doc.getElementById('cdDays'), '#cdDays missing');
    assert.ok(doc.getElementById('cdHours'), '#cdHours missing');
    assert.ok(doc.getElementById('cdMins'), '#cdMins missing');
    assert.ok(doc.getElementById('cdSecs'), '#cdSecs missing');

    const units = countdown.querySelectorAll('.countdown-unit');
    assert.equal(units.length, 4, 'should have 4 countdown units');

    const seps = countdown.querySelectorAll('.countdown-sep');
    assert.equal(seps.length, 3, 'should have 3 separators');
  });

  it('has venue text', () => {
    const venue = countdown.querySelector('.match-venue');
    assert.ok(venue);
    assert.match(venue.textContent, /Johan Cruijff ArenA/);
  });
});

describe('Footer section', () => {
  const footer = doc.getElementById('footer');

  it('exists with correct structure', () => {
    assert.ok(footer, '#footer missing');
    assert.ok(footer.classList.contains('footer'));
  });

  it('has three Amsterdam crosses', () => {
    const crosses = footer.querySelectorAll('.xxx-cross');
    assert.equal(crosses.length, 3, 'should have 3 XXX crosses');
  });

  it('has personal message from Oom Baretta', () => {
    const msg = footer.querySelector('.footer-message');
    assert.ok(msg);
    assert.match(msg.textContent, /Oom Baretta/);
  });

  it('has Easter egg hint', () => {
    const hint = footer.querySelector('.footer-hint');
    assert.ok(hint);
    assert.match(hint.textContent, /code/i);
  });

  it('has Amsterdam text', () => {
    const amsterdam = footer.querySelector('.footer-amsterdam');
    assert.ok(amsterdam);
    assert.equal(amsterdam.textContent, 'AMSTERDAM');
  });
});

describe('Confetti canvas', () => {
  it('has hidden confetti canvas for Easter egg', () => {
    const canvas = doc.getElementById('confettiCanvas');
    assert.ok(canvas, '#confettiCanvas missing');
    assert.equal(canvas.tagName, 'CANVAS');
    assert.ok(canvas.classList.contains('confetti-canvas'));
  });
});

describe('Script loading', () => {
  it('loads Three.js from CDN', () => {
    const script = doc.querySelector('script[src*="three"]');
    assert.ok(script, 'Three.js script missing');
    assert.match(script.getAttribute('src'), /r128/);
  });

  it('loads GSAP from CDN', () => {
    const gsap = doc.querySelector('script[src*="gsap.min"]');
    assert.ok(gsap, 'GSAP script missing');
  });

  it('loads ScrollTrigger from CDN', () => {
    const st = doc.querySelector('script[src*="ScrollTrigger"]');
    assert.ok(st, 'ScrollTrigger script missing');
  });

  it('loads app.js last', () => {
    const scripts = doc.querySelectorAll('script[src]');
    const lastScript = scripts[scripts.length - 1];
    assert.equal(lastScript.getAttribute('src'), 'app.js');
  });

  it('has all 5 sections in correct order', () => {
    const sections = doc.querySelectorAll('main .section');
    assert.equal(sections.length, 5, 'should have 5 sections');
    assert.equal(sections[0].id, 'hero');
    assert.equal(sections[1].id, 'formation');
    assert.equal(sections[2].id, 'cards');
    assert.equal(sections[3].id, 'countdown');
    assert.equal(sections[4].id, 'footer');
  });
});
