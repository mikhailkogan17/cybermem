const crypto = require("crypto");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const TOKEN = "sk-staging-verified-key-vf7";

// Hash token using same PBKDF2 as Auth Sidecar
function hashToken(token) {
  return new Promise((resolve, reject) => {
    const salt = crypto
      .createHash("sha256")
      .update("cybermem-salt-v1")
      .digest("hex")
      .slice(0, 16);
    crypto.pbkdf2(token, salt, 100000, 64, "sha512", (err, key) => {
      if (err) reject(err);
      else resolve(key.toString("hex"));
    });
  });
}

const args = process.argv.slice(2);
const dbArg = args.indexOf("--db");
const DB_PATH =
  dbArg !== -1 && args[dbArg + 1] ? args[dbArg + 1] : "/data/openmemory.sqlite";

async function seed() {
  console.log(`Seeding token: ${TOKEN} to ${DB_PATH}`);
  const hash = await hashToken(TOKEN);
  console.log(`FULL_HASH:${hash}`);

  const db = new sqlite3.Database(DB_PATH);

  db.serialize(() => {
    // Ensure table exists (just in case)
    db.run(`
      CREATE TABLE IF NOT EXISTS access_keys (
        key_id TEXT PRIMARY KEY,
        key_hash TEXT UNIQUE NOT NULL,
        user_id TEXT NOT NULL,
        name TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Hotfix: Add missing column if not exists
    db.run(
      "ALTER TABLE access_keys ADD COLUMN last_used_at DATETIME",
      (err) => {
        if (!err) console.log("Fixed schema: Added last_used_at");
      },
    );

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO access_keys (id, key_hash, user_id, name)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run("vf7", hash, "admin", "Staging Verified Key", (err) => {
      if (err) {
        console.error("Error inserting key:", err.message);
      } else {
        console.log("✅ Key seeded successfully!");
      }
    });

    stmt.finalize();
  });

  db.close();
}

seed();
