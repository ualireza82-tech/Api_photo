import postgres from 'postgres';

/**
 * تنظیمات اتصال به دیتابیس نئون
 * استفاده از ssl: 'require' برای امنیت در محیط Render الزامی است.
 */
const connectionString = 'postgresql://neondb_owner:npg_H9R5MouDUfKP@ep-still-frog-ag4gym2q-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require';
const sql = postgres(connectionString);

/**
 * خواندن تمامی ویدیوها و تبدیل آن‌ها به ساختار مورد نیاز فرانت‌اِند
 */
export async function readDB() {
  try {
    // دریافت تمام ردیف‌ها به ترتیب جدیدترین
    const rows = await sql`SELECT * FROM videos ORDER BY id DESC`;

    // ساختار اولیه مطابق با دیتای ثابت (Static) شما
    const data = {
      home: { latest: [], ucl: [], national: [] },
      leagues: { pl: [], ucl: [], laliga: [] }
    };

    // مپ کردن دیتای جدول به آبجکت نهایی
    rows.forEach(row => {
      const videoItem = {
        title: row.title,
        meta: row.meta || "",
        thumb: row.thumb,
        videoUrl: row.video_url // هماهنگ با ستونی که در SQL ساختیم
      };

      if (row.section === 'home') {
        if (data.home[row.category]) {
          data.home[row.category].push(videoItem);
        }
      } else if (row.section === 'leagues' || row.section === 'league') {
        if (data.leagues[row.category]) {
          data.leagues[row.category].push(videoItem);
        }
      }
    });

    return data;
  } catch (error) {
    console.error("Database Read Error:", error);
    // بازگرداندن ساختار خالی در صورت بروز خطا برای جلوگیری از کرش فرانت‌اِند
    return {
      home: { latest: [], ucl: [], national: [] },
      leagues: { pl: [], ucl: [], laliga: [] }
    };
  }
}

/**
 * ذخیره مستقیم ویدیوی جدید در دیتابیس ابری
 */
export async function writeDB(v) {
  try {
    // درج دیتا با استفاده از Tagged Templates (امنیت در برابر SQL Injection)
    return await sql`
      INSERT INTO videos (section, category, title, meta, thumb, video_url)
      VALUES (${v.section}, ${v.category}, ${v.title}, ${v.meta}, ${v.thumb}, ${v.videoUrl})
    `;
  } catch (error) {
    console.error("Database Write Error:", error);
    throw error;
  }
}
