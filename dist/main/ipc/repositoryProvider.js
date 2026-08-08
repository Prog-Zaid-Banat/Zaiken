"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setGameRepository = setGameRepository;
exports.getGameRepository = getGameRepository;
let gameRepository = null;
function setGameRepository(repository) {
    gameRepository = repository;
}
function getGameRepository() {
    if (!gameRepository) {
        throw new Error("Game repository has not been initialized");
    }
    return gameRepository;
}
