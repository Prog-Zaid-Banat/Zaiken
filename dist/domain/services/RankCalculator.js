"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeRank = computeRank;
exports.applyPlaytimeXp = applyPlaytimeXp;
function computeRank(input) {
    const score = (input.totalWins || 0) * 3 + (input.totalKills || 0) * 0.5 + (input.level || 1) * 10;
    if (score >= 5000)
        return 'Master';
    if (score >= 2500)
        return 'Diamond';
    if (score >= 1000)
        return 'Platinum';
    if (score >= 400)
        return 'Gold';
    if (score >= 100)
        return 'Silver';
    return 'Bronze';
}
function applyPlaytimeXp(profile, minutes) {
    const xpGained = Math.max(0, Math.round(minutes)) * 2;
    let xp = (profile.xp || 0) + xpGained;
    let xpMax = profile.xpMax || 1000;
    let level = profile.level || 1;
    while (xp >= xpMax) {
        xp -= xpMax;
        level += 1;
        xpMax = Math.round(xpMax * 1.25);
    }
    return { xp, xpMax, level, xpGained };
}
