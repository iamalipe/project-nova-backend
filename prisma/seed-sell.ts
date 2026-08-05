import dayjs from 'dayjs';
import { db, dbConnect, dbDisconnect } from '../services/prisma.service';
import { logger } from '../utils/logger';

// How to generate sell data
// 1. single state at a time
// 2. pick consurrent 100 to 1000 users at a time of that state
// 3. pick 1 user view there salary/12, we get there monthly income
// 4. find how much they can spend min/max for purchase in a month
// 5. find how many times they can go to store (min 4, max 30).
// 6. now ramdomly split there monthly spend into each store visit purchase amount
// 7. when they visite store calculate that based on some set of rules
// 8. generate sell cart based on there purchase power, select min 1 max 10 product
// 9. add discount min 0, max 30% that product allowed
// 10. add sell data

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
  monday: {
    weight: 1.0,
    time: standardTimeSlots,
  },
  tuesday: {
    weight: 1.0,
    time: standardTimeSlots,
  },
  wednesday: {
    weight: 1.0,
    time: standardTimeSlots,
  },
  thursday: {
    weight: 1.1,
    time: standardTimeSlots,
  },
  friday: {
    weight: 1.4,
    time: standardTimeSlots,
  },
  saturday: {
    weight: 1.8,
    time: standardTimeSlots,
  },
  sunday: {
    weight: 1.5,
    time: standardTimeSlots,
  },
};

const generatePurchaseTime = (
  monthStart: string,
  monthEnd: string,
  numberOfPurchase: number,
): string[] => {
  if (numberOfPurchase <= 0) return [];

  const startDate = dayjs(monthStart).startOf('day');
  const endDate = dayjs(monthEnd).endOf('day');

  if (!startDate.isValid() || !endDate.isValid()) {
    throw new Error('Invalid monthStart or monthEnd date string provided.');
  }

  interface TimeCandidate {
    date: dayjs.Dayjs;
    startTime: string;
    endTime: string;
    weight: number;
  }

  const candidates: TimeCandidate[] = [];
  let currentDate = startDate;

  // 1. Build weighted candidate pool for every time slot on every day in the date range
  while (currentDate.isBefore(endDate) || currentDate.isSame(endDate, 'day')) {
    const dayName = currentDate
      .format('dddd')
      .toLowerCase() as keyof typeof weekSellConfig;
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

  if (candidates.length === 0) return [];

  const totalWeight = candidates.reduce((sum, c) => sum + c.weight, 0);
  const purchaseDateAndTime: string[] = [];

  // 2. Select numberOfPurchase dates based on weighted probability
  for (let i = 0; i < numberOfPurchase; i++) {
    let randomWeight = Math.random() * totalWeight;
    let selectedCandidate = candidates[0];

    for (const candidate of candidates) {
      if (randomWeight < candidate.weight) {
        selectedCandidate = candidate;
        break;
      }
      randomWeight -= candidate.weight;
    }

    // 3. Generate random time within selected slot
    const [startHour, startMin] = selectedCandidate.startTime
      .split(':')
      .map(Number);
    const [endHour, endMin] = selectedCandidate.endTime.split(':').map(Number);

    const startTotalMinutes = startHour * 60 + startMin;
    const endTotalMinutes = endHour * 60 + endMin;
    const chosenMinutes = randomInt(startTotalMinutes, endTotalMinutes);

    const hour = Math.floor(chosenMinutes / 60);
    const minute = chosenMinutes % 60;
    const second = randomInt(0, 59);

    const purchaseTime = selectedCandidate.date
      .hour(hour)
      .minute(minute)
      .second(second)
      .millisecond(0);

    purchaseDateAndTime.push(purchaseTime.toISOString());
  }

  // 4. Sort chronologically
  purchaseDateAndTime.sort((a, b) => dayjs(a).valueOf() - dayjs(b).valueOf());

  return purchaseDateAndTime;
};

function randomPercentage(value: number, minP: number, maxP: number): number {
  // Ensure min is always less than max, even if arguments are swapped
  const min = Math.min(minP, maxP);
  const max = Math.max(minP, maxP);

  // Generate a random number between min and max
  const randomPct = Math.random() * (max - min) + min;

  // Return the calculated percentage of the value
  return value * (randomPct / 100);
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function splitRandom(amount: number, count: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [amount];

  // 1. Generate random weights for each split
  const weights = Array.from({ length: count }, () => Math.random());

  // 2. Calculate the total of all weights
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

  const result: number[] = [];
  let sumSoFar = 0;

  // 3. Distribute the amount proportionally based on weights
  for (let i = 0; i < count; i++) {
    // For the very last item, just subtract what we've given out so far
    // from the total amount. This guarantees the array sums exactly to `amount`.
    if (i === count - 1) {
      result.push(amount - sumSoFar);
    } else {
      const share = (weights[i] / totalWeight) * amount;
      result.push(share);
      sumSoFar += share;
    }
  }

  return result;
}

export async function seedSell(countryCode2: string, subdivisionCode: string) {
  logger.info('Deleting existing sell items and sales...');
  await db.sellItem.deleteMany();
  await db.sell.deleteMany();
  const monthStart = dayjs('2026-01-15').startOf('month').toISOString();
  const monthEnd = dayjs('2026-01-15').endOf('month').toISOString();
  const countryData = await db.country.findFirst({
    where: {
      code2: countryCode2,
    },
  });
  if (!countryData) return;
  const stateData = await db.countryState.findFirst({
    where: {
      countryId: countryData.id,
      subdivisionCode: subdivisionCode,
    },
  });
  if (!stateData) return;

  logger.info('Fetching all products...');
  const products = await db.product.findMany({
    select: {
      id: true,
      mop: true,
      mrp: true,
    },
  });
  if (products.length === 0) {
    logger.warn('No products found to generate sell data.');
    return;
  }
  const staffMembers = await db.user.findMany({
    where: { role: 'STAFF' },
    select: { id: true },
  });

  const storeData = await db.store.findMany({
    where: {
      countryId: countryData.id,
      stateId: stateData.id,
    },
    select: {
      id: true,
    },
  });

  const users = await db.user.findMany({
    where: {
      countryId: countryData.id,
      stateId: stateData.id,
      role: 'CUSTOMER',
    },
    select: {
      id: true,
      salary: true,
    },
    take: 5,
  });
  logger.info(users.length);

  const sellUser = users.map((u) => {
    const salary = Number(u.salary || 0);
    const salaryPerMonth = salary / 12;
    const monthlySpend = randomPercentage(salaryPerMonth, 40, 95);
    const visitCount = randomInt(4, 30);
    const split = splitRandom(monthlySpend, visitCount);

    const eachBuy = split.map((eb) => {
      const cartItemCount = randomInt(1, 10);
      const cartItemSpend = splitRandom(eb, cartItemCount);
      const buyProducts: { productId: string; qty: number }[] = [];

      cartItemSpend.forEach((ex) => {
        // 1. Filter matching products for any valid quantity (1 to 10)
        const matchingOptions: { productId: string; qty: number }[] = [];

        for (const p of products) {
          const mop = Number(p.mop);
          const mrp = Number(p.mrp);
          for (let qty = 1; qty <= 10; qty++) {
            if (mop * qty <= ex && mrp * qty >= ex) {
              matchingOptions.push({ productId: p.id, qty });
            }
          }
        }

        // 2. Pick a random matching product option if available
        if (matchingOptions.length > 0) {
          const chosen =
            matchingOptions[randomInt(0, matchingOptions.length - 1)];
          buyProducts.push(chosen);
        }
      });
      const dateTime = generatePurchaseTime(monthStart, monthEnd, 1);
      const storeId = storeData[randomInt(0, storeData.length - 1)]?.id;
      return { buyProducts, dateTime, storeId };
    });

    return {
      userId: u.id,
      eachBuy,
    };
  });

  console.dir(sellUser[0], { depth: null });
  // const states = await db.countryState.findMany();

  let totalSellsSeeded = 0;
  let totalSellItemsSeeded = 0;

  // for (const state of states) {
  // 1. Single state at a time
  // const stores = await db.store.findMany({
  //   where: { stateId: state.id },
  //   select: { id: true },
  // });

  // if (stores.length === 0) {
  //   continue;
  // }

  // const staffMembers = await db.user.findMany({
  //   where: { stateId: state.id, role: Role.STAFF },
  //   select: { id: true },
  // });

  // if (staffMembers.length === 0) {
  //   continue;
  // }

  // 2. Pick concurrent 100 to 1000 users at a time of that state
  // const userBatchSize = Math.floor(Math.random() * (1000 - 100 + 1)) + 100;
  // const customers = await db.user.findMany({
  //   where: { stateId: state.id, role: Role.CUSTOMER },
  //   select: { id: true, salary: true },
  //   take: userBatchSize,
  // });

  // if (customers.length === 0) {
  //   continue;
  // }

  // const sellsToCreate: any[] = [];
  // const sellItemsToCreate: any[] = [];

  // for (const customer of customers) {
  //   // 3. Pick 1 user view salary/12 -> monthly income
  //   const annualSalary = Number(customer.salary ?? 50000);
  //   const monthlyIncome = annualSalary / 12;

  //   // 4. Find how much they can spend min/max for purchase in a month (10% to 35% of monthly income)
  //   const minSpend = monthlyIncome * 0.10;
  //   const maxSpend = monthlyIncome * 0.35;
  //   const monthlySpend = minSpend + Math.random() * (maxSpend - minSpend);

  //   // 5. How many times they can go to store (min 4, max 30)
  //   const visitCount = Math.floor(Math.random() * (30 - 4 + 1)) + 4;

  //   // 6. Randomly split monthly spend into each store visit purchase amount
  //   const rawWeights = Array.from({ length: visitCount }, () => Math.random() + 0.1);
  //   const totalWeight = rawWeights.reduce((sum, w) => sum + w, 0);
  //   const visitAmounts = rawWeights.map((w) => (w / totalWeight) * monthlySpend);

  //   // 7. Store visit calculation
  //   for (let i = 0; i < visitCount; i++) {
  //     const targetVisitAmount = visitAmounts[i];
  //     const store = stores[Math.floor(Math.random() * stores.length)];
  //     const staff = staffMembers[Math.floor(Math.random() * staffMembers.length)];

  //     // Random transaction date in the past 30 days
  //     const daysAgo = Math.floor(Math.random() * 30);
  //     const transactionDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

  //     // 8. Generate sell cart based on purchase power, select min 1 max 10 product
  //     const cartItemCount = Math.floor(Math.random() * (10 - 1 + 1)) + 1;
  //     const targetPerItemAmount = targetVisitAmount / cartItemCount;

  //     // Select cartItemCount random products
  //     const cartProducts: typeof products = [];
  //     for (let k = 0; k < cartItemCount; k++) {
  //       const randomProduct = products[Math.floor(Math.random() * products.length)];
  //       cartProducts.push(randomProduct);
  //     }

  //     const sellId = crypto.randomUUID();
  //     let cartTotal = 0;

  //     for (const product of cartProducts) {
  //       const mop = Number(product.mop ?? product.mrp);

  //       // 9. Add discount min 0, max 30% allowed for that product
  //       const discountPct = Math.random() * 0.30;
  //       const unitPriceAfterDiscount = mop * (1 - discountPct);

  //       // Determine quantity based on target item budget
  //       const quantity = Math.max(
  //         1,
  //         Math.min(5, Math.floor(targetPerItemAmount / (mop || 1)))
  //       ) || 1;

  //       const itemFinalPrice = Number((unitPriceAfterDiscount * quantity).toFixed(2));
  //       cartTotal += itemFinalPrice;

  //       sellItemsToCreate.push({
  //         id: crypto.randomUUID(),
  //         sellId,
  //         productId: product.id,
  //         quantity,
  //         finalPrice: itemFinalPrice,
  //       });
  //     }

  //     // 10. Add sell data
  //     sellsToCreate.push({
  //       id: sellId,
  //       storeId: store.id,
  //       customerId: customer.id,
  //       staffId: staff.id,
  //       finalSellPrice: Number(cartTotal.toFixed(2)),
  //       transactionDate,
  //     });
  //   }
  // }

  // Batch insert sells and sellItems in chunks
  //   const sellChunkSize = 1000;
  //   for (let i = 0; i < sellsToCreate.length; i += sellChunkSize) {
  //     const chunk = sellsToCreate.slice(i, i + sellChunkSize);
  //     await db.sell.createMany({ data: chunk });
  //   }

  //   const itemChunkSize = 2500;
  //   for (let i = 0; i < sellItemsToCreate.length; i += itemChunkSize) {
  //     const chunk = sellItemsToCreate.slice(i, i + itemChunkSize);
  //     await db.sellItem.createMany({ data: chunk });
  //   }

  //   totalSellsSeeded += sellsToCreate.length;
  //   totalSellItemsSeeded += sellItemsToCreate.length;
  // }

  logger.info(
    `Successfully seeded ${totalSellsSeeded} sales transactions with ${totalSellItemsSeeded} line items across states!`,
  );
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
