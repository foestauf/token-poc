import { watch, existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { EventEmitter } from 'events';

export interface TokenRefreshEvent {
  timestamp: number;
  previousExp?: number;
  newExp?: number;
  tokenPath: string;
}

export class TokenWatcher extends EventEmitter {
  private watcher: ReturnType<typeof watch> | null = null;
  private lastToken: string | null = null;
  private tokenPath: string;

  constructor(tokenPath: string = '/var/run/secrets/tokens/token') {
    super();
    this.tokenPath = tokenPath;
  }

  async start(): Promise<void> {
    if (!existsSync(this.tokenPath)) {
      this.emit('error', new Error(`Token file not found at ${this.tokenPath}`));
      return;
    }

    this.lastToken = await this.readCurrentToken();

    this.watcher = watch(this.tokenPath, async (eventType) => {
      if (eventType === 'change') {
        try {
          const newToken = await this.readCurrentToken();
          if (newToken && newToken !== this.lastToken) {
            const event: TokenRefreshEvent = {
              timestamp: Date.now(),
              tokenPath: this.tokenPath,
            };

            try {
              const { decodeJwt } = await import('./decode-jwt.js');
              if (this.lastToken) {
                event.previousExp = decodeJwt(this.lastToken).payload.exp;
              }
              event.newExp = decodeJwt(newToken).payload.exp;
            } catch {
              // Decoding is best-effort
            }

            this.lastToken = newToken;
            this.emit('refresh', event);
          }
        } catch (err) {
          this.emit('error', err);
        }
      }
    });

    this.watcher.on('error', (err) => this.emit('error', err));
  }

  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }

  private async readCurrentToken(): Promise<string | null> {
    try {
      const content = await readFile(this.tokenPath, 'utf-8');
      return content.trim();
    } catch {
      return null;
    }
  }
}
