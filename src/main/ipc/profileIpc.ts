import { ipcMain } from "electron";
import { SqliteProfileRepository } from "../../infrastructure/database/repositories/SqliteProfileRepository";
import { SqliteAchievementsRepository } from "../../infrastructure/database/repositories/SqliteAchievementsRepository";
import { recordMatchSchema } from "./validationSchemas";
import { isTrustedSender } from "../windowRegistry";


const profileRepository =
    new SqliteProfileRepository();


const achievementsRepository =
    new SqliteAchievementsRepository();



export function registerProfileIpcHandlers(){


    ipcMain.handle(
        "zaiken:profile:get",
        async (event)=>{

            if (!isTrustedSender(event)) return null;

            return await profileRepository.findCurrent();

        }
    );



    ipcMain.handle(
        "zaiken:profile:save",
        async (event,data)=>{

            if (!isTrustedSender(event)) return null;

            return await profileRepository.update(data);


        }
    );


    ipcMain.handle(
        "db-record-match",
        async (event, data) => {

            if (!isTrustedSender(event)) {
                return { success: false, error: "Unauthorized sender" };
            }

            const parsed =
                recordMatchSchema.safeParse(data);

            if (!parsed.success) {
                return { success: false, error: "Invalid match payload" };
            }

            try {

                const profile =
                    await profileRepository.recordMatch(
                        parsed.data
                    );


                let unlocked: unknown[] = [];

                try {

                    unlocked =
                        achievementsRepository.evaluate() || [];

                } catch {

                    unlocked = [];

                }


                return {
                    success: true,
                    profile,
                    unlocked
                };


            } catch (error: any) {

                return {
                    success: false,
                    error:
                        error?.message ||
                        "Failed to record match"
                };

            }

        }
    );

}