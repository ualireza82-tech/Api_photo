import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_TOKEN;

app.get("/", (req, res) => {
  res.send("OK - API is alive");
});

app.get("/resolve-player-photo", async (req, res) => {
  const { name, team } = req.query;
  if (!name) return res.status(400).send("Name required");

  try {
    const url =
      "https://apiv3.apifootball.com/?" +
      `action=get_players` +
      `&player_name=${encodeURIComponent(name)}` +
      `&APIkey=${API_KEY}`;

    const r = await fetch(url);
    const players = await r.json();

    if (!Array.isArray(players) || !players.length) {
      return res.redirect("https://media.api-sports.io/football/players/0.png");
    }

    // 🎯 انتخاب دقیق بازیکن (نقطه مرگ قبلی اینجا بود)
    let candidate = players.find(p =>
      team ? p.team_name?.toLowerCase().includes(team.toLowerCase()) : true
    );

    if (!candidate) candidate = players[0];

    const playerId = candidate.player_key;

    // تست وجود عکس واقعی
    const imgUrl = `https://media.api-sports.io/football/players/${playerId}.png`;
    const imgCheck = await fetch(imgUrl);

    if (!imgCheck.ok) {
      return res.redirect("https://media.api-sports.io/football/players/0.png");
    }

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=604800");
    imgCheck.body.pipe(res);

  } catch (e) {
    console.error("Resolver error:", e);
    res.redirect("https://media.api-sports.io/football/players/0.png");
  }
});

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});