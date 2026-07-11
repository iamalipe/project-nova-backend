import 'dotenv/config';

export const PORT = process.env.PORT || 3000;
export const DATABASE_URL = process.env.DATABASE_URL || '';

// JWT
export const JWT_SECRET = process.env.JWT_SECRET || '';
export const JWT_EXPIRY = process.env.JWT_EXPIRY || '30min';

// METRICS
const _METRICS_SERVER_ENABLED = process.env.METRICS_SERVER_ENABLED || 'false';
export const METRICS_SERVER_ENABLED = _METRICS_SERVER_ENABLED === 'true';
export const METRICS_SERVER_PORT = process.env.METRICS_SERVER_PORT || 9100;
export const METRICS_SERVER_USERNAME =
  process.env.METRICS_SERVER_USERNAME || '';
export const METRICS_SERVER_PASSWORD =
  process.env.METRICS_SERVER_PASSWORD || '';

// SWAGGER
export const SWAGGER_USERNAME = process.env.SWAGGER_USERNAME || 'admin';
export const SWAGGER_PASSWORD = process.env.SWAGGER_PASSWORD || 'admin';
export const API_DOCS_UI: 'SCALAR' | 'SWAGGER' =
  (process.env.API_DOCS_UI as 'SCALAR' | 'SWAGGER') || 'SCALAR';

// CORS WHITELISTED DOMAINS
export const FRONTEND_URL = process.env.FRONTEND_URL || '';
export const WHITELISTED_DOMAINS = process.env.WHITELISTED_DOMAINS || '';
const WHITELISTED_DOMAINS_ARRAY_TEMP = WHITELISTED_DOMAINS.split(',') || [];
export const WHITELISTED_DOMAINS_ARRAY = [
  ...WHITELISTED_DOMAINS_ARRAY_TEMP,
  FRONTEND_URL,
];
export const CORS_OPTIONS = {
  origin: WHITELISTED_DOMAINS_ARRAY,
  methods: 'GET,PUT,POST,DELETE',
  credentials: true,
};

// AWS
export const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';
export const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || '';
export const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || '';
export const AWS_S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || '';

// CACHE
export const REDIS_URL = process.env.REDIS_URL || '';
export const CACHE_PROVIDER: 'KEYV' | 'REDIS' =
  process.env.CACHE_PROVIDER || ('KEYV' as any);

// AI
export const GOOGLE_GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY || '';

// EMAIL
export const _EMAIL_ENABLE = process.env.EMAIL_ENABLE || 'false';
export const EMAIL_ENABLE = _EMAIL_ENABLE === 'true';

// SMS
export const _SMS_ENABLE = process.env.SMS_ENABLE || 'false';
export const SMS_ENABLE = _SMS_ENABLE === 'true';

// SENDGRID
export const SENDGRID_EMAIL_FROM = process.env.SENDGRID_EMAIL_FROM || '';
export const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';

// TWILIO
export const TWILIO_NUMBER = process.env.TWILIO_NUMBER || '';
export const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
export const TWILIO_API_KEY_SID = process.env.TWILIO_API_KEY_SID || '';
export const TWILIO_API_KEY_SECRET = process.env.TWILIO_API_KEY_SECRET || '';

// SOCKET
const _ENABLE_SOCKET = process.env.ENABLE_SOCKET || 'false';
export const ENABLE_SOCKET = _ENABLE_SOCKET === 'true';
