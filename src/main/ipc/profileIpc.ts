import { ipcMain } from "electron";
import { SqliteProfileRepository } from "../../infrastructure/database/repositories/SqliteProfileRepository";


const profileRepository =
    new SqliteProfileRepository();



export function registerProfileIpcHandlers(){


    ipcMain.handle(
        "zaiken:profile:get",
        async()=>{

            return await profileRepository.findCurrent();

        }
    );



    ipcMain.handle(
        "zaiken:profile:save",
        async(_,data)=>{


            return await profileRepository.update(data);


        }
    );

}