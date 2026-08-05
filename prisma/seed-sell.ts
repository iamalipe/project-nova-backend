import { randomUUID } from 'crypto';
import dayjs from 'dayjs';
import { db, dbConnect, dbDisconnect } from '../services/prisma.service';
import { logger } from '../utils/logger';

interface TimeSlotConfig {
  startTime: string;
  endTime: string;
  weight: number;
}

interface DaySellConfig {
  weight: number;
  time: TimeSlotConfig[];
}

type WeekSellConfig = Record<
  'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday',
  DaySellConfig
>;

const standardTimeSlots: TimeSlotConfig[] = [
  { startTime: '00:00', endTime: '03:59', weight: 0.1 },
  { startTime: '04:00', endTime: '07:59', weight: 0.3 },
  { startTime: '08:00', endTime: '11:59', weight: 1.0 },
  { startTime: '12:00', endTime: '15:59', weight: 1.5 },
  { startTime: '16:00', endTime: '19:59', weight: 2.0 },
  { startTime: '20:00', endTime: '23:59', weight: 0.8 },
];

const weekSellConfig: WeekSellConfig = {
  monday: { weight: 1.0, time: standardTimeSlots },
  tuesday: { weight: 1.0, time: standardTimeSlots },
  wednesday: { weight: 1.0, time: standardTimeSlots },
  thursday: { weight: 1.1, time: standardTimeSlots },
  friday: { weight: 1.4, time: standardTimeSlots },
  saturday: { weight: 1.8, time: standardTimeSlots },
  sunday: { weight: 1.5, time: standardTimeSlots },
};

function randomPercentage(value: number, minP: number, maxP: number): number {
  const min = Math.min(minP, maxP);
  const max = Math.max(minP, maxP);
  return value * ((Math.random() * (max - min) + min) / 100);
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function splitRandom(amount: number, count: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [amount];

  const weights = Array.from({ length: count }, () => Math.random());
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  const result: number[] = [];
  let sumSoFar = 0;

  for (let i = 0; i < count; i++) {
    if (i === count - 1) {
      result.push(Math.max(1, amount - sumSoFar));
    } else {
      const share = (weights[i] / totalWeight) * amount;
      result.push(share);
      sumSoFar += share;
    }
  }

  return result;
}

/**
 * Builds weighted monthly time-slot pool ONCE for fast sampling across any target month.
 */
function buildMonthlyTimePool(yearMonth: string) {
  const startDate = dayjs(`${yearMonth}-01`).startOf('month');
  const endDate = startDate.endOf('month');
  let currentDate = startDate;

  const candidates: { date: dayjs.Dayjs; startTime: string; endTime: string; weight: number }[] = [];

  while (currentDate.isBefore(endDate) || currentDate.isSame(endDate, 'day')) {
    const dayName = currentDate.format('dddd').toLowerCase() as keyof WeekSellConfig;
    const dayConfig = weekSellConfig[dayName];

    if (dayConfig) {
      for (const slot of dayConfig.time) {
        const combinedWeight = dayConfig.weight * slot.weight;
        if (combinedWeight > 0) {
          candidates.push({
            date: currentDate,
            startTime: slot.startTime,
            endTime: slot.endTime,
            weight: combinedWeight,
          });
        }
      }
    }
    currentDate = currentDate.add(1, 'day');
  }

  const totalWeight = candidates.reduce((sum, c) => sum + c.weight, 0);
  return { candidates, totalWeight, startDate, endDate };
}

function getRandomPurchaseTime(pool: ReturnType<typeof buildMonthlyTimePool>): string {
  let randomWeight = Math.random() * pool.totalWeight;
  let selected = pool.candidates[0];

  for (const candidate of pool.candidates) {
    if (randomWeight < candidate.weight) {
      selected = candidate;
      break;
    }
    randomWeight -= candidate.weight;
  }

  const [startHour, startMin] = selected.startTime.split(':').map(Number);
  const [endHour, endMin] = selected.endTime.split(':').map(Number);

  const chosenMinutes = randomInt(startHour * 60 + startMin, endHour * 60 + endMin);
  const hour = Math.floor(chosenMinutes / 60);
  const minute = chosenMinutes % 60;
  const second = randomInt(0, 59);

  return selected.date.hour(hour).minute(minute).second(second).toISOString();
}

export interface SeedSellOptions {
  yearMonth?: string;           // Format: "YYYY-MM", e.g. "2026-01" or "2026-02"
  dryRun?: boolean;             // true for simulation report only, false to populate DB
  maxCustomersPerState?: number; // Optional cap per state for testing
  stateFilter?: string;          // Specific state filter e.g. "NY", "US-NY", "California"
}

export async function seedSellAll(options: SeedSellOptions = {}) {
  const yearMonth = options.yearMonth || '2026-01';
  const isDryRun = options.dryRun ?? false;
  const maxCustomersPerState = options.maxCustomersPerState;

  const modeTitle = isDryRun ? 'DRY RUN (Simulation Only)' : 'REAL RUN (Populating Database)';
  logger.info(`=======================================================`);
  logger.info(`Starting Sell Data Generation (State-by-State Sequential)`);
  logger.info(`Mode: ${modeTitle}`);
  logger.info(`Target Month: ${yearMonth}`);
  if (options.stateFilter) {
    logger.info(`State Filter: "${options.stateFilter}"`);
  }
  if (maxCustomersPerState) {
    logger.info(`Customer Limit per State: ${maxCustomersPerState.toLocaleString()}`);
  } else {
    logger.info(`Customer Scope: ALL customers in target state(s)`);
  }
  logger.info(`=======================================================`);

  const timePool = buildMonthlyTimePool(yearMonth);

  // Fetch reference data
  const products = await db.product.findMany({
    select: { id: true, mop: true, mrp: true },
  });
  if (products.length === 0) {
    logger.warn('No products found in database to generate sell data.');
    return;
  }

  const countries = await db.country.findMany({ select: { id: true, name: true, code2: true } });
  const states = await db.countryState.findMany({ select: { id: true, name: true, countryId: true, subdivisionCode: true } });
  const stores = await db.store.findMany({ select: { id: true, countryId: true, stateId: true, staffIds: true, managerId: true } });
  const allStaff = await db.user.findMany({
    where: { role: 'STAFF' },
    select: { id: true, countryId: true, stateId: true },
  });

  const countryMap = new Map(countries.map((c) => [c.id, c]));

  // Apply state filter if specified
  let targetStates = states;
  if (options.stateFilter) {
    const filterRaw = options.stateFilter.trim().toUpperCase();
    targetStates = states.filter((s) => {
      const sub = s.subdivisionCode.toUpperCase();
      const name = s.name.toUpperCase();
      const id = s.id.toUpperCase();
      const country = countryMap.get(s.countryId);
      const fullSub = country ? `${country.code2}-${sub}`.toUpperCase() : '';

      return (
        sub === filterRaw ||
        fullSub === filterRaw ||
        sub.endsWith(`-${filterRaw}`) ||
        filterRaw.endsWith(`-${sub}`) ||
        name.includes(filterRaw) ||
        id === filterRaw
      );
    });

    if (targetStates.length === 0) {
      logger.warn(`No state found matching state filter: "${options.stateFilter}"`);
      return;
    }
  }

  // Group stores & staff by country_state key
  const storeMap = new Map<string, typeof stores>();
  const staffMap = new Map<string, string[]>();

  for (const store of stores) {
    const key = `${store.countryId}_${store.stateId}`;
    if (!storeMap.has(key)) storeMap.set(key, []);
    storeMap.get(key)!.push(store);
  }

  for (const stf of allStaff) {
    if (stf.countryId && stf.stateId) {
      const key = `${stf.countryId}_${stf.stateId}`;
      if (!staffMap.has(key)) staffMap.set(key, []);
      staffMap.get(key)!.push(stf.id);
    }
  }

  if (!isDryRun) {
    // If running for a specific state, delete sales for stores in target states only
    if (options.stateFilter && targetStates.length > 0) {
      const targetStateIds = targetStates.map((s) => s.id);
      const targetStoreIds = stores.filter((st) => targetStateIds.includes(st.stateId)).map((st) => st.id);
      logger.info(`Deleting existing sell records for ${targetStoreIds.length} stores in matching state(s)...`);
      const targetSells = await db.sell.findMany({ where: { storeId: { in: targetStoreIds } }, select: { id: true } });
      const targetSellIds = targetSells.map((s) => s.id);
      if (targetSellIds.length > 0) {
        await db.sellItem.deleteMany({ where: { sellId: { in: targetSellIds } } });
        await db.sell.deleteMany({ where: { id: { in: targetSellIds } } });
      }
    } else {
      logger.info('Deleting existing sell items and sales records from database...');
      await db.sellItem.deleteMany();
      await db.sell.deleteMany();
    }
  }

  let totalSalesCount = 0;
  let totalItemsCount = 0;
  let totalRevenue = 0;
  let totalCustomersProcessed = 0;

  const regionSummary: {
    country: string;
    state: string;
    storesCount: number;
    customersCount: number;
    salesCount: number;
    itemsCount: number;
    revenue: number;
  }[] = [];

  const totalStateCount = targetStates.length;
  let stateIndex = 0;

  // Process STATE BY STATE sequentially
  for (const state of targetStates) {
    stateIndex++;
    const country = countryMap.get(state.countryId);
    if (!country) continue;

    const key = `${country.id}_${state.id}`;
    const stateStores = storeMap.get(key) || [];
    const stateStaff = staffMap.get(key) || [];

    // Skip states with no stores
    if (stateStores.length === 0) continue;

    // Fetch ALL (or capped) customers for THIS state using raw SQL with indices
    const limitClause = maxCustomersPerState ? `LIMIT ${maxCustomersPerState}` : '';
    const stateCustomers = await db.$queryRawUnsafe<
      { id: string; salary: any }[]
    >(`SELECT id, salary FROM "User" WHERE role = 'CUSTOMER'::"Role" AND "countryId" = '${country.id}'::uuid AND "stateId" = '${state.id}'::uuid ${limitClause}`);

    if (stateCustomers.length === 0) continue;

    const stateSalesToCreate: any[] = [];
    const stateItemsToCreate: any[] = [];

    let stateSalesCount = 0;
    let stateItemsCount = 0;
    let stateRevenue = 0;

    for (const customer of stateCustomers) {
      const salary = Number(customer.salary || 40000);
      const monthlySpend = randomPercentage(salary / 12, 30, 80);
      const visitCount = randomInt(4, 20);
      const visitsSpend = splitRandom(monthlySpend, visitCount);

      for (const visitSpend of visitsSpend) {
        const store = stateStores[randomInt(0, stateStores.length - 1)];
        let staffId =
          store.staffIds && store.staffIds.length > 0
            ? store.staffIds[randomInt(0, store.staffIds.length - 1)]
            : stateStaff.length > 0
            ? stateStaff[randomInt(0, stateStaff.length - 1)]
            : store.managerId;

        if (!staffId) continue;

        const sellId = randomUUID();
        const cartItemCount = randomInt(1, 8);
        const itemTargetSpends = splitRandom(visitSpend, cartItemCount);

        let saleTotal = 0;

        for (const targetSpend of itemTargetSpends) {
          const product = products[randomInt(0, products.length - 1)];
          const mop = Number(product.mop);
          const qty = Math.max(1, Math.min(10, Math.round(targetSpend / (mop || 10))));
          const itemPrice = mop * qty;

          saleTotal += itemPrice;
          stateItemsCount++;

          stateItemsToCreate.push({
            sellId,
            productId: product.id,
            quantity: qty,
            finalPrice: itemPrice,
          });
        }

        const transactionDate = getRandomPurchaseTime(timePool);

        stateSalesToCreate.push({
          id: sellId,
          customerId: customer.id,
          storeId: store.id,
          staffId,
          transactionDate,
          finalSellPrice: saleTotal,
        });

        stateSalesCount++;
        stateRevenue += saleTotal;
      }
    }

    // Real Run: Insert this state's data into PostgreSQL immediately and clear memory
    if (!isDryRun && stateSalesToCreate.length > 0) {
      const sellChunkSize = 2000;
      for (let i = 0; i < stateSalesToCreate.length; i += sellChunkSize) {
        await db.sell.createMany({ data: stateSalesToCreate.slice(i, i + sellChunkSize) });
      }

      const itemChunkSize = 5000;
      for (let i = 0; i < stateItemsToCreate.length; i += itemChunkSize) {
        await db.sellItem.createMany({ data: stateItemsToCreate.slice(i, i + itemChunkSize) });
      }
    }

    totalCustomersProcessed += stateCustomers.length;
    totalSalesCount += stateSalesCount;
    totalItemsCount += stateItemsCount;
    totalRevenue += stateRevenue;

    regionSummary.push({
      country: `${country.code2} - ${country.name}`,
      state: state.name,
      storesCount: stateStores.length,
      customersCount: stateCustomers.length,
      salesCount: stateSalesCount,
      itemsCount: stateItemsCount,
      revenue: Math.round(stateRevenue * 100) / 100,
    });

    logger.info(
      `[State ${stateIndex}/${totalStateCount}] ${country.code2} - ${state.name}: ${stateCustomers.length.toLocaleString()} customers -> ${stateSalesCount.toLocaleString()} sales ($${Math.round(stateRevenue).toLocaleString()})`
    );
  }

  // Display Summary Table
  console.log('\n=======================================================');
  console.log(` SUMMARY REPORT (${modeTitle}) - Target Month: ${yearMonth}`);
  console.log('=======================================================');
  console.table(regionSummary.slice(0, 15)); // Show top 15 regions sample
  if (regionSummary.length > 15) {
    console.log(`... and ${regionSummary.length - 15} more regions.`);
  }

  console.log('-------------------------------------------------------');
  console.log(`TOTAL CUSTOMERS PROCESSED    : ${totalCustomersProcessed.toLocaleString()}`);
  console.log(`TOTAL REGIONS PROCESSED      : ${regionSummary.length.toLocaleString()}`);
  console.log(`TOTAL TRANSACTIONS GENERATED : ${totalSalesCount.toLocaleString()}`);
  console.log(`TOTAL CART ITEMS GENERATED   : ${totalItemsCount.toLocaleString()}`);
  console.log(`TOTAL SIMULATED REVENUE ($)  : $${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  console.log('-------------------------------------------------------');

  if (isDryRun) {
    logger.info(`[DRY RUN COMPLETE] Simulation succeeded! No database changes were made.`);
  } else {
    logger.info(`[REAL RUN COMPLETE] Successfully seeded ${totalSalesCount.toLocaleString()} sales transactions into PostgreSQL!`);
  }

  return {
    dryRun: isDryRun,
    yearMonth,
    totalCustomersProcessed,
    totalSalesCount,
    totalItemsCount,
    totalRevenue,
  };
}

async function main() {
  await dbConnect();

  // Parse command line flags
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run') || args.includes('-d');

  const monthMatch = args.find((a) => a.startsWith('--month='));
  const yearMonth = monthMatch ? monthMatch.split('=')[1] : '2026-01';

  const stateMatch = args.find((a) => a.startsWith('--state='));
  const stateFilter = stateMatch ? stateMatch.split('=')[1] : undefined;

  const limitMatch = args.find((a) => a.startsWith('--limit-per-state='));
  const maxCustomersPerState = limitMatch ? parseInt(limitMatch.split('=')[1], 10) : undefined;

  try {
    await seedSellAll({
      yearMonth,
      dryRun: isDryRun,
      maxCustomersPerState,
      stateFilter,
    });
  } catch (err) {
    logger.error('Seeding failed:', err);
  } finally {
    await dbDisconnect();
  }
}

// Execute if run directly from CLI
if (require.main === module) {
  main();
}
