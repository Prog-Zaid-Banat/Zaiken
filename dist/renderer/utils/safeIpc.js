"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeIpcInvoke = safeIpcInvoke;
async function safeIpcInvoke(channel, payload, timeoutMs = 10000) {
    return Promise.race([
        window.electronAPI.invoke(channel, payload).then((result) => {
            if (!result)
                return { success: false, error: 'Empty response from main process' };
            return result;
        }).catch((err) => ({
            success: false,
            error: err?.message || 'IPC invocation failed'
        })),
        new Promise((_, reject) => setTimeout(() => reject({ success: false, error: 'Operation timed out' }), timeoutMs))
    ]).catch((err) => ({
        success: false,
        error: err?.error || 'Timeout or network disruption'
    }));
}
