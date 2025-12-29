const express = require('express');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const API_TOKEN = process.env.API_TOKEN;

// مسیر cache دائمی
const CACHE_FILE = path.join(__dirname, 'cache.json');

// لود cache
let cache = {};
if (fs.existsSync(CACHE_FILE)) {
  try {
    cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  } catch {
    cache = {};
  }
}

// ذخیره cache روی دیسک
function saveCache() {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

// health check
app.get('/', (req, res) => {
  res.send('OK - API is alive');
});

// resolve + proxy (production)
app.get('/resolve-player-photo', async (req, res) => {
  const { name, team } = req.query;

  if (!name) {
    return res.status(400).send('Player name is required');
  }

  const key = `${name}|${team || ''}`.toLowerCase();

  // 1️⃣ cache hit
  if (cache[key]) {
    return res.redirect(
      `https://media.api-sports.io/football/players/${cache[key]}.png`
    );
  }

  try {
    // 2️⃣ search player
    const url = new URL('https://v3.football.api-sports.io/players');
    url.searchParams.append('search', name);
    if (team) url.searchParams.append('team', team);

    const response = await fetch(url.toString(), {
      headers: {
        'x-apisports-key': API_TOKEN
      }
    });

    const json = await response.json();

    if (!json.response || json.response.length === 0) {
      return res.redirect(
        'https://media.api-sports.io/football/players/0.png'
      );
    }

    // 3️⃣ انتخاب دقیق‌ترین match
    const best = json.response.find(p =>
      p.player.name.toLowerCase().includes(name.toLowerCase())
    ) || json.response[0];

    const playerId = best.player.id;

    // 4️⃣ save cache
    cache[key] = playerId;
    saveCache();

    // 5️⃣ redirect to image
    res.redirect(
      `https://media.api-sports.io/football/players/${playerId}.png`
    );

  } catch (err) {
    console.error('Resolve error:', err);
    res.redirect(
      'https://media.api-sports.io/football/players/0.png'
    );
  }
});

app.listen(PORT, () => {
  console.log(`✅ Production server running on port ${PORT}`);
});