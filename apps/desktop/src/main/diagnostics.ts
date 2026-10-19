export interface DiagnosticBundle {
  timestamp: string;
  appVersion: string;
  osVersion: string;
  electronVersion?: string;
  nodeVersion?: string;
  recentErrorCodes: string[];
  sanitizedLogs: string[];
  performanceStats: {
    memoryRssMb: number;
    heapUsedMb: number;
  };
}

export class DiagnosticReporter {
  private recentErrors: { code: string; timestamp: string }[] = [];
  private logBuffer: string[] = [];
  private maxLogs = 50;

  public recordError(code: string, message: string): void {
    this.recentErrors.push({ code, timestamp: new Date().toISOString() });
    this.log(`[ERROR][${code}] ${message}`);
  }

  public log(line: string): void {
    const sanitized = this.redactSensitiveData(line);
    this.logBuffer.push(`[${new Date().toISOString()}] ${sanitized}`);
    if (this.logBuffer.length > this.maxLogs) {
      this.logBuffer.shift();
    }
  }

  public generateBundle(appVersion = '0.1.0'): DiagnosticBundle {
    const memory = typeof process !== 'undefined' ? process.memoryUsage() : { rss: 0, heapUsed: 0 };
    return {
      timestamp: new Date().toISOString(),
      appVersion,
      osVersion: 'Windows 10 x64',
      recentErrorCodes: this.recentErrors.map((e) => e.code),
      sanitizedLogs: [...this.logBuffer],
      performanceStats: {
        memoryRssMb: Math.round(memory.rss / (1024 * 1024)),
        heapUsedMb: Math.round(memory.heapUsed / (1024 * 1024)),
      },
    };
  }

  private redactSensitiveData(text: string): string {
    // Redact Bearer tokens, OpenAI keys (sk-...), Gemini keys, Anthropic keys
    return text
      .replace(/sk-[a-zA-Z0-9_-]{20,}/g, 'sk-[REDACTED]')
      .replace(/AIza[a-zA-Z0-9_-]{35}/g, 'AIza[REDACTED]')
      .replace(/Bearer\s+[a-zA-Z0-9._-]+/gi, 'Bearer [REDACTED]')
      .replace(/[A-Z]:\\[Users|home]\\[^\\]+/gi, 'C:\\Users\\[REDACTED_USER]');
  }
}
