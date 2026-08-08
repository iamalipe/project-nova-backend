import { db } from '../../services/prisma.service';
import { cacheGet, cacheSet } from '../../services/cache.service';

export const getKpiSummary = async () => {
  const cacheKey = 'kpi:summary:global';
  try {
    const cached = await cacheGet<any>(cacheKey);
    if (cached) {
      return cached;
    }
  } catch (e) {
    // Ignore cache lookup error
  }

  // Execute queries in parallel for maximum performance
  const [
    salesAgg,
    totalSalesCount,
    cartAgg,
    salesList,
    stockAgg,
    totalStockItems,
    lowStockCount,
    outOfStockCount,
    stocksWithProducts,
    productCount,
    categoryCount,
    subcategoryCount,
    productPriceAgg,
    userCount,
    customerCount,
    staffCount,
    salaryAgg,
    userRolesGroup,
    storeCount,
    countryCount,
    stateCount,
    productsWithSubcat,
  ] = await Promise.all([
    // Sales
    db.sell.aggregate({ _sum: { finalSellPrice: true } }),
    db.sell.count(),
    db.sellItem.aggregate({ _sum: { quantity: true } }),
    db.sell.findMany({
      take: 10,
      orderBy: { transactionDate: 'desc' },
      select: {
        id: true,
        finalSellPrice: true,
        transactionDate: true,
        createdAt: true,
        store: { select: { id: true, name: true } },
        customer: { select: { id: true, firstName: true, lastName: true } },
        staff: { select: { id: true, firstName: true, lastName: true } },
        cart: { select: { id: true, quantity: true } },
      },
    }),

    // Stock
    db.stock.aggregate({ _sum: { quantity: true } }),
    db.stock.count(),
    db.stock.count({ where: { quantity: { lte: 10, gt: 0 } } }),
    db.stock.count({ where: { quantity: 0 } }),
    db.stock.findMany({
      select: {
        id: true,
        quantity: true,
        minThreshold: true,
        product: { select: { id: true, name: true, mrp: true, mop: true } },
        store: { select: { id: true, name: true } },
      },
    }),

    // Products & Categories
    db.product.count(),
    db.category.count(),
    db.subcategory.count(),
    db.product.aggregate({
      _avg: { mrp: true, mop: true },
      _sum: { mrp: true, mop: true },
    }),

    // Users
    db.user.count(),
    db.user.count({ where: { role: 'CUSTOMER' } }),
    db.user.count({ where: { role: { in: ['STAFF', 'STORE_MANAGER', 'SUPERUSER'] } } }),
    db.user.aggregate({ _sum: { salary: true } }),
    db.user.groupBy({ by: ['role'], _count: { id: true } }),

    // Outlets & Geographics
    db.store.count(),
    db.country.count(),
    db.countryState.count(),
    db.product.findMany({
      select: {
        id: true,
        name: true,
        subcategory: {
          select: {
            id: true,
            name: true,
            category: { select: { id: true, name: true } },
          },
        },
      },
    }),
  ]);

  // Process Sales Data
  const totalRevenue = Number(salesAgg._sum.finalSellPrice || 0);
  const averageOrderValue = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;
  const totalItemsSold = Number(cartAgg._sum.quantity || 0);

  const formattedRecentSales = salesList.map((s: any) => ({
    id: s.id,
    store: s.store,
    customer: s.customer,
    staff: s.staff,
    itemCount: s.cart.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0),
    finalSellPrice: Number(s.finalSellPrice || 0),
    transactionDate: s.transactionDate ? s.transactionDate.toISOString() : s.createdAt.toISOString(),
  }));

  // Sales by Store calculation
  const storeSalesMap = new Map<string, number>();
  salesList.forEach((s: any) => {
    const storeName = s.store?.name || 'Unknown Store';
    storeSalesMap.set(storeName, (storeSalesMap.get(storeName) || 0) + Number(s.finalSellPrice || 0));
  });
  const salesByStore = Array.from(storeSalesMap.entries()).map(([name, revenue]) => ({ name, revenue }));

  // Process Stock Data
  const totalStockQuantity = Number(stockAgg._sum.quantity || 0);
  let totalStockValuation = 0;
  const lowStockList: any[] = [];

  stocksWithProducts.forEach((s: any) => {
    const unitPrice = Number(s.product?.mop || s.product?.mrp || 0);
    totalStockValuation += (s.quantity || 0) * unitPrice;

    if (s.quantity <= (s.minThreshold ?? 10)) {
      lowStockList.push({
        id: s.id,
        productName: s.product?.name || 'Unknown Product',
        storeName: s.store?.name || 'Global',
        quantity: s.quantity,
        minThreshold: s.minThreshold ?? 10,
        status: s.quantity === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
      });
    }
  });

  const healthyStockCount = Math.max(0, totalStockItems - lowStockCount - outOfStockCount);
  const stockHealthRate = totalStockItems > 0 ? Math.round((healthyStockCount / totalStockItems) * 100) : 100;

  // Process Catalog Data
  const avgMrp = Number(productPriceAgg._avg.mrp || 0);
  const avgMop = Number(productPriceAgg._avg.mop || 0);
  const totalCatalogWorth = Number(productPriceAgg._sum.mop || productPriceAgg._sum.mrp || 0);
  const avgDiscountPercentage = avgMrp > 0 ? Math.max(0, Math.round(((avgMrp - avgMop) / avgMrp) * 100)) : 0;

  // Products per Category Map
  const categoryMap = new Map<string, number>();
  productsWithSubcat.forEach((p: any) => {
    const catName = p.subcategory?.category?.name || 'Uncategorized';
    categoryMap.set(catName, (categoryMap.get(catName) || 0) + 1);
  });
  const productsPerCategory = Array.from(categoryMap.entries()).map(([name, count]) => ({ name, count }));

  // Process Users Data
  const totalStaffSalaries = Number(salaryAgg._sum.salary || 0);
  const userRoleDistribution = userRolesGroup.map((r: any) => ({
    name: r.role.replace('_', ' '),
    count: r._count.id,
  }));

  const responseObj = {
    sales: {
      totalRevenue,
      totalSalesCount,
      averageOrderValue,
      totalItemsSold,
      salesByStore,
      recentSales: formattedRecentSales,
    },
    stock: {
      totalStockQuantity,
      totalStockItems,
      totalStockValuation,
      healthyStockCount,
      lowStockCount,
      outOfStockCount,
      stockHealthRate,
      lowStockList: lowStockList.slice(0, 10),
    },
    catalog: {
      totalProducts: productCount,
      totalCategories: categoryCount,
      totalSubcategories: subcategoryCount,
      avgMrp,
      avgMop,
      totalCatalogWorth,
      avgDiscountPercentage,
      productsPerCategory,
    },
    users: {
      totalUsers: userCount,
      customerCount,
      staffCount,
      totalStaffSalaries,
      userRoleDistribution,
    },
    outlets: {
      totalStores: storeCount,
      totalCountries: countryCount,
      totalStates: stateCount,
    },
  };

  try {
    await cacheSet(cacheKey, responseObj, 15); // Cache for 15 seconds
  } catch (e) {
    // Ignore cache write failure
  }

  return responseObj;
};

export default {
  getKpiSummary,
};
