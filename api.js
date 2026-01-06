import express from "express";
import { readDB, writeDB } from "./db.js";

const router = express.Router();

/* دریافت لیست تمامی ویدیوها */
router.get("/videos", async (req, res) => {
  try {
    const data = await readDB(); // اضافه شدن await
    res.json(data || {});
  } catch (error) {
    res.status(500).json({ error: "خطا در خواندن دیتابیس" });
  }
});

/* اضافه کردن ویدیوی جدید */
router.post("/videos", async (req, res) => {
  const { section, category, title, meta, thumb, videoUrl } = req.body;

  // اعتبارسنجی دقیق
  if (!section || !category || !title || !thumb || !videoUrl) {
    return res.status(400).json({ 
      error: "دیتا ناقص است. فیلدهای section, category, title, thumb, videoUrl الزامی هستند." 
    });
  }

  try {
    // ساخت آبجکت ویدیو برای ذخیره در دیتابیس
    const video = {
      section,     // اضافه شد برای دیتابیس
      category,    // اضافه شد برای دیتابیس
      title,
      meta: meta || "",
      thumb,
      videoUrl,
      createdAt: new Date() // استاندارد دیتابیس
    };

    // منطق نقطه زنی: به جای چک کردن وجود دسته، مستقیم در دیتابیس ذخیره می‌کنیم
    // این کار مشکل "یافت نشد" را برای همیشه حل می‌کند
    await writeDB(video); 

    res.json({ 
      success: true, 
      message: "ویدیو با موفقیت در نئون ثبت شد", 
      addedVideo: video 
    });

  } catch (error) {
    console.error("Critical Save Error:", error);
    res.status(500).json({ error: "خطای داخلی سرور در ارتباط با دیتابیس ابری" });
  }
});

export default router;
