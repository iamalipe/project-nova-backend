import fs from 'fs';
import path from 'path';
import { Prisma } from '../prisma-generated/client';
import { db, dbConnect, dbDisconnect } from '../services/prisma.service';

// # Export max 10,000 records per table (fast and lightweight for testing)
// npx tsx scripts/export-db-to-json.ts --limit 10000
// # Full export of all 90M+ database records to disk
// npm run db:export

/**
 * CLI Options:
 * --limit <number>  : Max records to export per collection (useful for quick testing / small export)
 * --batch <number>  : Batch size for cursor pagination (default: 10000)
 */
const args = process.argv.slice(2);

let maxLimitPerTable: number | null = null;
const limitIdx = args.findIndex((a) => a === '--limit' || a === '-l');
if (limitIdx !== -1 && args[limitIdx + 1]) {
  maxLimitPerTable = parseInt(args[limitIdx + 1], 10);
}

let BATCH_SIZE = 10000;
const batchIdx = args.findIndex((a) => a === '--batch' || a === '-b');
if (batchIdx !== -1 && args[batchIdx + 1]) {
  BATCH_SIZE = parseInt(args[batchIdx + 1], 10);
}

/**
 * Maps Prisma ModelName (PascalCase) to MongoDB Collection Name (plural snake_case)
 */
function modelNameToCollection(modelName: string): string {
  const customMap: Record<string, string> = {
    McpOAuthClient: 'mcp_oauth_clients',
    McpOAuthCode: 'mcp_oauth_codes',
    CountryState: 'country_states',
    UserSession: 'user_sessions',
    SellItem: 'sell_items',
    Subcategory: 'subcategories',
    Category: 'categories',
    Country: 'countries',
    Product: 'products',
    Sell: 'sells',
    Stock: 'stocks',
    Store: 'stores',
    User: 'users',
  };

  if (customMap[modelName]) {
    return customMap[modelName];
  }

  const snake = modelName.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();

  if (snake.endsWith('y')) {
    return snake.slice(0, -1) + 'ies';
  }
  return snake + 's';
}

function modelNameToDelegateKey(modelName: string): string {
  return modelName.charAt(0).toLowerCase() + modelName.slice(1);
}

/**
 * Recursively cleans Prisma objects (Decimal, BigInt, Date) for JSON serialization
 */
function sanitizeData(val: any): any {
  if (val === null || val === undefined) {
    return val;
  }
  if (typeof val === 'bigint') {
    return Number(val);
  }
  if (typeof val === 'object') {
    if (val && typeof val.toNumber === 'function') {
      return val.toNumber();
    }
    if (val instanceof Date) {
      return val.toISOString();
    }
    if (Array.isArray(val)) {
      return val.map(sanitizeData);
    }
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(val)) {
      sanitized[key] = sanitizeData(value);
    }
    return sanitized;
  }
  return val;
}

async function exportDatabaseToJson() {
  console.log('==================================================');
  console.log('🚀 DB EXPORTER TO JSON (PostgreSQL -> JSON/MongoDB)');
  console.log('==================================================');
  if (maxLimitPerTable) {
    console.log(
      `⚠️ Limit enabled: exporting max ${maxLimitPerTable.toLocaleString()} records per table.`,
    );
  } else {
    console.log(`ℹ️ Full export mode (no row limit per table).`);
  }
  console.log(
    `ℹ️ Batch size: ${BATCH_SIZE.toLocaleString()} rows per cursor query.`,
  );

  await dbConnect();

  const outputDir = path.join(__dirname, '../exports/json');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const modelNames = Object.keys(
    Prisma.ModelName,
  ) as (keyof typeof Prisma.ModelName)[];
  const summary: Record<
    string,
    {
      exportedCount: number;
      collection: string;
      jsonFile: string;
      jsonlFile: string;
    }
  > = {};
  const consolidatedSample: Record<string, any> = {};

  console.log(`\n📋 Found ${modelNames.length} models to export.\n`);

  for (const modelName of modelNames) {
    const collectionName = modelNameToCollection(modelName);
    const delegateKey = modelNameToDelegateKey(modelName);
    const delegate = (db as any)[delegateKey];

    if (!delegate || typeof delegate.findMany !== 'function') {
      console.warn(
        `⚠️ No query delegate found for model '${modelName}' (key: '${delegateKey}')`,
      );
      continue;
    }

    try {
      console.log(
        `⏳ [${modelName}] Exporting to collection '${collectionName}'...`,
      );

      const jsonFilePath = path.join(outputDir, `${collectionName}.json`);
      const jsonlFilePath = path.join(outputDir, `${collectionName}.jsonl`);

      const jsonStream = fs.createWriteStream(jsonFilePath, {
        encoding: 'utf-8',
      });
      const jsonlStream = fs.createWriteStream(jsonlFilePath, {
        encoding: 'utf-8',
      });

      jsonStream.write('[\n');

      let exportedCount = 0;
      let lastId: string | null = null;
      let isFirstRecord = true;
      const sampleRecords: any[] = [];

      while (true) {
        if (maxLimitPerTable && exportedCount >= maxLimitPerTable) {
          break;
        }

        const fetchLimit = maxLimitPerTable
          ? Math.min(BATCH_SIZE, maxLimitPerTable - exportedCount)
          : BATCH_SIZE;

        const queryOpts: any = {
          take: fetchLimit,
          orderBy: { id: 'asc' },
        };

        if (lastId) {
          queryOpts.cursor = { id: lastId };
          queryOpts.skip = 1;
        }

        const batch: any[] = await delegate.findMany(queryOpts);
        if (!batch || batch.length === 0) break;

        const sanitizedBatch = sanitizeData(batch);

        for (const record of sanitizedBatch) {
          // Write JSON
          if (!isFirstRecord) {
            jsonStream.write(',\n');
          } else {
            isFirstRecord = false;
          }
          jsonStream.write(JSON.stringify(record, null, 2));

          // Write JSONL
          jsonlStream.write(JSON.stringify(record) + '\n');

          // Keep a sample for consolidated preview file (up to 500 items per collection)
          if (sampleRecords.length < 500) {
            sampleRecords.push(record);
          }
        }

        exportedCount += batch.length;
        lastId = batch[batch.length - 1].id;

        if (maxLimitPerTable) {
          const pct = ((exportedCount / maxLimitPerTable) * 100).toFixed(1);
          process.stdout.write(
            `   └─ Exported ${exportedCount.toLocaleString()} / ${maxLimitPerTable.toLocaleString()} (${pct}%)\r`,
          );
        } else {
          process.stdout.write(
            `   └─ Exported ${exportedCount.toLocaleString()} records...\r`,
          );
        }
      }

      jsonStream.write('\n]');
      jsonStream.end();
      jsonlStream.end();

      console.log(
        `\n ✅ Done: exported ${exportedCount.toLocaleString()} records to '${collectionName}.json' and '${collectionName}.jsonl'`,
      );

      consolidatedSample[collectionName] = sampleRecords;

      summary[modelName] = {
        exportedCount,
        collection: collectionName,
        jsonFile: `exports/json/${collectionName}.json`,
        jsonlFile: `exports/json/${collectionName}.jsonl`,
      };
    } catch (err) {
      console.error(`\n ❌ Failed to export ${modelName}:`, err);
    }
  }

  // Consolidated JSON sample file
  const consolidatedFilePath = path.join(outputDir, 'all_database_export.json');
  fs.writeFileSync(
    consolidatedFilePath,
    JSON.stringify(consolidatedSample, null, 2),
    'utf-8',
  );

  // Manifest JSON file
  const manifest = {
    exportedAt: new Date().toISOString(),
    totalModels: Object.keys(summary).length,
    totalRecordsExported: Object.values(summary).reduce(
      (acc, curr) => acc + curr.exportedCount,
      0,
    ),
    maxLimitPerTable: maxLimitPerTable || 'NONE (Full Export)',
    collections: summary,
  };

  const manifestPath = path.join(outputDir, 'export_manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

  console.log('\n==================================================');
  console.log('🎉 EXPORT COMPLETED SUCCESSFULLY!');
  console.log(`📁 Files saved in: ${outputDir}`);
  console.log(
    `📊 Total Records Exported: ${manifest.totalRecordsExported.toLocaleString()}`,
  );
  console.log('==================================================\n');

  await dbDisconnect();
  process.exit(0);
}

exportDatabaseToJson().catch(async (err) => {
  console.error('Fatal export error:', err);
  await dbDisconnect();
  process.exit(1);
});
