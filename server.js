const express = require('express');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

/* Health Check */
app.get('/', (req, res) => {
  res.send('OK - API is alive');
});

/* Player Photo Proxy */
app.get('/player-photo/:id', async (req, res) => {
  const id = req.params.id;

  if (!id || isNaN(id)) {
    return res.status(400).send('Invalid player id');
  }

  const imgUrl = `https://media.api-sports.io/football/players/${id}.png`;

  try {
    const response = await fetch(imgUrl);

    if (!response.ok) {
      return res.status(404).send('Player photo not found');
    }

    res.setHeader('Content-Type', 'image/png');
    response.body.pipe(res);

  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});