export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

export class Logger {
  private static getTimestamp(): string {
    return new Date().toISOString();
  }

  private static format(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
    const metaStr = meta ? ` | Meta: ${JSON.stringify(meta)}` : "";
    return `[${this.getTimestamp()}] [${level}] ${message}${metaStr}`;
  }

  public static debug(message: string, meta?: Record<string, unknown>): void {
    if (process.env.NODE_ENV !== "production") {
      console.debug(this.format(LogLevel.DEBUG, message, meta));
    }
  }

  public static info(message: string, meta?: Record<string, unknown>): void {
    console.info(this.format(LogLevel.INFO, message, meta));
  }

  public static warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(this.format(LogLevel.WARN, message, meta));
  }

  public static error(message: string, error?: Error | unknown, meta?: Record<string, unknown>): void {
    const errorDetails = error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error;
    const combinedMeta = { ...meta, error: errorDetails };
    console.error(this.format(LogLevel.ERROR, message, combinedMeta));
  }
}
