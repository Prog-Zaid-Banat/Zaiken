import { DatabaseConnection } from "../../infrastructure/database/DatabaseConnection";


let database: DatabaseConnection | null = null;


export function setDatabase(
    instance: DatabaseConnection
): void {

    database = instance;

}


export function getDatabase(): DatabaseConnection {

    if (!database) {

        throw new Error(
            "Database has not been initialized"
        );

    }


    return database;

}