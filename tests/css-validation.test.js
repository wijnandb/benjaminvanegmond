const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const cssPath = path.join(__dirname, '..', 'styles.css');
const css = fs.readFileSync(cssPath, 'utf-8');

describe('CSS file integrity', () => {
  it('exists and is non-empty', () => {
    assert.ok(css.length > 0, 'styles.css is empty');
  });

  it('has no unbalanced braces', () => {
    let depth = 0;
    // Strip comments and strings to avoid false positives
    const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/"[^"]*"|'[^']*'/g, '');
    for (const ch of stripped) {
      if (ch === '{') depth++;
      if (ch === '}') depth--;
      assert.ok(depth >= 0, 'closing brace without matching opening brace');
    }
    assert.equal(depth, 0, `unbalanced braces: depth ended at ${depth}`);
  });
});

describe('CSS custom properties', () => {
  it('defines Ajax color palette in :root', () => {
    assert.match(css, /--ajax-red:\s*#C8102E/i, 'Ajax red not defined');
    assert.match(css, /--charcoal:\s*#1A1A1A/i, 'charcoal not defined');
    assert.match(css, /--gold:\s*#D4AF37/i, 'gold not defined');
    assert.match(css, /--dark:\s*#0D0D0D/i, 'dark not defined');
  });

  it('defines font families', () => {
    assert.match(css, /--font-heading:.*Oswald/);
    assert.match(css, /--font-body:.*Barlow Condensed/);
  });
});

describe('Key component styles exist', () => {
  it('has loader styles', () => {
    assert.match(css, /\.loader\s*\{/);
    assert.match(css, /\.loader\.done/);
  });

  it('has hero styles', () => {
    assert.match(css, /\.hero\s*\{/);
    assert.match(css, /\.hero-title/);
    assert.match(css, /\.hero-line/);
    assert.match(css, /\.hero-line\.accent/);
  });

  it('has formation styles', () => {
    assert.match(css, /\.formation\s*\{/);
    assert.match(css, /\.pitch-container/);
    assert.match(css, /\.player-dot/);
    assert.match(css, /\.player-tooltip/);
  });

  it('has player card styles with 3D transforms', () => {
    assert.match(css, /\.player-card\s*\{/);
    assert.match(css, /\.card-inner/);
    assert.match(css, /transform-style:\s*preserve-3d/);
    assert.match(css, /backface-visibility:\s*hidden/);
    assert.match(css, /rotateY\(180deg\)/);
    assert.match(css, /\.card-front/);
    assert.match(css, /\.card-back/);
  });

  it('has holographic shimmer style', () => {
    assert.match(css, /\.card-shimmer/);
    assert.match(css, /--shimmer-angle/);
  });

  it('has selected card glow effect', () => {
    assert.match(css, /\.player-card\.selected/);
    assert.match(css, /box-shadow/);
  });

  it('has countdown styles', () => {
    assert.match(css, /\.countdown\s*\{/);
    assert.match(css, /\.countdown-timer/);
    assert.match(css, /\.countdown-value/);
    assert.match(css, /\.countdown-sep/);
  });

  it('has heartbeat animation', () => {
    assert.match(css, /@keyframes heartbeat/);
    assert.match(css, /\.countdown-bg/);
  });

  it('has blink animation for countdown separators', () => {
    assert.match(css, /@keyframes blink/);
  });

  it('has footer styles', () => {
    assert.match(css, /\.footer\s*\{/);
    assert.match(css, /\.footer-crest/);
    assert.match(css, /@keyframes crestGlow/);
  });

  it('has confetti canvas styles', () => {
    assert.match(css, /\.confetti-canvas/);
    assert.match(css, /pointer-events:\s*none/);
  });
});

describe('Responsive design', () => {
  it('has media query for tablets (max-width: 768px)', () => {
    assert.match(css, /@media\s*\(\s*max-width:\s*768px\s*\)/);
  });

  it('has media query for mobile (max-width: 480px)', () => {
    assert.match(css, /@media\s*\(\s*max-width:\s*480px\s*\)/);
  });

  it('uses clamp() for fluid typography', () => {
    const clampCount = (css.match(/clamp\(/g) || []).length;
    assert.ok(clampCount >= 3, `should use clamp() for fluid typography, found ${clampCount} uses`);
  });
});

describe('Animations', () => {
  it('has pulse animation for loader text', () => {
    assert.match(css, /@keyframes pulse/);
  });

  it('has bounceDown animation for scroll indicator', () => {
    assert.match(css, /@keyframes bounceDown/);
  });

  it('has scroll indicator styles', () => {
    assert.match(css, /\.scroll-indicator/);
    assert.match(css, /\.chevron-wrapper/);
  });
});

describe('Performance and best practices', () => {
  it('uses box-sizing border-box reset', () => {
    assert.match(css, /box-sizing:\s*border-box/);
  });

  it('has overflow-x hidden on html/body', () => {
    assert.match(css, /overflow-x:\s*hidden/);
  });

  it('uses -webkit-font-smoothing antialiased', () => {
    assert.match(css, /-webkit-font-smoothing:\s*antialiased/);
  });

  it('has smooth scroll behavior', () => {
    assert.match(css, /scroll-behavior:\s*smooth/);
  });
});
