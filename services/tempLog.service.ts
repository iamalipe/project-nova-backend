import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';
import { getUUIDv7 } from '../utils/uuid.utils';

export interface TempLogEntry {
  id: string;
  channel: 'email' | 'sms';
  to: string;
  subject?: string;
  content: string;
  html?: string;
  createdAt: string;
}

const TEMP_DIR = path.join(process.cwd(), 'temp');
const TEMP_LOG_FILE = path.join(TEMP_DIR, 'temp-log.json');
const MAX_ENTRIES = 100;

export const getTempLogs = (): TempLogEntry[] => {
  try {
    if (!fs.existsSync(TEMP_LOG_FILE)) return [];
    return JSON.parse(fs.readFileSync(TEMP_LOG_FILE, 'utf-8'));
  } catch {
    return [];
  }
};

export const recordTempLog = (
  entry: Omit<TempLogEntry, 'id' | 'createdAt'>,
) => {
  try {
    if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
    const logs = getTempLogs();
    logs.unshift({
      ...entry,
      id: getUUIDv7(),
      createdAt: new Date().toISOString(),
    });
    fs.writeFileSync(
      TEMP_LOG_FILE,
      JSON.stringify(logs.slice(0, MAX_ENTRIES), null, 2),
    );
  } catch (err: any) {
    logger.error(err?.message || 'Something wrong in recordTempLog');
  }
};
