import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

const API_KEY = process.env.API_TOKEN;

// health check
app.get("/", (req, res) => {
  res.send("OK - API is alive");
});

// resolver واقعی عکس
app.get("/resolve-player-photo", async (req, res) => {
  const { name, team } = req.query;
  if (!name) return res.status(400).send("Name required");

  try {
    // 1️⃣ سرچ بازیکن
    const searchUrl = `https://apiv3.apifootball.com/?action=get_players&player_name=${encodeURIComponent(
      name
    )}&team_name=${encodeURIComponent(team || "")}&APIkey=${API_KEY}`;

    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    if (!Array.isArray(searchData) || !searchData.length) {
      return res.redirect(
        "https://media.api-sports.io/football/players/0.png"
      );
    }

    const playerId = searchData[0].player_key;

    // 2️⃣ دریافت عکس واقعی
    const imgRes = await fetch(
      `https://media.api-sports.io/football/players/${playerId}.png`
    );

    if (!imgRes.ok) {
      return res.redirect(
        "https://media.api-sports.io/football/players/0.png"
      );
    }

    const buffer = await imgRes.arrayBuffer();

    // 🔥 نقطه مرگ مشکل اینجاست
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.end(Buffer.from(buffer));

  } catch (err) {
    console.error(err);
    res.redirect("https://media.api-sports.io/football/players/0.png");
  }
});

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});