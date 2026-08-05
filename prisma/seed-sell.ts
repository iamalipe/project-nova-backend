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
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday',
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

// Build monthly candidate pool ONCE for fast sampling
function buildMonthlyTimePool(monthStart: string, monthEnd: string) {
  const startDate = dayjs(monthStart).startOf('day');
  const endDate = dayjs(monthEnd).endOf('day');
  let currentDate = startDate;

  const candidates: {
    date: dayjs.Dayjs;
    startTime: string;
    endTime: string;
    weight: number;
  }[] = [];

  while (currentDate.isBefore(endDate) || currentDate.isSame(endDate, 'day')) {
    const dayName = currentDate
      .format('dddd')
      .toLowerCase() as keyof WeekSellConfig;
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
  return { candidates, totalWeight };
}

function getRandomPurchaseTime(
  pool: ReturnType<typeof buildMonthlyTimePool>,
): string {
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

  const chosenMinutes = randomInt(
    startHour * 60 + startMin,
    endHour * 60 + endMin,
  );
  const hour = Math.floor(chosenMinutes / 60);
  const minute = chosenMinutes % 60;
  const second = randomInt(0, 59);

  return selected.date.hour(hour).minute(minute).second(second).toISOString();
}

export async function seedSell(countryCode2: string, subdivisionCode: string) {
  logger.info('Deleting existing sell items and sales...');
  await db.sellItem.deleteMany();
  await db.sell.deleteMany();

  const monthStart = dayjs('2026-01-15').startOf('month').toISOString();
  const monthEnd = dayjs('2026-01-15').endOf('month').toISOString();
  const timePool = buildMonthlyTimePool(monthStart, monthEnd);

  const countryData = await db.country.findFirst({
    where: { code2: countryCode2 },
  });
  if (!countryData) return;

  const stateData = await db.countryState.findFirst({
    where: { countryId: countryData.id, subdivisionCode },
  });
  if (!stateData) return;

  logger.info('Fetching products and stores...');
  const products = await db.product.findMany({
    select: { id: true, mop: true, mrp: true },
  });
  if (products.length === 0) {
    logger.warn('No products found to generate sell data.');
    return;
  }

  const stores = await db.store.findMany({
    where: { countryId: countryData.id, stateId: stateData.id },
    select: { id: true, staffIds: true, managerId: true },
  });
  if (stores.length === 0) {
    logger.warn('No stores found for selected state.');
    return;
  }

  const staffUsers = await db.user.findMany({
    where: { countryId: countryData.id, stateId: stateData.id, role: 'STAFF' },
    select: { id: true },
  });
  const fallbackStaffId = staffUsers[0]?.id;

  const customers = await db.user.findMany({
    where: {
      countryId: countryData.id,
      stateId: stateData.id,
      role: 'CUSTOMER',
    },
    select: { id: true, salary: true },
    take: 100,
  });

  logger.info(`Generating transactions for ${customers.length} customers...`);

  for (const customer of customers) {
    const salary = Number(customer.salary || 40000);
    const monthlySpend = randomPercentage(salary / 12, 30, 80);
    const visitCount = randomInt(4, 20);
    const visitsSpend = splitRandom(monthlySpend, visitCount);

    for (const visitSpend of visitsSpend) {
      const store = stores[randomInt(0, stores.length - 1)];
      const staffId =
        store.staffIds && store.staffIds.length > 0
          ? store.staffIds[randomInt(0, store.staffIds.length - 1)]
          : fallbackStaffId;

      if (!staffId) continue;

      const cartItemCount = randomInt(1, 8);
      const itemTargetSpends = splitRandom(visitSpend, cartItemCount);

      const cartItems: {
        productId: string;
        quantity: number;
        finalPrice: number;
      }[] = [];
      let totalSellPrice = 0;

      for (const targetSpend of itemTargetSpends) {
        // Fast O(1) random product pick
        const product = products[randomInt(0, products.length - 1)];
        const mop = Number(product.mop);
        const qty = Math.max(
          1,
          Math.min(10, Math.round(targetSpend / (mop || 10))),
        );
        const itemPrice = mop * qty;

        cartItems.push({
          productId: product.id,
          quantity: qty,
          finalPrice: itemPrice,
        });
        totalSellPrice += itemPrice;
      }

      const transactionDate = getRandomPurchaseTime(timePool);

      // Create sell record with items
      await db.sell.create({
        data: {
          customerId: customer.id,
          storeId: store.id,
          staffId,
          transactionDate,
          finalSellPrice: totalSellPrice,
          cart: {
            createMany: {
              data: cartItems,
            },
          },
        },
      });
    }
  }

  logger.info('Successfully seeded all sales transactions!');
}

async function seed() {
  await dbConnect();
  logger.info('Starting database seeding...');
  await seedSell('US', 'NY');
  logger.info('Database seeding completed successfully!');
  await dbDisconnect();
}

seed().catch(async (e) => {
  logger.error('Database seeding failed:', e);
  await dbDisconnect();
  process.exit(1);
});
