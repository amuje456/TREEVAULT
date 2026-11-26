import { spawn, execFileSync, type ChildProcessWithoutNullStreams } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

export interface CppResponse {
  ok: boolean;
  errorCode?: string;
  ruleFailed?: string;
  message?: string;
  [key: string]: unknown;
}

class CppBridge {
  private proc: ChildProcessWithoutNullStreams | null = null;
  private rl: readline.Interface | null = null;
  private queue: Promise<void> = Promise.resolve();
  private pendingResolve: ((val: CppResponse) => void) | null = null;
  private pendingReject: ((err: Error) => void) | null = null;
  private pendingTimer: NodeJS.Timeout | null = null;

  private getBinaryPath(): string {
    return path.resolve(process.cwd(), 'cpp-engine', 'treevault_engine');
  }

  private ensureBinaryExists(): string {
    const binPath = this.getBinaryPath();
    if (!fs.existsSync(binPath)) {
      execFileSync('make', ['-C', path.resolve(process.cwd(), 'cpp-engine')], {
        stdio: 'pipe',
        timeout: 30000,
      });
    }
    return binPath;
  }

  private ensureProcess(): void {
    if (this.proc && !this.proc.killed && this.proc.exitCode === null) {
      return;
    }

    const binPath = this.ensureBinaryExists();
    this.proc = spawn(binPath, ['--daemon'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false,
    });

    this.rl = readline.createInterface({
      input: this.proc.stdout,
      crlfDelay: Infinity,
    });

    this.rl.on('line', (line: string) => {
      const resolve = this.pendingResolve;
      const reject = this.pendingReject;
      if (this.pendingTimer) {
        clearTimeout(this.pendingTimer);
        this.pendingTimer = null;
      }
      this.pendingResolve = null;
      this.pendingReject = null;

      if (!resolve || !reject) return;
      try {
        const parsed = JSON.parse(line) as CppResponse;
        resolve(parsed);
      } catch (err) {
        reject(new Error(`Invalid JSON from C++ engine: ${(err as Error).message}`));
      }
    });

    this.proc.on('exit', (code) => {
      if (this.pendingTimer) {
        clearTimeout(this.pendingTimer);
        this.pendingTimer = null;
      }
      const reject = this.pendingReject;
      this.pendingResolve = null;
      this.pendingReject = null;
      this.rl?.close();
      this.rl = null;
      this.proc = null;
      if (reject) {
        reject(new Error(`C++ engine exited unexpectedly with code ${code ?? 'unknown'}`));
      }
    });

    this.proc.on('error', (err) => {
      const reject = this.pendingReject;
      this.pendingResolve = null;
      this.pendingReject = null;
      this.proc = null;
      if (reject) {
        reject(err);
      }
    });
  }

  public execute(command: Record<string, unknown>, timeoutMs = 5000): Promise<CppResponse> {
    const task = this.queue.then(
      () =>
        new Promise<CppResponse>((resolve, reject) => {
          try {
            this.ensureProcess();
          } catch (err) {
            reject(err instanceof Error ? err : new Error(String(err)));
            return;
          }

          if (!this.proc) {
            reject(new Error('Failed to start C++ engine process.'));
            return;
          }

          this.pendingResolve = resolve;
          this.pendingReject = reject;

          this.pendingTimer = setTimeout(() => {
            const rej = this.pendingReject;
            this.pendingResolve = null;
            this.pendingReject = null;
            this.pendingTimer = null;
            if (this.proc) {
              this.proc.kill('SIGKILL');
              this.proc = null;
            }
            if (rej) {
              rej(new Error(`C++ engine timed out after ${timeoutMs}ms.`));
            }
          }, timeoutMs);

          const payload = JSON.stringify(command) + '\n';
          this.proc.stdin.write(payload, (err) => {
            if (err) {
              if (this.pendingTimer) {
                clearTimeout(this.pendingTimer);
                this.pendingTimer = null;
              }
              this.pendingResolve = null;
              this.pendingReject = null;
              reject(err);
            }
          });
        })
    );

    this.queue = task.then(
      () => undefined,
      () => undefined
    );

    return task;
  }

  public shutdown(): void {
    if (this.pendingTimer) {
      clearTimeout(this.pendingTimer);
      this.pendingTimer = null;
    }
    this.rl?.close();
    this.rl = null;
    if (this.proc) {
      this.proc.stdin.end();
      this.proc.kill();
      this.proc = null;
    }
  }
}

export const cppBridge = new CppBridge();
