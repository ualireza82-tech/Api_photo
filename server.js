import express from "express";
import cors from "cors";
import { Pool } from "pg";
import http from "http";
import https from "https";
import { v4 as uuidv4 } from "uuid";

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' })); // استاندارد ۲۰۲۶ برای دریافت تصاویر با کیفیت بالا

/* --------------- CONFIG --------------- */
const DATABASE_URL = process.env.DATABASE_URL;
const RETENTION_DAYS = Number(process.env.RETENTION_DAYS || 180);
const ENABLE_SELF_PING = String(process.env.ENABLE_SELF_PING || "true").toLowerCase() === "true";
const SELF_PING_URL = process.env.SELF_PING_URL || "";
const SELF_PING_BASE_MINUTES = Number(process.env.SELF_PING_BASE_MINUTES || 14);

const pool = new Pool({
    connectionString: DATABASE_URL,
    max: Number(process.env.PG_MAX_CLIENTS || 12),
    idleTimeoutMillis: 30000,
});

/* --------------- SCHEMA MIGRATION (PHONE-BASED 2026) --------------- */
const ensureSchema = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS users (  
            phone TEXT PRIMARY KEY, -- شماره تلفن به عنوان کلید اصلی جایگزین ایمیل شد
            password TEXT NOT NULL,  
            first_name TEXT NOT NULL,  
            last_name TEXT,  
            avatar_base64 TEXT,  
            registered_at TIMESTAMPTZ DEFAULT now()  
        );
        CREATE TABLE IF NOT EXISTS messages (
            id UUID PRIMARY KEY,
            text TEXT,
            sender TEXT, -- نام نمایشی ذخیره شده (برای امنیت لایه دوم)
            phone TEXT REFERENCES users(phone), -- ارتباط مستقیم با شماره تلفن کاربر
            "group" TEXT,
            reply_text TEXT,
            image TEXT,
            created_at TIMESTAMPTZ DEFAULT now(),
            deleted BOOLEAN DEFAULT false
        );
        CREATE INDEX IF NOT EXISTS idx_msgs_group ON messages("group");
        CREATE INDEX IF NOT EXISTS idx_msgs_phone ON messages(phone);
    `;
    try {
        await pool.query(query);
        console.log("✅ Schema Synced: Phone-based Authentication Ready.");
    } catch (e) { console.error("❌ Schema Sync Error:", e); }
};

/* --------------- SSE ENGINE --------------- */
let clients = [];
const broadcast = (data) => {
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    clients.forEach(c => {
        try { c.write(payload); } catch (e) { /* اتصال قطع شده */ }
    });
};

/* --------------- ENDPOINTS --------------- */

// ۱. دریافت پیام‌ها با JOIN مویرگی بر اساس شماره تلفن جهت نمایش آواتار
app.get("/messages", async (req, res) => {
    try {
        const group = req.query.group || 'طرفداران بارسلونا';
        const limit = Math.min(1000, Number(req.query.limit || 500));

        const query = `
            SELECT 
                m.id, m.text, m.image, m.reply_text, m.created_at,
                u.phone as sender_phone,
                COALESCE(u.first_name || ' ' || COALESCE(u.last_name, ''), m.sender) as sender_name,
                u.avatar_base64 as avatar
            FROM messages m
            LEFT JOIN users u ON m.phone = u.phone
            WHERE m."group" = $1 AND m.deleted = false
            ORDER BY m.created_at ASC 
            LIMIT $2
        `;
        const result = await pool.query(query, [group, limit]);
        res.json({ ok: true, rows: result.rows });
    } catch (err) {
        res.status(500).json({ ok: false, error: "Database Read Error" });
    }
});

// ۲. ارسال پیام (اتصال خودکار به پروفایل از طریق شماره تلفن)
app.post("/send", async (req, res) => {
    try {
        const { text, phone, group, image, reply_text } = req.body;
        if (!phone) return res.status(400).json({ ok: false, error: "Phone number is required" });
        
        const msgId = uuidv4();

        // ذخیره سازی
        const insertQuery = `
            INSERT INTO messages (id, text, phone, "group", image, reply_text)
            VALUES ($1, $2, $3, $4, $5, $6) 
            RETURNING created_at
        `;
        const dbRes = await pool.query(insertQuery, [msgId, text, phone, group, image, reply_text]);

        // واکشی اطلاعات پروفایل برای پخش زنده (SSE)
        const userRes = await pool.query("SELECT first_name, last_name, avatar_base64 FROM users WHERE phone = $1", [phone]);
        const userData = userRes.rows[0] || { first_name: "کاربر", last_name: "ناشناس", avatar_base64: null };

        const fullMsg = {
            id: msgId,
            text,
            sender_name: `${userData.first_name} ${userData.last_name || ''}`.trim(),
            sender_phone: phone,
            avatar: userData.avatar_base64,
            image,
            reply_text,
            group,
            created_at: dbRes.rows[0].created_at
        };

        broadcast({ type: "message", payload: fullMsg });
        res.json({ ok: true, data: fullMsg });

    } catch (err) {
        console.error("Post /send error:", err);
        res.status(500).json({ ok: false });
    }
});

app.get("/events", (req, res) => {
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" });
    res.write(":\n\n");
    clients.push(res);
    req.on("close", () => clients = clients.filter(c => c !== res));
});

/* --------------- AUTH SECTION (PHONE-BASED) --------------- */
app.post("/auth/login-or-register", async (req, res) => {
    const { phone, password, firstName, lastName, avatarBase64 } = req.body;
    
    if (!phone || !password) return res.status(400).json({ ok: false, error: "شماره تلفن و رمز عبور الزامی است" });

    try {
        const check = await pool.query("SELECT * FROM users WHERE phone = $1", [phone]);
        
        if (check.rowCount > 0) {
            // فرآیند ورود (Login)
            const user = check.rows[0];
            if (user.password !== password) return res.status(401).json({ ok: false, error: "رمز عبور اشتباه است" });
            
            return res.json({ 
                ok: true, 
                user: { 
                    identity: phone, 
                    name: `${user.first_name} ${user.last_name || ''}`.trim(), 
                    avatarBase64: user.avatar_base64 
                } 
            });
        } else {
            // فرآیند ثبت‌نام (Register)
            if (!firstName || !avatarBase64) return res.status(400).json({ ok: false, error: "برای ثبت‌نام مشخصات کامل الزامی است" });
            
            await pool.query(
                "INSERT INTO users (phone, password, first_name, last_name, avatar_base64) VALUES ($1,$2,$3,$4,$5)", 
                [phone, password, firstName, lastName || null, avatarBase64]
            );
            
            res.json({ 
                ok: true, 
                user: { identity: phone, name: firstName, avatarBase64 } 
            });
        }
    } catch (e) { 
        console.error("Auth error:", e);
        res.status(500).json({ ok: false, error: "خطای سرور در احراز هویت" }); 
    }
});

/* --------------- SELF-PING SYSTEM (STABLE 2026) --------------- */
function scheduleSelfPing() {
    if (!ENABLE_SELF_PING || !SELF_PING_URL) return;
    
    // استفاده از setInterval برای دقت بالا در پینگ
    setInterval(() => {
        const protocol = SELF_PING_URL.startsWith('https') ? https : http;
        protocol.get(SELF_PING_URL, (res) => {
            console.log(`📡 Self-Ping Sent: Status ${res.statusCode}`);
        }).on('error', (err) => {
            console.error('⚠️ Self-Ping Failed:', err.message);
        });
    }, SELF_PING_BASE_MINUTES * 60 * 1000);
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    await ensureSchema();
    scheduleSelfPing();
    console.log(`🚀 High-Performance Chat Server (Phone-Based) running on Port ${PORT}`);
});
