"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startZaikenRuntime = startZaikenRuntime;
exports.stopZaikenRuntime = stopZaikenRuntime;
const electron_1 = require("electron");
class RuntimeInitializer {
    async initialize() {
        // runtime initialization logic goes here
    }
    shutdown() {
        // runtime shutdown logic goes here
    }
}
const runtime = new RuntimeInitializer();
async function startZaikenRuntime() {
    await electron_1.app.whenReady();
    await runtime.initialize();
}
function stopZaikenRuntime() {
    runtime.shutdown();
}
