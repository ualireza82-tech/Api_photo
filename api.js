import express from "express";
import { readDB, writeDB } from "../utils/db.js"; // مسیر ایمپورت رو چک کن

const router = express.Router();

router.get("/videos", (req, res) => {
  res.json(readDB());
});

router.post("/videos", (req, res) => {
  // 1. دریافت videoUrl
  const { section, category, title, meta, thumb, videoUrl } = req.body;

  // 2. چک کردن اینکه videoUrl خالی نباشد
  if (!section || !category || !title || !thumb || !videoUrl) {
    return res.status(400).json({ error: "Invalid data. videoUrl is missing!" });
  }

  const db = readDB();

  const video = {
    title,
    meta: meta || "",
    thumb,
    videoUrl, // 3. ذخیره لینک ویدیو در دیتابیس
    createdAt: Date.now()
  };

  // لاجیک ذخیره
  if (section === "home") {
     if(db.home[category]) db.home[category].unshift(video);
  } else if (section === "leagues") { // دقت کن در بادی reqbin چی میفرستی (league یا leagues)
     if(db.leagues[category]) db.leagues[category].unshift(video);
  }

  writeDB(db);
  res.json({ success: true });
});

export default router;
