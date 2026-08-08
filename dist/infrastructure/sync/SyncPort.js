"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NullSyncPort = void 0;
/** No-op implementation until cloud backend exists */
class NullSyncPort {
    async push() {
        return { ok: true };
    }
    async pull() {
        return { ok: true, changes: [] };
    }
}
exports.NullSyncPort = NullSyncPort;
