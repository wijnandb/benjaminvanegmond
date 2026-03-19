/* ============================================
   Ajax Fan Experience — Main Application
   ============================================ */

(function () {
  'use strict';

  // ---- TheSportsDB API ----
  const TSDB_BASE = 'https://www.thesportsdb.com/api/v1/json/3';
  const AJAX_TEAM_ID = '133604';
  const EREDIVISIE_ID = '4337';

  // ---- Current Squad 2025-26 (Formation: 4-2-3-1, Coach: Oscar Garcia since Mar 2026) ----
  const PLAYERS = [
    { name: 'PAES', firstName: 'Maarten', number: 26, position: 'Goalkeeper', x: 340, y: 900, stats: { saves: 42, cleanSheets: 6, rating: 7.1 }, quote: '"From FC Dallas to the ArenA"' },
    { name: 'GAAEI', firstName: 'Anton', number: 3, position: 'Right Back', x: 560, y: 750, stats: { tackles: 52, assists: 4, rating: 6.9 }, quote: '"Solid on the right flank"' },
    { name: 'SUTALO', firstName: 'Josip', number: 37, position: 'Centre Back', x: 420, y: 780, stats: { interceptions: 68, aerials: 51, rating: 7.0 }, quote: '"Croatian wall"' },
    { name: 'BAAS', firstName: 'Youri', number: 15, position: 'Centre Back', x: 260, y: 780, stats: { goals: 4, passes: 1580, rating: 7.3 }, quote: '"Scoring defender"' },
    { name: 'WIJNDAL', firstName: 'Owen', number: 5, position: 'Left Back', x: 120, y: 750, stats: { assists: 6, tackles: 48, rating: 7.1 }, quote: '"Flying down the left"' },
    { name: 'KLAASSEN', firstName: 'Davy', number: 18, position: 'Midfielder', x: 440, y: 580, stats: { goals: 4, assists: 3, rating: 7.2 }, quote: '"The captain returns"' },
    { name: 'REGEER', firstName: 'Youri', number: 6, position: 'Midfielder', x: 240, y: 580, stats: { passAccuracy: 88, tackles: 46, rating: 7.0 }, quote: '"Engine of the midfield"' },
    { name: 'GLOUKH', firstName: 'Oscar', number: 10, position: 'Attacking Midfielder', x: 340, y: 460, stats: { goals: 5, assists: 5, rating: 7.4 }, quote: '"Magic in his feet"' },
    { name: 'BOUNIDA', firstName: 'Rayane', number: 49, position: 'Right Wing', x: 540, y: 350, stats: { goals: 3, assists: 4, rating: 7.1 }, quote: '"The wonderkid"' },
    { name: 'GODTS', firstName: 'Mika', number: 11, position: 'Left Wing', x: 140, y: 350, stats: { goals: 14, assists: 9, rating: 7.9 }, quote: '"Top scorer — unstoppable"' },
    { name: 'WEGHORST', firstName: 'Wout', number: 25, position: 'Striker', x: 340, y: 240, stats: { goals: 6, aerials: 78, rating: 7.0 }, quote: '"Target man"' },
  ];

  // ---- Ajax Classic Logo (returned 2025-26) — TheSportsDB badge ----
  const AJAX_BADGE_URL = 'https://www.thesportsdb.com/images/media/team/badge/q2gx711692974044.png';
  // Fallback: use a smaller version
  const AJAX_BADGE_SMALL = AJAX_BADGE_URL + '/small';

  // ---- State ----
  const dreamXiSet = new Set();
  let isMobile = window.innerWidth < 768;
  let playerPhotos = {}; // name → photo URL, populated from API

  // ---- Fetch player photos from TheSportsDB ----
  async function fetchPlayerPhotos() {
    try {
      const res = await fetch(TSDB_BASE + '/lookup_all_players.php?id=' + AJAX_TEAM_ID);
      const data = await res.json();
      if (data.player) {
        data.player.forEach(p => {
          const key = p.strPlayer.toUpperCase().split(' ').pop(); // last name
          const photo = p.strCutout || p.strThumb || null;
          if (photo) playerPhotos[key] = photo;
        });
        // Update cards with photos
        updateCardPhotos();
      }
    } catch (e) {
      // Silently fail — cards work fine without photos
    }
  }

  function updateCardPhotos() {
    PLAYERS.forEach((player, i) => {
      const photoUrl = playerPhotos[player.name];
      if (!photoUrl) return;
      const card = document.querySelector(`.player-card[data-index="${i}"] .card-photo`);
      if (card) {
        card.style.backgroundImage = `url(${photoUrl})`;
        card.classList.add('has-photo');
      }
    });
  }

  // ---- Fetch upcoming matches from TheSportsDB ----
  async function fetchNextMatch() {
    try {
      // Try team-specific endpoint first (may only return home games on free tier)
      const res = await fetch(TSDB_BASE + '/eventsnext.php?id=' + AJAX_TEAM_ID);
      const data = await res.json();
      if (data.events && data.events.length > 0) {
        applyMatchData(data.events[0]);
        return;
      }
    } catch (e) {
      // Fall through to league endpoint
    }

    try {
      // Fallback: get next league events and filter for Ajax
      const res = await fetch(TSDB_BASE + '/eventsnextleague.php?id=' + EREDIVISIE_ID);
      const data = await res.json();
      if (data.events) {
        const ajaxMatch = data.events.find(e =>
          e.strHomeTeam.includes('Ajax') || e.strAwayTeam.includes('Ajax')
        );
        if (ajaxMatch) {
          applyMatchData(ajaxMatch);
          return;
        }
      }
    } catch (e) {
      // Use hardcoded fallback
    }

    // Fallback: hardcoded next match
    applyFallbackMatch();
  }

  function applyMatchData(event) {
    const isHome = event.strHomeTeam.includes('Ajax');
    const opponent = isHome ? event.strAwayTeam : event.strHomeTeam;
    const opponentBadge = isHome ? event.strAwayTeamBadge : event.strHomeTeamBadge;
    const matchDate = new Date(event.strTimestamp || event.dateEvent + 'T' + (event.strTime || '15:00:00'));
    const venue = event.strVenue || 'Johan Cruijff ArenA';
    const round = event.intRound ? 'Matchday ' + event.intRound : '';

    document.getElementById('matchDate').textContent =
      matchDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    document.getElementById('opponentName').textContent = opponent.toUpperCase();

    // Set opponent badge image
    if (opponentBadge) {
      const crestEl = document.getElementById('opponentCrest');
      crestEl.innerHTML = `<img src="${opponentBadge}/small" alt="${opponent}" style="width:60px;height:60px;object-fit:contain;">`;
    }

    if (round) {
      document.getElementById('matchVenue').textContent = venue + ' \u2022 ' + round;
    }

    // Start countdown
    startCountdown(matchDate);
  }

  function applyFallbackMatch() {
    // Hardcoded: Feyenoord vs Ajax, 22 March 2026; Ajax vs Twente, 4 April 2026
    const fallbackDate = new Date('2026-03-22T14:30:00+01:00');
    const now = new Date();
    const matchDate = fallbackDate > now ? fallbackDate : new Date('2026-04-04T20:00:00+02:00');
    const opponent = fallbackDate > now ? 'FEYENOORD' : 'FC TWENTE';

    document.getElementById('matchDate').textContent =
      matchDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    document.getElementById('opponentName').textContent = opponent;

    startCountdown(matchDate);
  }

  function startCountdown(matchDate) {
    function updateCountdown() {
      const now = new Date();
      let diff = matchDate - now;
      if (diff < 0) diff = 0;

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const mins = Math.floor((diff / (1000 * 60)) % 60);
      const secs = Math.floor((diff / 1000) % 60);

      document.getElementById('cdDays').textContent = String(days).padStart(2, '0');
      document.getElementById('cdHours').textContent = String(hours).padStart(2, '0');
      document.getElementById('cdMins').textContent = String(mins).padStart(2, '0');
      document.getElementById('cdSecs').textContent = String(secs).padStart(2, '0');
    }

    updateCountdown();
    setInterval(updateCountdown, 1000);
  }

  // ---- Loader: Particle Logo Assembly ----
  function initLoader() {
    const canvas = document.getElementById('loaderCanvas');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.z = 3;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(320, 320);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const particleCount = isMobile ? 2000 : 5000;
    const targetPositions = new Float32Array(particleCount * 3);
    const startPositions = new Float32Array(particleCount * 3);
    const currentPositions = new Float32Array(particleCount * 3);

    // Generate shield outline + XXX pattern
    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;
      startPositions[idx] = (Math.random() - 0.5) * 6;
      startPositions[idx + 1] = (Math.random() - 0.5) * 6;
      startPositions[idx + 2] = (Math.random() - 0.5) * 3;

      const r = Math.random();
      if (r < 0.55) {
        // Shield hexagon outline
        const angle = Math.random() * Math.PI * 2;
        const sides = 6;
        const sectorAngle = Math.PI * 2 / sides;
        const sector = Math.floor(angle / sectorAngle);
        const t = (angle - sector * sectorAngle) / sectorAngle;
        const a1 = sector * sectorAngle - Math.PI / 2;
        const a2 = (sector + 1) * sectorAngle - Math.PI / 2;
        const rad = 1.2;
        const x1 = Math.cos(a1) * rad * 0.85;
        const y1 = Math.sin(a1) * rad;
        const x2 = Math.cos(a2) * rad * 0.85;
        const y2 = Math.sin(a2) * rad;
        targetPositions[idx] = x1 + (x2 - x1) * t + (Math.random() - 0.5) * 0.08;
        targetPositions[idx + 1] = (y1 + (y2 - y1) * t) * 1.15 + (Math.random() - 0.5) * 0.08;
        targetPositions[idx + 2] = (Math.random() - 0.5) * 0.05;
      } else {
        // Three X marks (XXX)
        const xIdx = Math.floor(Math.random() * 3);
        const centerX = (xIdx - 1) * 0.55;
        const centerY = 0.15;
        const arm = Math.random() < 0.5 ? 1 : -1;
        const t = (Math.random() - 0.5) * 0.7;
        const armAngle = arm > 0 ? Math.PI / 4 : -Math.PI / 4;
        targetPositions[idx] = centerX + Math.cos(armAngle) * t + (Math.random() - 0.5) * 0.04;
        targetPositions[idx + 1] = centerY + Math.sin(armAngle) * t + (Math.random() - 0.5) * 0.04;
        targetPositions[idx + 2] = (Math.random() - 0.5) * 0.03;
      }

      currentPositions[idx] = startPositions[idx];
      currentPositions[idx + 1] = startPositions[idx + 1];
      currentPositions[idx + 2] = startPositions[idx + 2];
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(currentPositions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xC8102E,
      size: isMobile ? 0.025 : 0.018,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    let startTime = null;
    const assemblyDuration = 3000;
    let assembled = false;

    function animate(time) {
      if (!startTime) startTime = time;
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / assemblyDuration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);

      const pos = geometry.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        const idx = i * 3;
        pos[idx] = startPositions[idx] + (targetPositions[idx] - startPositions[idx]) * ease;
        pos[idx + 1] = startPositions[idx + 1] + (targetPositions[idx + 1] - startPositions[idx + 1]) * ease;
        pos[idx + 2] = startPositions[idx + 2] + (targetPositions[idx + 2] - startPositions[idx + 2]) * ease;
      }
      geometry.attributes.position.needsUpdate = true;

      points.rotation.y = Math.sin(elapsed * 0.0003) * 0.1;
      renderer.render(scene, camera);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else if (!assembled) {
        assembled = true;
        setTimeout(finishLoading, 800);
      }
    }

    requestAnimationFrame(animate);
  }

  function finishLoading() {
    const loader = document.getElementById('loader');
    const main = document.getElementById('main');
    loader.classList.add('done');
    main.classList.remove('hidden');
    main.style.opacity = '1';
    initHero();
    initFormation();
    initCards();
    initScrollAnimations();
    initKonamiCode();

    // Fetch live data from API (non-blocking)
    fetchNextMatch();
    fetchPlayerPhotos();
  }

  // ---- Hero: Stadium Particles ----
  function initHero() {
    const canvas = document.getElementById('heroCanvas');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 4;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const particleCount = isMobile ? 1500 : 4000;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;
      positions[idx] = (Math.random() - 0.5) * 12;
      positions[idx + 1] = (Math.random() - 0.5) * 8;
      positions[idx + 2] = (Math.random() - 0.5) * 6;

      velocities[idx] = (Math.random() - 0.5) * 0.003;
      velocities[idx + 1] = Math.random() * 0.004 + 0.001;
      velocities[idx + 2] = (Math.random() - 0.5) * 0.002;

      const isRed = Math.random() < 0.6;
      if (isRed) {
        colors[idx] = 0.78; colors[idx + 1] = 0.06; colors[idx + 2] = 0.18;
      } else {
        const w = 0.7 + Math.random() * 0.3;
        colors[idx] = w; colors[idx + 1] = w; colors[idx + 2] = w;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: isMobile ? 0.04 : 0.03,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    const fogGeo = new THREE.PlaneGeometry(20, 4);
    const fogMat = new THREE.MeshBasicMaterial({ color: 0x0D0D0D, transparent: true, opacity: 0.7 });
    const fog = new THREE.Mesh(fogGeo, fogMat);
    fog.position.y = -3.5;
    fog.position.z = 1;
    scene.add(fog);

    let mouseX = 0, mouseY = 0;
    const heroEl = document.getElementById('hero');
    heroEl.addEventListener('mousemove', (e) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    });

    function animate() {
      requestAnimationFrame(animate);

      const pos = geometry.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        const idx = i * 3;
        pos[idx] += velocities[idx];
        pos[idx + 1] += velocities[idx + 1];
        pos[idx + 2] += velocities[idx + 2];

        if (pos[idx + 1] > 5) {
          pos[idx + 1] = -4;
          pos[idx] = (Math.random() - 0.5) * 12;
        }
      }
      geometry.attributes.position.needsUpdate = true;

      camera.position.x += (mouseX * 0.3 - camera.position.x) * 0.05;
      camera.position.y += (-mouseY * 0.2 - camera.position.y) * 0.05;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
      isMobile = window.innerWidth < 768;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  // ---- Formation Viewer ----
  function initFormation() {
    const dotsGroup = document.getElementById('playerDots');
    const linesGroup = document.getElementById('formationLines');

    const connections = [
      [1, 2], [2, 3], [3, 4],
      [1, 5], [2, 5], [3, 6], [4, 6],
      [5, 7], [6, 7],
      [7, 8], [7, 9], [7, 10],
      [8, 10], [9, 10],
    ];

    connections.forEach(([a, b]) => {
      const pA = PLAYERS[a];
      const pB = PLAYERS[b];
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', pA.x);
      line.setAttribute('y1', pA.y);
      line.setAttribute('x2', pB.x);
      line.setAttribute('y2', pB.y);
      line.setAttribute('stroke', 'rgba(200,16,46,0.15)');
      line.setAttribute('stroke-width', '1');
      line.setAttribute('stroke-dasharray', '6 4');
      line.classList.add('formation-line');
      linesGroup.appendChild(line);
    });

    let dashOffset = 0;
    function animateDashes() {
      dashOffset -= 0.3;
      linesGroup.querySelectorAll('.formation-line').forEach(l => {
        l.setAttribute('stroke-dashoffset', dashOffset);
      });
      requestAnimationFrame(animateDashes);
    }
    animateDashes();

    PLAYERS.forEach((player, i) => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.classList.add('player-dot');
      g.setAttribute('transform', `translate(${player.x}, ${player.y})`);

      const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      ring.setAttribute('r', '14');
      ring.setAttribute('fill', 'none');
      ring.setAttribute('stroke', 'rgba(200,16,46,0.3)');
      ring.setAttribute('stroke-width', '1');
      ring.classList.add('dot-ring');
      g.appendChild(ring);

      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('r', '8');
      dot.setAttribute('fill', i === 0 ? '#D4AF37' : '#C8102E');
      dot.setAttribute('opacity', '0.9');
      g.appendChild(dot);

      const numText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      numText.textContent = player.number;
      numText.setAttribute('text-anchor', 'middle');
      numText.setAttribute('dominant-baseline', 'central');
      numText.setAttribute('fill', '#fff');
      numText.setAttribute('font-family', 'Oswald, sans-serif');
      numText.setAttribute('font-size', '9');
      numText.setAttribute('font-weight', '600');
      g.appendChild(numText);

      const tooltip = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      tooltip.classList.add('player-tooltip');

      const tooltipBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      tooltipBg.setAttribute('x', '-55');
      tooltipBg.setAttribute('y', '-45');
      tooltipBg.setAttribute('width', '110');
      tooltipBg.setAttribute('height', '28');
      tooltipBg.setAttribute('rx', '4');
      tooltipBg.setAttribute('fill', 'rgba(0,0,0,0.85)');
      tooltipBg.setAttribute('stroke', '#C8102E');
      tooltipBg.setAttribute('stroke-width', '1');
      tooltip.appendChild(tooltipBg);

      const tooltipText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      tooltipText.textContent = `${player.number} ${player.name}`;
      tooltipText.setAttribute('text-anchor', 'middle');
      tooltipText.setAttribute('y', '-27');
      tooltipText.setAttribute('fill', '#fff');
      tooltipText.setAttribute('font-family', 'Oswald, sans-serif');
      tooltipText.setAttribute('font-size', '12');
      tooltipText.setAttribute('font-weight', '500');
      tooltipText.setAttribute('letter-spacing', '1');
      tooltip.appendChild(tooltipText);

      g.appendChild(tooltip);

      g.addEventListener('click', () => {
        const cardEl = document.querySelector(`.player-card[data-index="${i}"]`);
        if (cardEl) {
          cardEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
          cardEl.classList.add('flipped');
          setTimeout(() => cardEl.classList.remove('flipped'), 2000);
        }
      });

      dotsGroup.appendChild(g);
    });
  }

  // ---- Player Cards ----
  function initCards() {
    const track = document.getElementById('cardsTrack');

    PLAYERS.forEach((player, i) => {
      const card = document.createElement('div');
      card.className = 'player-card';
      card.dataset.index = i;

      const statsHtml = Object.entries(player.stats).map(([key, val]) => {
        const label = key.replace(/([A-Z])/g, ' $1').toUpperCase();
        return `<div class="card-stat"><span class="card-stat-label">${label}</span><span class="card-stat-value">${val}</span></div>`;
      }).join('');

      card.innerHTML = `
        <div class="card-inner">
          <div class="card-face card-front">
            <div class="card-shimmer"></div>
            <div class="card-photo" data-player="${player.name}"></div>
            <div class="card-number">${player.number}</div>
            <div class="card-name">${player.name}</div>
            <div class="card-position">${player.position}</div>
            <div class="card-ajax-badge">AFC AJAX AMSTERDAM</div>
          </div>
          <div class="card-face card-back">
            <div class="card-back-header">${player.firstName} ${player.name} #${player.number}</div>
            ${statsHtml}
            <div class="card-quote">${player.quote}</div>
          </div>
        </div>
      `;

      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        const angle = Math.atan2(y - 0.5, x - 0.5) * (180 / Math.PI) + 180;
        const shimmer = card.querySelector('.card-shimmer');
        shimmer.style.setProperty('--shimmer-angle', angle + 'deg');
      });

      card.addEventListener('click', () => {
        if (dreamXiSet.has(i)) {
          dreamXiSet.delete(i);
          card.classList.remove('selected');
        } else if (dreamXiSet.size < 11) {
          dreamXiSet.add(i);
          card.classList.add('selected');
        }
        document.getElementById('dreamXiCount').textContent = dreamXiSet.size;
      });

      track.appendChild(card);
    });
  }

  // ---- GSAP Scroll Animations ----
  function initScrollAnimations() {
    gsap.registerPlugin(ScrollTrigger);

    gsap.to('.hero-line', {
      opacity: 1, y: 0, duration: 1, stagger: 0.2, delay: 0.3, ease: 'power3.out',
    });
    gsap.to('.hero-subtitle', {
      opacity: 1, duration: 1, delay: 0.9, ease: 'power2.out',
    });
    gsap.to('.scroll-indicator', {
      opacity: 1, duration: 1, delay: 1.2, ease: 'power2.out',
    });

    gsap.from('.formation .section-header', {
      scrollTrigger: { trigger: '#formation', start: 'top 80%' },
      opacity: 0, y: 40, duration: 0.8,
    });
    gsap.from('.player-dot', {
      scrollTrigger: { trigger: '#formation', start: 'top 60%' },
      opacity: 0, scale: 0, duration: 0.5, stagger: 0.08, ease: 'back.out(2)',
    });

    gsap.from('.cards .section-header', {
      scrollTrigger: { trigger: '#cards', start: 'top 80%' },
      opacity: 0, y: 40, duration: 0.8,
    });

    gsap.from('.countdown .section-header, .match-info, .countdown-timer, .match-venue', {
      scrollTrigger: { trigger: '#countdown', start: 'top 70%' },
      opacity: 0, y: 30, duration: 0.7, stagger: 0.15,
    });

    gsap.from('.footer-xxx .xxx-cross', {
      scrollTrigger: { trigger: '#footer', start: 'top 80%' },
      opacity: 0, scale: 0.5, duration: 0.6, stagger: 0.15, ease: 'back.out(2)',
    });
    gsap.from('.footer-message, .footer-hint, .footer-amsterdam', {
      scrollTrigger: { trigger: '#footer', start: 'top 70%' },
      opacity: 0, y: 20, duration: 0.7, stagger: 0.1,
    });
  }

  // ---- Konami Code Easter Egg ----
  function initKonamiCode() {
    const code = [
      'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
      'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
      'KeyB', 'KeyA',
    ];
    let index = 0;

    document.addEventListener('keydown', (e) => {
      if (e.code === code[index]) {
        index++;
        if (index === code.length) {
          triggerEasterEgg();
          index = 0;
        }
      } else {
        index = 0;
      }
    });
  }

  function triggerEasterEgg() {
    const canvas = document.getElementById('confettiCanvas');
    canvas.style.display = 'block';
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const confettiColors = ['#C8102E', '#FFFFFF', '#D4AF37', '#FF4444', '#FFD700'];
    const pieces = [];

    for (let i = 0; i < 200; i++) {
      pieces.push({
        x: Math.random() * canvas.width,
        y: -Math.random() * canvas.height,
        w: Math.random() * 10 + 5,
        h: Math.random() * 6 + 3,
        color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
        vy: Math.random() * 4 + 2,
        vx: (Math.random() - 0.5) * 3,
        rotation: Math.random() * 360,
        rv: (Math.random() - 0.5) * 10,
      });
    }

    let frame = 0;
    function animateConfetti() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      pieces.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rv;
        p.vy += 0.05;

        if (p.y < canvas.height + 20) alive = true;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });

      frame++;
      if (alive && frame < 300) {
        requestAnimationFrame(animateConfetti);
      } else {
        canvas.style.display = 'none';
      }
    }

    animateConfetti();
  }

  // ---- Initialize ----
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLoader);
  } else {
    initLoader();
  }
})();
