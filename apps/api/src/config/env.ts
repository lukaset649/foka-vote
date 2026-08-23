type NodeEnv = 'development' | 'production' | 'test';
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface Env {
  readonly NODE_ENV: NodeEnv;
  readonly PORT: number;
  readonly HOST: string;
  readonly WEB_ORIGIN: string;
  readonly LOG_LEVEL: LogLevel;
  readonly DATABASE_URL: string;
  readonly ADMIN_PASSWORD_HASH: string;
  readonly COOKIE_SECRET: string;
}

function readEnum<T extends string>(name: string, allowed: readonly T[], defaultValue: T): T {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    return defaultValue;
  }
  if (!allowed.includes(raw as T)) {
    throw new Error(
      `Invalid value for environment variable ${name}: "${raw}". Allowed values: ${allowed.join(', ')}.`,
    );
  }
  return raw as T;
}

function readPort(name: string, defaultValue: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    return defaultValue;
  }
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    throw new Error(
      `Invalid value for environment variable ${name}: "${raw}". Expected an integer between 1 and 65535.`,
    );
  }
  return parsed;
}

function readString(name: string, defaultValue: string): string {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    return defaultValue;
  }
  return raw;
}

function readRequiredString(name: string, minLength = 0): string {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    throw new Error(`Missing required environment variable: ${name}.`);
  }
  if (raw.length < minLength) {
    throw new Error(
      `Invalid value for environment variable ${name}: must be at least ${minLength} characters long.`,
    );
  }
  return raw;
}

const NODE_ENV = readEnum<NodeEnv>(
  'NODE_ENV',
  ['development', 'production', 'test'],
  'development',
);

export const env: Env = Object.freeze({
  NODE_ENV,
  PORT: readPort('PORT', 3000),
  HOST: readString('HOST', '127.0.0.1'),
  WEB_ORIGIN: readString('WEB_ORIGIN', 'http://localhost:5173'),
  LOG_LEVEL: readEnum<LogLevel>('LOG_LEVEL', ['debug', 'info', 'warn', 'error'], 'info'),
  DATABASE_URL: readRequiredString('DATABASE_URL'),
  ADMIN_PASSWORD_HASH: readRequiredString('ADMIN_PASSWORD_HASH'),
  COOKIE_SECRET: readRequiredString('COOKIE_SECRET', 32),
});

export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';
