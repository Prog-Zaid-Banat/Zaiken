'use strict';
const path = require('path');
const fs = require('fs');
const { setupSecureIpc, broadcastMetrics, setDaemon } = require('./ipc/ipc-bridge');
const { NativeDaemonClient } = require('./native-daemon-client');
let _daemon = null;
let _started = false;
function getSecurePreloadPath() {
    // يشتغل سواء كان المسار من جذر المشروع أو من src/main
    const candidates = [
        path.join(__dirname, 'preload-secure.js'),
        path.join(__dirname, '..', 'main', 'preload-secure.js'),
        path.join(process.cwd(), 'src', 'main', 'preload-secure.js'),
    ];
    for (const p of candidates) {
        if (fs.existsSync(p))
            return p;
    }
    return path.join(__dirname, 'preload-secure.js');
}
function resolveDaemonBinary() {
    const isWin = process.platform === 'win32';
    const name = isWin ? 'zaiken-daemon.exe' : 'zaiken-daemon';
    const candidates = [
        // بعد electron-builder
        process.resourcesPath ? path.join(process.resourcesPath, name) : null,
        // تطوير – relative من جذر المشروع
        path.join(process.cwd(), 'native', 'rust-daemon', 'target', 'release', name),
        path.join(__dirname, '..', '..', 'native', 'rust-daemon', 'target', 'release', name),
        path.join(__dirname, '..', '..', '..', 'native', 'rust-daemon', 'target', 'release', name),
    ].filter(Boolean);
    for (const p of candidates) {
        if (fs.existsSync(p))
            return p;
    }
    return null;
}
/**
 * يشغّل طبقة الأمان كاملة:
 * - IPC مع Zod
 * - Native Daemon (إذا الـ binary موجود)
 * - بث المقاييس
 */
async function initSecureLayer(opts = {}) {
    if (_started)
        return { daemon: _daemon };
    const binaryPath = opts.binaryPath || resolveDaemonBinary();
    const autoSpawn = opts.autoSpawn !== false;
    _daemon = new NativeDaemonClient({
        binaryPath,
        autoSpawn: autoSpawn && !!binaryPath,
        port: opts.port,
    });
    try {
        await _daemon.start();
        setDaemon(_daemon);
        _daemon.onMetrics((m) => {
            try {
                broadcastMetrics(m);
            }
            catch (_) { }
        });
        if (opts.pollMetrics !== false) {
            _daemon.startMetricsPolling(opts.pollIntervalMs || 1000);
        }
        console.log('[Zaiken Secure] Daemon connected:', !!binaryPath);
    }
    catch (e) {
        console.warn('[Zaiken Secure] Daemon unavailable – continuing with stubs:', e.message);
        setDaemon(null);
    }
    setupSecureIpc();
    _started = true;
    console.log('[Zaiken Secure] IPC bridge active – window.zaiken ready');
    return { daemon: _daemon };
}
function stopSecureLayer() {
    if (_daemon) {
        try {
            _daemon.stop();
        }
        catch (_) { }
        _daemon = null;
    }
    _started = false;
}
function getDaemon() {
    return _daemon;
}
module.exports = {
    initSecureLayer,
    stopSecureLayer,
    getSecurePreloadPath,
    getDaemon,
    broadcastMetrics,
};
