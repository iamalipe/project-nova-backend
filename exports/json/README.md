# Database JSON Exports

This directory contains exported data from PostgreSQL via Prisma for testing with alternative databases such as MongoDB.

## Export Files Overview

1. **Individual Formatted JSON Files (`<collection_name>.json`)**
   - Standard JSON arrays (`[ { ... }, { ... } ]`) with formatting (2-space indentation).
   - Ideal for inspection, REST API mocks, or importing via Node.js scripts.

2. **Newline-Delimited JSON Files (`<collection_name>.jsonl`)**
   - One JSON object per line.
   - Optimized for direct import with `mongoimport`.

3. **Consolidated Master Export (`all_database_export.json`)**
   - Keyed by collection name: `{ "users": [...], "products": [...], ... }`.

4. **Export Manifest (`export_manifest.json`)**
   - Contains export timestamps, total counts, and file locations.

---

## How to Import into MongoDB

### Option A: Using `mongoimport` CLI (Recommended)

Run the following commands in your terminal (replace `nova_db` with your target MongoDB database name):

```bash
# Import all collections using mongoimport
mongoimport --db nova_db --collection users --file exports/json/users.jsonl
mongoimport --db nova_db --collection products --file exports/json/products.jsonl
mongoimport --db nova_db --collection stores --file exports/json/stores.jsonl
mongoimport --db nova_db --collection sells --file exports/json/sells.jsonl
mongoimport --db nova_db --collection sell_items --file exports/json/sell_items.jsonl
mongoimport --db nova_db --collection stocks --file exports/json/stocks.jsonl
mongoimport --db nova_db --collection categories --file exports/json/categories.jsonl
mongoimport --db nova_db --collection subcategories --file exports/json/subcategories.jsonl
mongoimport --db nova_db --collection countries --file exports/json/countries.jsonl
mongoimport --db nova_db --collection country_states --file exports/json/country_states.jsonl
mongoimport --db nova_db --collection user_sessions --file exports/json/user_sessions.jsonl
mongoimport --db nova_db --collection mcp_oauth_clients --file exports/json/mcp_oauth_clients.jsonl
mongoimport --db nova_db --collection mcp_oauth_codes --file exports/json/mcp_oauth_codes.jsonl
```

### Option B: Using Node.js & MongoDB Native Driver

If you have `mongodb` installed (`npm install mongodb`), you can seed your database programmatically:

```typescript
import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = 'nova_db';

async function seedMongo() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db(DB_NAME);

  const manifest = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'export_manifest.json'), 'utf-8')
  );

  for (const [modelName, info] of Object.entries(manifest.collections)) {
    const filePath = path.join(__dirname, '..', info.jsonFile);
    if (!fs.existsSync(filePath)) continue;

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (data.length === 0) continue;

    const collection = db.collection(info.collection);
    await collection.deleteMany({}); // Optional: clear existing
    await collection.insertMany(data);
    console.log(`Inserted ${data.length} documents into '${info.collection}'`);
  }

  await client.close();
  console.log('Seeding complete!');
}

seedMongo();
```

---

## How to Re-Run the Export

You can re-run the export script anytime using `npm`:

```bash
# Run full export of all records across all tables
npm run db:export

# Export with max record limit per table (great for fast dev/testing)
npx tsx scripts/export-db-to-json.ts --limit 5000

# Export with custom batch size
npx tsx scripts/export-db-to-json.ts --batch 20000
```
