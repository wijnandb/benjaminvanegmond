const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

// Read app.js source for static analysis and extracted logic testing
const appSrc = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf-8');
const htmlSrc = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf-8');

describe('Player data integrity', () => {
  // Extract PLAYERS array from source
  const playersMatch = appSrc.match(/const PLAYERS = \[([\s\S]*?)\];/);
  assert.ok(playersMatch, 'PLAYERS array not found in app.js');

  // We can evaluate just the data portion safely
  const playersCode = `[${playersMatch[1]}]`;
  const PLAYERS = eval(playersCode);

  it('has exactly 11 players (full starting XI)', () => {
    assert.equal(PLAYERS.length, 11);
  });

  it('every player has required fields', () => {
    const requiredFields = ['name', 'firstName', 'number', 'position', 'x', 'y', 'stats', 'quote'];
    PLAYERS.forEach((player, i) => {
      requiredFields.forEach(field => {
        assert.ok(player[field] !== undefined, `Player ${i} (${player.name}) missing field: ${field}`);
      });
    });
  });

  it('all player names are non-empty uppercase strings', () => {
    PLAYERS.forEach(p => {
      assert.ok(typeof p.name === 'string' && p.name.length > 0, `Invalid name: ${p.name}`);
      assert.equal(p.name, p.name.toUpperCase(), `Name should be uppercase: ${p.name}`);
    });
  });

  it('all player numbers are positive integers', () => {
    PLAYERS.forEach(p => {
      assert.ok(Number.isInteger(p.number) && p.number > 0, `Invalid number for ${p.name}: ${p.number}`);
    });
  });

  it('player numbers are unique', () => {
    const numbers = PLAYERS.map(p => p.number);
    const uniqueNumbers = new Set(numbers);
    assert.equal(uniqueNumbers.size, numbers.length, 'duplicate player numbers found');
  });

  it('all positions are valid football positions', () => {
    const validPositions = [
      'Goalkeeper', 'Right Back', 'Left Back', 'Centre Back',
      'Midfielder', 'Left Wing', 'Right Wing', 'Striker',
      'Attacking Midfielder', 'Defensive Midfielder',
    ];
    PLAYERS.forEach(p => {
      assert.ok(validPositions.includes(p.position), `Invalid position for ${p.name}: ${p.position}`);
    });
  });

  it('has exactly one goalkeeper', () => {
    const gks = PLAYERS.filter(p => p.position === 'Goalkeeper');
    assert.equal(gks.length, 1, `should have 1 GK, found ${gks.length}`);
  });

  it('player coordinates are within SVG viewBox (0-680 x, 0-1000 y)', () => {
    PLAYERS.forEach(p => {
      assert.ok(p.x >= 0 && p.x <= 680, `${p.name} x=${p.x} out of bounds`);
      assert.ok(p.y >= 0 && p.y <= 1000, `${p.name} y=${p.y} out of bounds`);
    });
  });

  it('every player has stats with at least 2 entries', () => {
    PLAYERS.forEach(p => {
      const statCount = Object.keys(p.stats).length;
      assert.ok(statCount >= 2, `${p.name} has only ${statCount} stats`);
    });
  });

  it('all stat values are numbers', () => {
    PLAYERS.forEach(p => {
      Object.entries(p.stats).forEach(([key, val]) => {
        assert.ok(typeof val === 'number', `${p.name} stat ${key} is not a number: ${val}`);
      });
    });
  });

  it('every player has a non-empty quote', () => {
    PLAYERS.forEach(p => {
      assert.ok(typeof p.quote === 'string' && p.quote.length > 0, `${p.name} missing quote`);
    });
  });
});

describe('API integration', () => {
  it('defines TheSportsDB base URL and Ajax team ID', () => {
    assert.match(appSrc, /TSDB_BASE\s*=\s*'https:\/\/www\.thesportsdb\.com/);
    assert.match(appSrc, /AJAX_TEAM_ID\s*=\s*'133772'/);
    assert.match(appSrc, /EREDIVISIE_ID\s*=\s*'4337'/);
  });

  it('has fetchNextMatch function for match data', () => {
    assert.match(appSrc, /async function fetchNextMatch/);
    assert.match(appSrc, /matches\.json/);
  });

  it('has fetchPlayerPhotos function', () => {
    assert.match(appSrc, /async function fetchPlayerPhotos/);
    assert.match(appSrc, /lookup_all_players\.php/);
    assert.match(appSrc, /strCutout|strThumb/);
  });

  it('has hardcoded fallback match data', () => {
    assert.match(appSrc, /applyFallbackMatch/);
    assert.match(appSrc, /FEYENOORD|TWENTE/);
  });
});

describe('Countdown logic', () => {
  it('correctly calculates time difference', () => {
    // Replicate the countdown logic
    const futureDate = new Date(Date.now() + 90061000); // 1 day, 1 hour, 1 min, 1 sec
    const diff = futureDate - new Date();

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const mins = Math.floor((diff / (1000 * 60)) % 60);
    const secs = Math.floor((diff / 1000) % 60);

    assert.equal(days, 1);
    assert.equal(hours, 1);
    assert.equal(mins, 1);
    assert.ok(secs >= 0 && secs <= 1); // allow 1s tolerance
  });

  it('clamps negative differences to zero', () => {
    const pastDate = new Date(Date.now() - 100000);
    let diff = pastDate - new Date();
    if (diff < 0) diff = 0;
    assert.equal(diff, 0);
  });

  it('pads values with leading zeros', () => {
    assert.equal(String(5).padStart(2, '0'), '05');
    assert.equal(String(12).padStart(2, '0'), '12');
    assert.equal(String(0).padStart(2, '0'), '00');
  });
});

describe('Konami code sequence', () => {
  it('defines the correct Konami code sequence in app.js', () => {
    assert.match(appSrc, /ArrowUp.*ArrowUp.*ArrowDown.*ArrowDown/s);
    assert.match(appSrc, /ArrowLeft.*ArrowRight.*ArrowLeft.*ArrowRight/s);
    assert.match(appSrc, /KeyB.*KeyA/s);
  });
});

describe('Formation connections', () => {
  it('defines connection pairs between valid player indices', () => {
    const connectionsMatch = appSrc.match(/const connections = \[([\s\S]*?)\];/);
    assert.ok(connectionsMatch, 'connections array not found');
    const connections = eval(`[${connectionsMatch[1]}]`);

    assert.ok(connections.length > 0, 'should have connections');

    connections.forEach(([a, b], i) => {
      assert.ok(a >= 0 && a <= 10, `connection ${i}: index ${a} out of range`);
      assert.ok(b >= 0 && b <= 10, `connection ${i}: index ${b} out of range`);
      assert.notEqual(a, b, `connection ${i}: self-connection`);
    });
  });
});

describe('DOM initialization flow', () => {
  it('app.js wraps everything in an IIFE', () => {
    // Allow leading comments before the IIFE
    assert.match(appSrc, /\(function\s*\(\)\s*\{/);
    assert.match(appSrc, /\}\)\(\);\s*$/);
  });

  it('uses strict mode', () => {
    assert.match(appSrc, /'use strict'/);
  });

  it('calls initLoader on DOMContentLoaded or immediately', () => {
    assert.match(appSrc, /DOMContentLoaded.*initLoader|initLoader/s);
  });

  it('finishLoading initializes all sections', () => {
    assert.match(appSrc, /initHero\(\)/);
    assert.match(appSrc, /initFormation\(\)/);
    assert.match(appSrc, /initCards\(\)/);
    assert.match(appSrc, /initScrollAnimations\(\)/);
    assert.match(appSrc, /initKonamiCode\(\)/);
    assert.match(appSrc, /fetchNextMatch\(\)/);
    assert.match(appSrc, /fetchPlayerPhotos\(\)/);
  });
});

describe('Mobile responsiveness logic', () => {
  it('detects mobile based on window width', () => {
    assert.match(appSrc, /isMobile\s*=\s*window\.innerWidth\s*<\s*768/);
  });

  it('reduces particle count on mobile for loader', () => {
    assert.match(appSrc, /isMobile\s*\?\s*2000\s*:\s*5000/);
  });

  it('reduces particle count on mobile for hero', () => {
    assert.match(appSrc, /isMobile\s*\?\s*1500\s*:\s*4000/);
  });

  it('handles window resize events', () => {
    assert.match(appSrc, /addEventListener\('resize'/);
    assert.match(appSrc, /updateProjectionMatrix/);
  });
});

describe('Three.js usage', () => {
  it('creates scenes and cameras', () => {
    assert.match(appSrc, /new THREE\.Scene/);
    assert.match(appSrc, /new THREE\.PerspectiveCamera/);
  });

  it('uses WebGLRenderer', () => {
    assert.match(appSrc, /new THREE\.WebGLRenderer/);
  });

  it('uses BufferGeometry with PointsMaterial', () => {
    assert.match(appSrc, /new THREE\.BufferGeometry/);
    assert.match(appSrc, /new THREE\.PointsMaterial/);
    assert.match(appSrc, /new THREE\.Points/);
  });

  it('limits pixel ratio for performance', () => {
    assert.match(appSrc, /Math\.min\(window\.devicePixelRatio,\s*2\)/);
  });

  it('uses requestAnimationFrame for render loops', () => {
    const rafCount = (appSrc.match(/requestAnimationFrame/g) || []).length;
    assert.ok(rafCount >= 2, `should use requestAnimationFrame in multiple loops, found ${rafCount}`);
  });
});

describe('GSAP usage', () => {
  it('registers ScrollTrigger plugin', () => {
    assert.match(appSrc, /gsap\.registerPlugin\(ScrollTrigger\)/);
  });

  it('uses scroll triggers for section animations', () => {
    const triggerCount = (appSrc.match(/scrollTrigger:/g) || []).length;
    assert.ok(triggerCount >= 4, `should have scrollTriggers for multiple sections, found ${triggerCount}`);
  });
});

describe('Card rendering', () => {
  it('creates cards with correct HTML structure in innerHTML', () => {
    assert.match(appSrc, /card-inner/);
    assert.match(appSrc, /card-face card-front/);
    assert.match(appSrc, /card-face card-back/);
    assert.match(appSrc, /card-shimmer/);
    assert.match(appSrc, /card-photo/);
    assert.match(appSrc, /card-number/);
    assert.match(appSrc, /card-name/);
    assert.match(appSrc, /card-position/);
    assert.match(appSrc, /card-stat/);
    assert.match(appSrc, /card-quote/);
  });

  it('Dream XI limits selection to 11 players', () => {
    assert.match(appSrc, /dreamXiSet\.size\s*<\s*11/);
  });
});

describe('File references are consistent', () => {
  it('HTML references styles.css which exists', () => {
    assert.ok(fs.existsSync(path.join(__dirname, '..', 'styles.css')));
  });

  it('HTML references app.js which exists', () => {
    assert.ok(fs.existsSync(path.join(__dirname, '..', 'app.js')));
  });

  it('all element IDs referenced in JS exist in HTML', () => {
    const jsIds = [
      'loader', 'loaderCanvas', 'main', 'heroCanvas', 'hero',
      'playerDots', 'formationLines', 'cardsTrack', 'dreamXiCount',
      'matchDate', 'opponentName', 'opponentCrest', 'matchVenue',
      'cdDays', 'cdHours', 'cdMins', 'cdSecs', 'confettiCanvas',
    ];
    const dom = new JSDOM(htmlSrc);
    const doc = dom.window.document;
    jsIds.forEach(id => {
      assert.ok(doc.getElementById(id), `element #${id} referenced in JS but missing from HTML`);
    });
  });
});
