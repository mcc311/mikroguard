/**
 * Structured logging system
 * Provides consistent logging with context and log levels
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogContext = 'api' | 'cron' | 'auth' | 'routeros' | 'config' | 'wireguard';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: LogContext;
  message: string;
  data?: unknown;
}

class Logger {
  private minLevel: LogLevel;

  constructor() {
    const envLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel | undefined;
    this.minLevel = envLevel || 'info';
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const minLevelIndex = levels.indexOf(this.minLevel);
    const currentLevelIndex = levels.indexOf(level);
    return currentLevelIndex >= minLevelIndex;
  }

  private formatMessage(entry: LogEntry): string {
    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.context}]`;
    return `${prefix} ${entry.message}`;
  }

  private log(level: LogLevel, context: LogContext, message: string, data?: unknown): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      context,
      message,
      data,
    };

    const formatted = this.formatMessage(entry);

    switch (level) {
      case 'error':
        console.error(formatted, data !== undefined ? data : '');
        break;
      case 'warn':
        console.warn(formatted, data !== undefined ? data : '');
        break;
      case 'info':
      case 'debug':
      default:
        console.log(formatted, data !== undefined ? data : '');
        break;
    }
  }

  debug(context: LogContext, message: string, data?: unknown): void {
    this.log('debug', context, message, data);
  }

  info(context: LogContext, message: string, data?: unknown): void {
    this.log('info', context, message, data);
  }

  warn(context: LogContext, message: string, data?: unknown): void {
    this.log('warn', context, message, data);
  }

  error(context: LogContext, message: string, data?: unknown): void {
    this.log('error', context, message, data);
  }
}

export const logger = new Logger();
