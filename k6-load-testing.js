import { check, group, sleep } from 'k6';
import http from 'k6/http';

// Test configuration
export const options = {
  stages: [
    { duration: '10s', target: 50 }, // Ramp up to 50 users
    { duration: '20s', target: 50 }, // Stay at 50 users
    { duration: '10s', target: 100 }, // Ramp up to 100 users
    { duration: '5s', target: 500 },
    { duration: '20s', target: 500 }, // Stay at 100 users
    { duration: '10s', target: 0 }, // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.01'], // Request failure rate should be less than 1%
  },
};

// const BASE_URL = 'http://localhost:3000';
const BASE_URL = 'https://api.template.abhiseck.dev';

// Setup phase: Register a user and get the auth cookie
export function setup() {
  const uniqueId = Math.random().toString(36).substring(7);
  const email = `k6_user_${uniqueId}@example.com`;
  const password = 'password123';

  const payload = JSON.stringify({
    email,
    firstName: 'K6',
    lastName: 'LoadTester',
    password,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(`${BASE_URL}/api/auth/register`, payload, params);

  check(res, {
    'setup: user registered successfully': (r) => r.status === 201,
  });

  if (res.status !== 201) {
    console.error('Setup failed: Unable to register user');
    console.log(res.body);
    return { authCookie: null };
  }

  // Extract the 'access' cookie from the response
  // k6 response.cookies is an object where keys are cookie names,
  // and values are arrays of cookie objects.
  const accessCookie = res.cookies['access']
    ? res.cookies['access'][0].value
    : null;
  console.log(`Access Cookie for ${email}:`, accessCookie);

  return { authCookie: accessCookie };
}

export default function (data) {
  // Ensure we have a valid auth cookie
  if (!data.authCookie) {
    console.error('No auth cookie available, skipping iteration');
    sleep(1);
    return;
  }

  // Set the cookie for the current VU
  const jar = http.cookieJar();
  jar.set(BASE_URL, 'access', data.authCookie);

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // 1. Create Product
  let productId;
  group('Create Product', () => {
    // Generate random product data
    const payload = JSON.stringify({
      name: `K6 Product ${Math.random().toString(36).substring(7)}`,
      description: 'A product created during k6 load testing',
      category: 'Load Test Category',
      price: Math.floor(Math.random() * 100) + 1,
    });

    const res = http.post(`${BASE_URL}/api/product`, payload, params);

    check(res, {
      'create: status is 201': (r) => r.status === 201,
      'create: has id': (r) => r.json('data._id') !== undefined,
    });

    if (res.status === 201) {
      productId = res.json('data._id');
    }
  });

  sleep(1);

  // 2. Get All Products
  group('Get All Products', () => {
    const res = http.get(`${BASE_URL}/api/product`, params);
    check(res, {
      'getAll: status is 200': (r) => r.status === 200,
      'getAll: returns array': (r) => Array.isArray(r.json('data')),
    });
  });

  sleep(1);

  if (productId) {
    // 3. Get Single Product
    group('Get Single Product', () => {
      const res = http.get(`${BASE_URL}/api/product/${productId}`, params);
      check(res, {
        'getOne: status is 200': (r) => r.status === 200,
        'getOne: id matches': (r) => r.json('data._id') === productId,
      });
    });

    sleep(1);

    // 4. Update Product
    group('Update Product', () => {
      const payload = JSON.stringify({
        price: Math.floor(Math.random() * 200) + 100,
      });
      const res = http.put(
        `${BASE_URL}/api/product/${productId}`,
        payload,
        params,
      );
      check(res, {
        'update: status is 200': (r) => r.status === 200,
        'update: price updated': (r) => r.json('data.price') !== undefined,
      });
    });

    sleep(1);

    // 5. Delete Product
    group('Delete Product', () => {
      const res = http.del(
        `${BASE_URL}/api/product/${productId}`,
        null,
        params,
      );
      check(res, {
        'delete: status is 200': (r) => r.status === 200,
      });
    });
  }
}
