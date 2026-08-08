import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

import { getDb } from "../client";
import { profiles } from "../schema";



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

}