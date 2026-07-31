/**
 * Zaiken – Native Daemon Client (Node / Electron Main)
 * Talks to the Rust daemon over TCP localhost.
 * Drop-in replacement for the metrics stubs in ipc-bridge.
 *
 * Usage:
 *   const { NativeDaemonClient } = require('./native-daemon-client');
 *   const daemon = new NativeDaemonClient();
 *   await daemon.start();
 *   const metrics = await daemon.getMetrics();
 */
'use strict';

const net = require('net');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const DEFAULT_PORT = 17831;
const DEFAULT_HOST = '127.0.0.1';

class NativeDaemonClient {
  /**
   * @param {object} [opts]
   * @param {number} [opts.port]
   * @param {string} [opts.host]
   * @param {string} [opts.binaryPath]  absolute path to zaiken-daemon binary
   * @param {boolean} [opts.autoSpawn=true]
   */
  constructor(opts = {}) {
    this.port = opts.port || Number(process.env.ZAIKEN_DAEMON_PORT) || DEFAULT_PORT;
    this.host = opts.host || DEFAULT_HOST;
    this.binaryPath = opts.binaryPath || this._guessBinaryPath();
    this.autoSpawn = opts.autoSpawn !== false;
    this._reqId = 1;
    this._pending = new Map();
    this._socket = null;
    this._buffer = '';
    this._child = null;
    this._metricsListeners = new Set();
    this._connected = false;
  }

  _guessBinaryPath() {
    const candidates = [
      path.join(__dirname, '..', 'rust-daemon', 'target', 'release', 'zaiken-daemon'),
      path.join(__dirname, '..', 'rust-daemon', 'target', 'release', 'zaiken-daemon.exe'),
      path.join(process.resourcesPath || '', 'zaiken-daemon'),
      path.join(process.resourcesPath || '', 'zaiken-daemon.exe'),
      path.join(__dirname, 'zaiken-daemon'),
      path.join(__dirname, 'zaiken-daemon.exe'),
    ];
    for (const p of candidates) {
      if (p && fs.existsSync(p)) return p;
    }
    return null;
  }

  async start() {
    if (this._connected) return;

    // Try connect first
    const ok = await this._tryConnect(800);
    if (ok) return;

    if (this.autoSpawn && this.binaryPath) {
      this._spawnDaemon();
      // wait a bit then connect
      await new Promise((r) => setTimeout(r, 400));
      const ok2 = await this._tryConnect(3000);
      if (!ok2) {
        console.warn('[Zaiken Daemon] could not connect after spawn');
      }
    } else {
      console.warn('[Zaiken Daemon] binary not found and autoSpawn disabled – metrics will be stubbed');
    }
  }

  stop() {
    if (this._socket) {
      this._socket.destroy();
      this._socket = null;
    }
    this._connected = false;
    if (this._child) {
      try {
        this._child.kill();
      } catch (_) {}
      this._child = null;
    }
    for (const [, { reject }] of this._pending) {
      reject(new Error('daemon stopped'));
    }
    this._pending.clear();
  }

  _spawnDaemon() {
    if (!this.binaryPath || !fs.existsSync(this.binaryPath)) {
      console.warn('[Zaiken Daemon] binary missing:', this.binaryPath);
      return;
    }
    try {
      this._child = spawn(this.binaryPath, [], {
        stdio: 'ignore',
        detached: false,
        env: { ...process.env, ZAIKEN_DAEMON_PORT: String(this.port) },
      });
      this._child.on('error', (e) => console.error('[Zaiken Daemon] spawn error', e));
      this._child.on('exit', (code) => {
        console.log('[Zaiken Daemon] exited', code);
        this._child = null;
        this._connected = false;
      });
      console.log('[Zaiken Daemon] spawned', this.binaryPath);
    } catch (e) {
      console.error('[Zaiken Daemon] failed to spawn', e);
    }
  }

  _tryConnect(timeoutMs) {
    return new Promise((resolve) => {
      if (this._socket) {
        this._socket.destroy();
        this._socket = null;
      }

      const socket = net.createConnection({ host: this.host, port: this.port });
      let settled = false;

      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          socket.destroy();
          resolve(false);
        }
      }, timeoutMs);

      socket.on('connect', () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this._socket = socket;
        this._connected = true;
        this._buffer = '';
        socket.setEncoding('utf8');
        socket.on('data', (chunk) => this._onData(chunk));
        socket.on('close', () => {
          this._connected = false;
          this._socket = null;
        });
        socket.on('error', () => {
          this._connected = false;
        });
        console.log('[Zaiken Daemon] connected');
        resolve(true);
      });

      socket.on('error', () => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(false);
        }
      });
    });
  }

  _onData(chunk) {
    this._buffer += chunk;
    let idx;
    while ((idx = this._buffer.indexOf('\n')) >= 0) {
      const line = this._buffer.slice(0, idx).trim();
      this._buffer = this._buffer.slice(idx + 1);
      if (!line) continue;
      try {
        const msg = JSON.parse(line);
        const pending = this._pending.get(msg.id);
        if (pending) {
          this._pending.delete(msg.id);
          if (msg.ok) pending.resolve(msg.result);
          else pending.reject(new Error(msg.error || 'daemon error'));
        }
      } catch (e) {
        console.warn('[Zaiken Daemon] bad message', e);
      }
    }
  }

  _request(method, params = {}) {
    return new Promise((resolve, reject) => {
      if (!this._connected || !this._socket) {
        return reject(new Error('daemon not connected'));
      }
      const id = this._reqId++;
      const payload = JSON.stringify({ id, method, params }) + '\n';
      this._pending.set(id, { resolve, reject });
      this._socket.write(payload, (err) => {
        if (err) {
          this._pending.delete(id);
          reject(err);
        }
      });
      // timeout
      setTimeout(() => {
        if (this._pending.has(id)) {
          this._pending.delete(id);
          reject(new Error('daemon request timeout'));
        }
      }, 15000);
    });
  }

  async getMetrics() {
    try {
      const r = await this._request('get_metrics');
      return {
        cpu: r.cpu ?? 0,
        ramUsedMb: r.ram_used_mb ?? 0,
        ramTotalMb: r.ram_total_mb ?? 1,
        gpu: r.gpu ?? null,
        pingMs: r.ping_ms ?? null,
        timestamp: r.timestamp ?? Date.now(),
      };
    } catch {
      return {
        cpu: 0,
        ramUsedMb: 0,
        ramTotalMb: 1,
        gpu: null,
        pingMs: null,
        timestamp: Date.now(),
      };
    }
  }

  async scanGames() {
    try {
      const list = await this._request('scan_games');
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }

  async ping() {
    try {
      return await this._request('ping');
    } catch {
      return null;
    }
  }

  /** Optional: poll metrics and notify listeners */
  startMetricsPolling(intervalMs = 1000) {
    if (this._pollTimer) return;
    this._pollTimer = setInterval(async () => {
      const m = await this.getMetrics();
      for (const cb of this._metricsListeners) {
        try {
          cb(m);
        } catch (_) {}
      }
    }, intervalMs);
  }

  stopMetricsPolling() {
    if (this._pollTimer) {
      clearInterval(this._pollTimer);
      this._pollTimer = null;
    }
  }

  onMetrics(cb) {
    this._metricsListeners.add(cb);
    return () => this._metricsListeners.delete(cb);
  }
}

module.exports = { NativeDaemonClient, DEFAULT_PORT };
