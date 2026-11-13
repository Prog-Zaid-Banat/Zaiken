// Copyright © 2026 Zaid Bilal Banat. All rights reserved. Zaiken
// Phase 2: system stats for the overlay / live HUD. os-module only; external
// executables are invoked with fixed, non-user-supplied arguments.

import os from "os";
import { execFile } from "child_process";

let prevCpu: { idle: number; total: number } | null = null;

function cpuSnapshot(): { idle: number; total: number } {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;
  for (const c of cpus) {
    const t = c.times;
    idle += t.idle;
    total += t.user + t.nice + t.sys + t.idle + t.irq;
  }
  return { idle, total };
}

export class SystemStatsService {
  static getCpuPercent(): number {
    const cur = cpuSnapshot();
    if (!prevCpu) {
      prevCpu = cur;
      return 0;
    }
    const idle = cur.idle - prevCpu.idle;
    const total = cur.total - prevCpu.total;
    prevCpu = cur;
    if (total <= 0) return 0;
    const usage = 1 - idle / total;
    return Math.round(Math.min(100, Math.max(0, usage * 100)));
  }

  static getMemory() {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    return {
      totalBytes: total,
      usedBytes: used,
      freeBytes: free,
      usedPercent: Math.round((used / total) * 100),
    };
  }

  static pingHost(host = "1.1.1.1", timeoutMs = 1500): Promise<{ ok: boolean; ms: number | null }> {
    return new Promise((resolve) => {
      const isWin = process.platform === "win32";
      const args = isWin
        ? ["-n", "1", "-w", String(timeoutMs), host]
        : ["-c", "1", "-W", String(Math.ceil(timeoutMs / 1000)), host];
      const started = Date.now();
      execFile(
        "ping",
        args,
        { timeout: timeoutMs + 500, windowsHide: true },
        (err, stdout) => {
          if (err) {
            resolve({ ok: false, ms: null });
            return;
          }
          const text = String(stdout || "");
          let ms: number | null = null;
          const m1 = text.match(/time[=<]?\s*([\d.]+)\s*ms/i);
          const m2 = text.match(/Average\s*=\s*(\d+)/i);
          if (m1) ms = Math.round(parseFloat(m1[1]));
          else if (m2) ms = parseInt(m2[1], 10);
          else ms = Date.now() - started;
          resolve({ ok: true, ms });
        }
      );
    });
  }

  static getGpuUsage(): Promise<number | null> {
    return new Promise((resolve) => {
      execFile(
        "nvidia-smi",
        ["--query-gpu=utilization.gpu", "--format=csv,noheader,nounits"],
        { timeout: 2000, windowsHide: true },
        (err, stdout) => {
          if (err) {
            resolve(null);
            return;
          }
          const n = parseInt(String(stdout).trim().split("\n")[0], 10);
          resolve(Number.isFinite(n) ? n : null);
        }
      );
    });
  }

  static async collectSnapshot(extra: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    const cpu = this.getCpuPercent();
    const mem = this.getMemory();
    const [ping, gpu] = await Promise.all([this.pingHost(), this.getGpuUsage()]);
    return {
      cpu,
      ram: mem.usedPercent,
      ramUsedGb: Math.round((mem.usedBytes / 1e9) * 10) / 10,
      ramTotalGb: Math.round((mem.totalBytes / 1e9) * 10) / 10,
      ping: ping.ok ? ping.ms : null,
      gpu,
      platform: process.platform,
      uptimeSec: Math.round(os.uptime()),
      timestamp: Date.now(),
      ...extra,
    };
  }
}
