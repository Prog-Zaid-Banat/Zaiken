// Copyright © 2026 Zaid Bilal Banat. All rights reserved. Zaiken


import { getDatabase } from "../../../main/ipc/databaseProvider";



export interface AchievementRecord {

    id: string;

    code: string;

    name: string;

    description: string | null;

    icon: string | null;

    goal: number;

    progress: number;

    unlocked: number;

    unlockedAt: string | null;

    sortOrder: number;

}




export class SqliteAchievementsRepository {



    private db() {

        return getDatabase()
            .getConnection();

    }






    getAll(): AchievementRecord[] {


        return this.db()
            .prepare(
`
SELECT

id,

code,

name,

description,

icon,

goal,

progress,

unlocked,

unlocked_at AS unlockedAt,

sort_order AS sortOrder

FROM achievements

ORDER BY sort_order, rowid
`
            )
            .all() as AchievementRecord[];


    }






    private updateProgress(
        id: string,
        progress: number
    ): AchievementRecord | null {


        const row =
            this.db()
                .prepare(
                    "SELECT * FROM achievements WHERE id = ?"
                )
                .get(id) as any;


        if (!row) {

            return null;

        }


        const next =
            Math.max(
                0,
                Math.min(row.goal, Math.floor(progress))
            );


        const willUnlock =
            next >= row.goal;


        this.db()
            .prepare(
`
UPDATE achievements
SET progress = ?,
    unlocked = ?,
    unlocked_at = ?
WHERE id = ?
`
            )
            .run(
                next,
                willUnlock ? 1 : row.unlocked,
                willUnlock && !row.unlocked
                    ? new Date().toISOString()
                    : row.unlocked_at,
                id
            );


        const updated =
            this.db()
                .prepare(
                    "SELECT * FROM achievements WHERE id = ?"
                )
                .get(id) as any;


        return {

            id: updated.id,
            code: updated.code,
            name: updated.name,
            description: updated.description,
            icon: updated.icon,
            goal: updated.goal,
            progress: updated.progress,
            unlocked: updated.unlocked,
            unlockedAt: updated.unlocked_at,
            sortOrder: updated.sort_order

        };


    }






    // Recalculates progress for all locked achievements based on
    // current profile stats, and returns any that newly unlocked.
    evaluate(): AchievementRecord[] {


        const profileRow =
            this.db()
                .prepare(
                    "SELECT * FROM profiles LIMIT 1"
                )
                .get() as any;


        const minutesRow =
            this.db()
                .prepare(
                    "SELECT COALESCE(SUM(minutes),0) AS value FROM play_sessions"
                )
                .get() as { value: number };


        if (!profileRow) {

            return [];

        }


        const progressByCode: Record<string, number> = {

            headshot_king: profileRow.total_kills ?? 0,

            first_blood: profileRow.total_wins ? 1 : 0,

            speed_demon:
                profileRow.reaction_time_ms > 0 &&
                profileRow.reaction_time_ms < 150
                    ? 1
                    : 0,

            on_fire: profileRow.best_win_streak ?? 0,

            diamond_elite:
                ["Diamond", "Master"].includes(profileRow.rank)
                    ? 1
                    : 0,

            marathon: minutesRow.value

        };


        const lockedAchievements =
            this.db()
                .prepare(
                    "SELECT * FROM achievements WHERE unlocked = 0"
                )
                .all() as any[];


        const newlyUnlocked: AchievementRecord[] = [];


        for (const row of lockedAchievements) {

            const value =
                progressByCode[row.code];


            if (value === undefined) {

                continue;

            }


            const updated =
                this.updateProgress(row.id, value);


            if (updated && updated.unlocked) {

                newlyUnlocked.push(updated);

            }

        }


        return newlyUnlocked;


    }




}