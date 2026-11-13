// Copyright © 2026 Zaid Bilal Banat. All rights reserved. Zaiken
// Phase 3: achievements handlers reject untrusted senders.

import { ipcMain } from "electron";
import { SqliteAchievementsRepository } from "../../infrastructure/database/repositories/SqliteAchievementsRepository";
import { isTrustedSender } from "../windowRegistry";

const achievementsRepository = new SqliteAchievementsRepository();

export function registerAchievementsIpcHandlers() {
  ipcMain.handle("db-get-achievements", (event) => {
    if (!isTrustedSender(event)) return [];
    try {
      return achievementsRepository.getAll();
    } catch {
      return [];
    }
  });

  ipcMain.handle("db-evaluate-achievements", (event) => {
    if (!isTrustedSender(event)) return [];
    try {
      return achievementsRepository.evaluate();
    } catch {
      return [];
    }
  });
}
