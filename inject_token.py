import hashlib
import os
import sqlite3

# Token: staging-verified-key-vf7
# Algo: PBKDF2-HMAC-SHA512
# Salt: 16 chars hex of sha256("cybermem-salt-v1")
# Iterations: 100000
# Keylen: 64

salt_base = "cybermem-salt-v1"
salt = hashlib.sha256(salt_base.encode()).hexdigest()[:16]
token = "staging-verified-key-vf7"

print(f"Generating hash for token: {token}")
print(f"Salt: {salt}")

key_hash = hashlib.pbkdf2_hmac(
    "sha512", token.encode("utf-8"), salt.encode("utf-8"), 100000, 64
).hex()

# Expand path to data-staging dir
db_path = os.path.expanduser("~/.cybermem/data-staging/openmemory.sqlite")
print(f"Connecting to DB: {db_path}")

if not os.path.exists(db_path):
    print("Error: DB file not found. Ensure containers are started.")
    exit(1)

conn = sqlite3.connect(db_path)
c = conn.cursor()

try:
    # Ensure table exists (if sidecar didn't run yet, though it should have)
    c.execute("""
        CREATE TABLE IF NOT EXISTS access_keys (
          id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
          key_hash TEXT NOT NULL,
          name TEXT DEFAULT 'default',
          user_id TEXT DEFAULT 'default',
          created_at TEXT DEFAULT (datetime('now')),
          last_used_at TEXT,
          is_active INTEGER DEFAULT 1
        );
    """)

    # Clean previous verification key
    c.execute("DELETE FROM access_keys WHERE name='staging-verifier'")

    # Insert new key
    c.execute(
        """
        INSERT INTO access_keys (id, key_hash, name, user_id, is_active)
        VALUES (?, ?, ?, ?, 1)
    """,
        ("staging-id-123", key_hash, "staging-verifier", "admin"),
    )

    conn.commit()
    print("Token inserted successfully.")
except Exception as e:
    print(f"Error: {e}")
finally:
    conn.close()
