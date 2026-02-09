# Utility Scripts

One-off utility scripts for database seeding, data migration, and other administrative tasks.

## Available Utilities

### seed_key.js

Seeds staging authentication keys into the CyberMem database.

```bash
node scripts/utils/seed_key.js --db /path/to/cybermem.sqlite
```

**Usage:**
- Used for setting up staging environments
- Creates pre-defined test tokens with known hashes
- Safe for development/staging only (never use in production)

**Default token:** `sk-staging-verified-key-vf7`
