const express = require('express');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

const API_KEY = process.env.API_TOKEN;
const API_HOST = 'api-football-v3.p.rapidapi.com';

app.get('/player-photo/:fixtureId/:playerName', async (req, res) => {
  const { fixtureId, playerName } = req.params;

  try {
    const r = await fetch(
      `https://${API_HOST}/fixtures/players?fixture=${fixtureId}`,
      {
        headers: {
          'X-RapidAPI-Key': API_KEY,
          'X-RapidAPI-Host': API_HOST
        }
      }
    );

    const data = await r.json();
    const teams = data.response || [];

    let photo = null;

    for (const team of teams) {
      for (const p of team.players) {
        if (
          p.player.name.toLowerCase().includes(playerName.toLowerCase())
        ) {
          photo = p.player.photo;
          break;
        }
      }
      if (photo) break;
    }

    if (!photo) {
      return res.status(404).send('Player not found');
    }

    const img = await fetch(photo);
    res.setHeader('Content-Type', 'image/png');
    img.body.pipe(res);

  } catch (e) {
    console.error(e);
    res.status(500).send('Error');
  }
});

app.listen(PORT, () => {
  console.log('✅ Fixture player photo proxy running');
});