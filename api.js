import express from "express";
import { readDB, writeDB } from "./db.js";

const router = express.Router();

router.get("/videos", (req, res) => {
  res.json(readDB());
});

router.post("/videos", (req, res) => {
  const { section, category, title, meta, thumb } = req.body;

  if (!section || !category || !title || !thumb) {
    return res.status(400).json({ error: "Invalid data" });
  }

  const db = readDB();

  const video = {
    title,
    meta: meta || "",
    thumb,
    createdAt: Date.now()
  };

  if (section === "home") {
    db.home[category].unshift(video);
  }

  if (section === "league") {
    db.leagues[category].unshift(video);
  }

  writeDB(db);
  res.json({ success: true });
});

export default router;