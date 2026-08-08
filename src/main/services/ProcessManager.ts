import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { app } from 'electron';

export class ProcessManager {
  private rustDaemonProcess: ChildProcess | null = null;
  private aiServerProcess: ChildProcess | null = null;
  private isQuitting = false;

  constructor() {
    // التقاط إشارة خروج التطبيق لضمان إغلاق العمليات الخلفية تماماً
    app.on('will-quit', () => {
      this.isQuitting = true;
      this.stopAll();
    });
  }

  /**
  * تشغيل جميع الخدمات الخلفية
  */
  public startAllServices(): void {
    this.startRustDaemon();
    this.startAiServer();
  }

  /**
  * تشغيل دايمن Rust
  */
  private startRustDaemon(): void {
    const isDev = !app.isPackaged;
    // تحديد مسار الملف التنفيذي للدايمن بناءً على بيئة التشغيل (تطوير أو إنتاج)
    const daemonBinary = isDev
      ? path.join(__dirname, '../../../native/rust-daemon/target/release/zaiken-daemon')
      : path.join(process.resourcesPath, 'bin', 'zaiken-daemon');

    console.log(`[ProcessManager] Starting Rust Daemon from: ${daemonBinary}`);

    try {
      this.rustDaemonProcess = spawn(daemonBinary, [], {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, ZAIKEN_DAEMON_TOKEN: 'secure_internal_token_xyz' }
      });

      this.rustDaemonProcess.stdout?.on('data', (data) => {
        console.log(`[Rust Daemon]: ${data.toString().trim()}`);
      });

      this.rustDaemonProcess.stderr?.on('data', (data) => {
        console.error(`[Rust Daemon Error]: ${data.toString().trim()}`);
      });

      this.rustDaemonProcess.on('exit', (code, signal) => {
        console.warn(`[ProcessManager] Rust Daemon exited with code ${code} and signal ${signal}`);
        if (!this.isQuitting) {
          // إعادة المحاولة التلقائية بعد 3 ثوانٍ في حال تعطل العملية مفاجئاً
          setTimeout(() => this.startRustDaemon(), 3000);
        }
      });
    } catch (error) {
      console.error('[ProcessManager] Failed to start Rust Daemon:', error);
    }
  }

  /**
  * تشغيل خادم الذكاء الاصطناعي (Node.js AI Server)
  */
  private startAiServer(): void {
    const isDev = !app.isPackaged;
    const serverPath = isDev
      ? path.join(__dirname, '../../../server/index.js')
      : path.join(process.resourcesPath, 'app/server/index.js');

    console.log(`[ProcessManager] Starting AI Server from: ${serverPath}`);

    try {
      this.aiServerProcess = spawn(process.execPath, [serverPath], {
        stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
        env: { ...process.env, NODE_ENV: isDev ? 'development' : 'production' }
      });

      this.aiServerProcess.stdout?.on('data', (data) => {
        console.log(`[AI Server]: ${data.toString().trim()}`);
      });

      this.aiServerProcess.stderr?.on('data', (data) => {
        console.error(`[AI Server Error]: ${data.toString().trim()}`);
      });

      this.aiServerProcess.on('exit', (code, signal) => {
        console.warn(`[ProcessManager] AI Server exited with code ${code} and signal ${signal}`);
        if (!this.isQuitting) {
          setTimeout(() => this.startAiServer(), 3000);
        }
      });
    } catch (error) {
      console.error('[ProcessManager] Failed to start AI Server:', error);
    }
  }

  /**
  * إيقاف جميع العمليات بشكل نظيف
  */
  public stopAll(): void {
    if (this.rustDaemonProcess) {
      console.log('[ProcessManager] Stopping Rust Daemon...');
      this.rustDaemonProcess.kill('SIGTERM');
      this.rustDaemonProcess = null;
    }

    if (this.aiServerProcess) {
      console.log('[ProcessManager] Stopping AI Server...');
      this.aiServerProcess.kill('SIGTERM');
      this.aiServerProcess = null;
    }
  }
}