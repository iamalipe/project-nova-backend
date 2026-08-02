import { db, dbConnect, dbDisconnect } from '../services/prisma.service';
import { logger } from '../utils/logger';

const PRICE_BRACKETS = [
  { minPrice: 0, maxPrice: 50, minQty: 1000, maxQty: 1500 },
  { minPrice: 51, maxPrice: 100, minQty: 800, maxQty: 1200 },
  { minPrice: 101, maxPrice: 250, minQty: 600, maxQty: 1000 },
  { minPrice: 251, maxPrice: 500, minQty: 400, maxQty: 800 },
  { minPrice: 501, maxPrice: 750, minQty: 200, maxQty: 600 },
  { minPrice: 751, maxPrice: 1000, minQty: 300, maxQty: 400 },
  { minPrice: 1001, maxPrice: 1300, minQty: 150, maxQty: 300 },
  { minPrice: 1301, maxPrice: 1700, minQty: 100, maxQty: 200 },
  { minPrice: 1701, maxPrice: 2100, minQty: 50, maxQty: 100 },
  { minPrice: 2101, maxPrice: 90000, minQty: 10, maxQty: 50 },
];

async function seedStoreStock() {
  logger.info('Deleting existing store stock...');
  await db.stock.deleteMany();

  logger.info('Fetching all stores...');
  const stores = await db.store.findMany();

  logger.info('Fetching all products...');
  const products = await db.product.findMany();

  if (stores.length === 0 || products.length === 0) {
    logger.warn('No stores or products found to seed stock.');
    return;
  }

  // productsMin is 50% of total products
  const productsMin = Math.floor(products.length * 0.5);
  const productsMax = products.length;

  const stocksToCreate: {
    storeId: string;
    productId: string;
    quantity: number;
    minThreshold: number;
  }[] = [];

  logger.info('Generating store stock records based on price brackets...');

  for (const store of stores) {
    // Select a random count of products for this store (between 50% and 100% of total products)
    const count =
      Math.floor(Math.random() * (productsMax - productsMin + 1)) + productsMin;

    // Shuffle to select `count` random unique products for this store
    const shuffledProducts = [...products];
    for (let i = shuffledProducts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledProducts[i], shuffledProducts[j]] = [
        shuffledProducts[j],
        shuffledProducts[i],
      ];
    }
    const storeProducts = shuffledProducts.slice(0, count);

    for (const product of storeProducts) {
      const price = Number(product.mop ?? product.mrp);

      // Find matching price bracket
      const bracket =
        PRICE_BRACKETS.find(
          (b) => price >= b.minPrice && price <= b.maxPrice,
        ) ?? PRICE_BRACKETS[PRICE_BRACKETS.length - 1];

      // Random stock quantity within bracket limits
      const quantity =
        Math.floor(Math.random() * (bracket.maxQty - bracket.minQty + 1)) +
        bracket.minQty;

      const minThreshold = Math.max(5, Math.floor(quantity * 0.1));

      stocksToCreate.push({
        storeId: store.id,
        productId: product.id,
        quantity,
        minThreshold,
      });
    }
  }

  // Batch insert into database in chunks of 1000
  const chunkSize = 1000;
  for (let i = 0; i < stocksToCreate.length; i += chunkSize) {
    const chunk = stocksToCreate.slice(i, i + chunkSize);
    await db.stock.createMany({
      data: chunk,
    });
  }

  logger.info(
    `Successfully seeded ${stocksToCreate.length} stock records across ${stores.length} stores!`,
  );
}

async function seed() {
  await dbConnect();
  logger.info('Starting database seeding...');

  await seedStoreStock();

  logger.info('Database seeding completed successfully!');
  await dbDisconnect();
}

seed().catch(async (e) => {
  logger.error('Database seeding failed:', e);
  await dbDisconnect();
  process.exit(1);
});
