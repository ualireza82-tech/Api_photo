const express = require('express');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// توکن API-Football (فقط روی Render)
const API_KEY = process.env.API_TOKEN;
const API_HOST = 'api-football-v3.p.rapidapi.com';

// cache ساده در حافظه (خیلی مهم)
const photoCache = new Map();

app.get('/player-photo/:playerKey', async (req, res) => {
  const { playerKey } = req.params;

  if (!playerKey) {
    return res.status(400).send('playerKey required');
  }

  try {
    // 1️⃣ اگر قبلاً cache شده
    if (photoCache.has(playerKey)) {
      const cachedUrl = photoCache.get(playerKey);
      const imgRes = await fetch(cachedUrl);
      res.setHeader('Content-Type', 'image/png');
      return imgRes.body.pipe(res);
    }

    // 2️⃣ گرفتن اطلاعات بازیکن از API-Football
    const playerRes = await fetch(
      `https://${API_HOST}/players?id=${playerKey}`,
      {
        headers: {
          'X-RapidAPI-Key': API_KEY,
          'X-RapidAPI-Host': API_HOST
        }
      }
    );

    if (!playerRes.ok) {
      return res.status(404).send('Player not found');
    }

    const playerData = await playerRes.json();
    const player = playerData?.response?.[0]?.player;

    if (!player || !player.photo) {
      return res.status(404).send('Photo not available');
    }

    const photoUrl = player.photo;

    // 3️⃣ ذخیره در cache
    photoCache.set(playerKey, photoUrl);

    // 4️⃣ گرفتن عکس و ارسال به فرانت
    const imgRes = await fetch(photoUrl);

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');

    imgRes.body.pipe(res);

  } catch (err) {
    console.error('PHOTO PROXY ERROR:', err);
    res.status(500).send('Internal error');
  }
});

app.listen(PORT, () => {
  console.log('✅ Player photo proxy running on port', PORT);
});