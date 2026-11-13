import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

import { getDb } from "../client";
import { profiles } from "../schema";
import { computeRank } from "../../../domain/services/RankCalculator";



export class SqliteProfileRepository {



    async findCurrent(): Promise<any> {

        const row =
            getDb()
                .select()
                .from(profiles)
                .limit(1)
                .get();



        if (!row) {

            const id = randomUUID();

            const now =
                new Date().toISOString();



            const newProfile = {

                id,

                userId: null,

                username: "Player",

                avatarPath: null,

                rank: "Bronze",

                level: 1,

                xp: 0,

                xpMax: 1000,

                bio: "",

                country: "",

                totalWins: 0,

                totalLosses: 0,

                totalKills: 0,

                totalDeaths: 0,

                totalMatches: 0,

                winStreak: 0,

                bestWinStreak: 0,

                reactionTimeMs: 0,

                reactionSamples: 0,

                joinDate: now,

                updatedAt: now
            };


            getDb()
                .insert(profiles)
                .values(newProfile)
                .run();



            return newProfile;
        }



        return row;
    }






    async update(data:any) {


        const current =
            await this.findCurrent();



        getDb()
            .update(profiles)
            .set({

                username:
                    data.username ??
                    current.username,


                bio:
                    data.bio ??
                    current.bio,


                country:
                    data.country ??
                    current.country,


                updatedAt:
                    new Date().toISOString()

            })
            .where(
                eq(
                    profiles.id,
                    current.id
                )
            )
            .run();



        return this.findCurrent();

    }




    async recordMatch(input: {
        kills?: number;
        deaths?: number;
        wins?: number;
        losses?: number;
        matches?: number;
    }): Promise<any> {

        const current =
            await this.findCurrent();

        if (!current) return null;


        const totalWins =
            (current.totalWins || 0) + Math.max(0, Math.round(Number(input.wins) || 0));


        const totalLosses =
            (current.totalLosses || 0) + Math.max(0, Math.round(Number(input.losses) || 0));


        const totalKills =
            (current.totalKills || 0) + Math.max(0, Math.round(Number(input.kills) || 0));


        const totalDeaths =
            (current.totalDeaths || 0) + Math.max(0, Math.round(Number(input.deaths) || 0));


        const totalMatches =
            (current.totalMatches || 0) + Math.max(0, Math.round(Number(input.matches) || 0));


        const winStreak =
            (current.winStreak || 0) + (totalWins - current.totalWins);


        const bestWinStreak =
            Math.max(
                current.bestWinStreak || 0,
                winStreak
            );


        const rank =
            computeRank({
                totalWins,
                totalKills,
                level: current.level || 1
            });


        getDb()
            .update(profiles)
            .set({
                totalWins,
                totalLosses,
                totalKills,
                totalDeaths,
                totalMatches,
                winStreak,
                bestWinStreak,
                rank,
                updatedAt:
                    new Date().toISOString()
            })
            .where(
                eq(
                    profiles.id,
                    current.id
                )
            )
            .run();


        return this.findCurrent();

    }

}