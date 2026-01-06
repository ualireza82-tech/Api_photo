import express from "express"; // اصلاح شد: i کوچک
// اگر فایل db.js و api.js در یک پوشه هستند، این مسیر درست است
import { readDB, writeDB } from "./db.js";

const router = express.Router();

/* دریافت لیست تمامی ویدیوها */
router.get("/videos", (req, res) => {
  try {
    const data = readDB();
    res.json(data || {});
  } catch (error) {
    res.status(500).json({ error: "خطا در خواندن دیتابیس" });
  }
});

/* اضافه کردن ویدیوی جدید */
router.post("/videos", (req, res) => {
  const { section, category, title, meta, thumb, videoUrl } = req.body;

  // اعتبارسنجی دقیق
  if (!section || !category || !title || !thumb || !videoUrl) {
    return res.status(400).json({ 
      error: "دیتا ناقص است. فیلدهای section, category, title, thumb, videoUrl الزامی هستند." 
    });
  }

  try {
    const db = readDB();

    const video = {
      title,
      meta: meta || "",
      thumb,
      videoUrl,
      createdAt: Date.now()
    };

    // هندل کردن بخش Home
    if (section === "home") {
      if (db.home && db.home[category]) {
        db.home[category].unshift(video);
      } else {
        return res.status(400).json({ error: `دسته بندی ${category} در بخش home یافت نشد.` });
      }
    } 
    // هندل کردن بخش لیگ‌ها
    else if (section === "league" || section === "leagues") {
      if (db.leagues && db.leagues[category]) {
        db.leagues[category].unshift(video);
      } else {
        return res.status(400).json({ error: `لیگ ${category} در لیست لیگ‌ها وجود ندارد.` });
      }
    } 
    else {
      return res.status(400).json({ error: "بخش ارسال شده (section) نامعتبر است." });
    }

    writeDB(db);
    res.json({ success: true, message: "ویدیو با موفقیت ثبت شد", addedVideo: video });

  } catch (error) {
    console.error("Critical Save Error:", error);
    res.status(500).json({ error: "خطای داخلی سرور در هنگام ذخیره فایل" });
  }
});

export default router;
