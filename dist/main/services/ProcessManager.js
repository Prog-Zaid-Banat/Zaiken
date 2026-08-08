"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessManager = void 0;
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const electron_1 = require("electron");
class ProcessManager {
    rustDaemonProcess = null;
    aiServerProcess = null;
    isQuitting = false;
    constructor() {
        // التقاط إشارة خروج التطبيق لضمان إغلاق العمليات الخلفية تماماً
        electron_1.app.on('will-quit', () => {
            this.isQuitting = true;
            this.stopAll();
        });
    }
    /**
    * تشغيل جميع الخدمات الخلفية
    */
    startAllServices() {
        this.startRustDaemon();
        this.startAiServer();
    }
    /**
    * تشغيل دايمن Rust
    */
    startRustDaemon() {
        const isDev = !electron_1.app.isPackaged;
        // تحديد مسار الملف التنفيذي للدايمن بناءً على بيئة التشغيل (تطوير أو إنتاج)
        const daemonBinary = isDev
            ? path_1.default.join(__dirname, '../../../native/rust-daemon/target/release/zaiken-daemon')
            : path_1.default.join(process.resourcesPath, 'bin', 'zaiken-daemon');
        console.log(`[ProcessManager] Starting Rust Daemon from: ${daemonBinary}`);
        try {
            this.rustDaemonProcess = (0, child_process_1.spawn)(daemonBinary, [], {
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
        }
        catch (error) {
            console.error('[ProcessManager] Failed to start Rust Daemon:', error);
        }
    }
    /**
    * تشغيل خادم الذكاء الاصطناعي (Node.js AI Server)
    */
    startAiServer() {
        const isDev = !electron_1.app.isPackaged;
        const serverPath = isDev
            ? path_1.default.join(__dirname, '../../../server/index.js')
            : path_1.default.join(process.resourcesPath, 'app/server/index.js');
        console.log(`[ProcessManager] Starting AI Server from: ${serverPath}`);
        try {
            this.aiServerProcess = (0, child_process_1.spawn)(process.execPath, [serverPath], {
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
        }
        catch (error) {
            console.error('[ProcessManager] Failed to start AI Server:', error);
        }
    }
    /**
    * إيقاف جميع العمليات بشكل نظيف
    */
    stopAll() {
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
exports.ProcessManager = ProcessManager;
