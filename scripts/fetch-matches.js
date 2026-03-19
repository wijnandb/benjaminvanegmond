#!/usr/bin/env node

/**
 * Fetch Ajax Amsterdam match data from Football-Data.org API (v4).
 * Writes results to data/matches.json for the static frontend.
 *
 * Requires env var: FOOTBALL_DATA_API_KEY
 *
 * Usage:  node scripts/fetch-matches.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.FOOTBALL_DATA_API_KEY;
const AJAX_TEAM_ID = 678; // Ajax Amsterdam on football-data.org
const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'matches.json');

if (!API_KEY) {
  console.error('Error: FOOTBALL_DATA_API_KEY environment variable is not set');
  process.exit(1);
}

function apiGet(endpoint) {
  return new Promise((resolve, reject) => {
    const url = `https://api.football-data.org/v4${endpoint}`;
    console.log(`Fetching: ${url}`);

    const req = https.get(url, { headers: { 'X-Auth-Token': API_KEY } }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`API returned ${res.statusCode}: ${body}`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
    });
    req.on('error', reject);
  });
}

function simplifyMatch(m) {
  return {
    id: m.id,
    utcDate: m.utcDate,
    status: m.status,
    matchday: m.matchday,
    stage: m.stage,
    venue: m.venue || null,
    homeTeam: {
      id: m.homeTeam.id,
      name: m.homeTeam.name,
      shortName: m.homeTeam.shortName,
      tla: m.homeTeam.tla,
      crest: m.homeTeam.crest,
    },
    awayTeam: {
      id: m.awayTeam.id,
      name: m.awayTeam.name,
      shortName: m.awayTeam.shortName,
      tla: m.awayTeam.tla,
      crest: m.awayTeam.crest,
    },
    score: m.score
      ? {
          winner: m.score.winner,
          fullTime: m.score.fullTime,
          halfTime: m.score.halfTime,
        }
      : null,
    competition: {
      id: m.competition.id,
      name: m.competition.name,
      emblem: m.competition.emblem,
    },
  };
}

async function main() {
  // Fetch upcoming scheduled matches
  const scheduled = await apiGet(
    `/teams/${AJAX_TEAM_ID}/matches?status=SCHEDULED&limit=10`
  );

  // Fetch recent finished matches
  const finished = await apiGet(
    `/teams/${AJAX_TEAM_ID}/matches?status=FINISHED&limit=10`
  );

  const data = {
    fetchedAt: new Date().toISOString(),
    teamId: AJAX_TEAM_ID,
    nextMatches: (scheduled.matches || []).map(simplifyMatch),
    lastMatches: (finished.matches || [])
      .map(simplifyMatch)
      .sort((a, b) => new Date(b.utcDate) - new Date(a.utcDate)),
  };

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2));
  console.log(
    `Wrote ${data.nextMatches.length} upcoming + ${data.lastMatches.length} recent matches to ${OUTPUT_FILE}`
  );
}

main().catch((err) => {
  console.error('Failed to fetch match data:', err.message);
  process.exit(1);
});
