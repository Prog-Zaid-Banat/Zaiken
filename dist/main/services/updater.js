// Copyright © 2026 [Zaid Bilal Banat]. All rights reserved. Zaiken
'use strict';
/**
 * Auto-update via electron-updater when packaged and dependency is installed.
 * Feed: GitHub Releases by default (set GH owner/repo in package.json build.publish).
 * Dev / missing package → no-op (no fake update UI).
 */
function setupAutoUpdater({ isDev, sendToRenderer } = {}) {
    if (isDev) {
        console.info('[updater] skipped in dev mode');
        return;
    }
    let autoUpdater;
    try {
        ({ autoUpdater } = require('electron-updater'));
    }
    catch {
        console.info('[updater] electron-updater not installed — auto-update disabled');
        return;
    }
    try {
        autoUpdater.autoDownload = true;
        autoUpdater.autoInstallOnAppQuit = true;
        autoUpdater.on('checking-for-update', () => {
            sendToRenderer && sendToRenderer('update-status', { status: 'checking' });
        });
        autoUpdater.on('update-available', (info) => {
            sendToRenderer && sendToRenderer('update-status', { status: 'available', info });
        });
        autoUpdater.on('update-not-available', () => {
            sendToRenderer && sendToRenderer('update-status', { status: 'none' });
        });
        autoUpdater.on('error', (err) => {
            console.warn('[updater]', err && err.message);
            sendToRenderer && sendToRenderer('update-status', { status: 'error', message: err && err.message });
        });
        autoUpdater.on('download-progress', (p) => {
            sendToRenderer && sendToRenderer('update-status', { status: 'downloading', percent: p.percent });
        });
        autoUpdater.on('update-downloaded', (info) => {
            sendToRenderer && sendToRenderer('update-status', { status: 'downloaded', info });
        });
        // Delay slightly so the window can load first
        setTimeout(() => {
            autoUpdater.checkForUpdatesAndNotify().catch((e) => {
                console.warn('[updater] check failed:', e.message);
            });
        }, 4000);
    }
    catch (e) {
        console.warn('[updater] setup failed:', e.message);
    }
}
module.exports = { setupAutoUpdater };
