const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
} as const;

type LogLevel = keyof typeof LOG_LEVELS;

const currentLevel: LogLevel = __DEV__ ? 'debug' : 'warn';

const prefix = '[VibeRadar]';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

export const logger = {
  debug: (tag: string, message: string, data?: Record<string, unknown>) => {
    if (shouldLog('debug')) {
      console.log(`${prefix}[${tag}] ${message}`, data ?? '');
    }
  },
  info: (tag: string, message: string, data?: Record<string, unknown>) => {
    if (shouldLog('info')) {
      console.info(`${prefix}[${tag}] ${message}`, data ?? '');
    }
  },
  warn: (tag: string, message: string, data?: Record<string, unknown>) => {
    if (shouldLog('warn')) {
      console.warn(`${prefix}[${tag}] ${message}`, data ?? '');
    }
  },
  error: (tag: string, message: string, error?: Error, data?: Record<string, unknown>) => {
    if (shouldLog('error')) {
      console.error(`${prefix}[${tag}] ${message}`, error?.message ?? '', data ?? '');
    }
  },
};