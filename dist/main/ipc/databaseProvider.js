"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setDatabase = setDatabase;
exports.getDatabase = getDatabase;
let database = null;
function setDatabase(instance) {
    database = instance;
}
function getDatabase() {
    if (!database) {
        throw new Error("Database has not been initialized");
    }
    return database;
}
