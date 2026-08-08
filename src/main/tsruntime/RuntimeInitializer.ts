import path from "path";
import { app } from "electron";

import { DatabaseConnection } from "../../infrastructure/database/DatabaseConnection";
import { MigrationRunner } from "../../infrastructure/database/MigrationRunner";
import { SqliteGameRepository } from "../../infrastructure/database/repositories/SqliteGameRepository";

import { setDatabase } from "../ipc/databaseProvider";
import { initDatabase } from "../../infrastructure/database/client";
import { setGameRepository } from "../ipc/repositoryProvider";


export class RuntimeInitializer {

    private readonly database: DatabaseConnection;


    constructor() {
        this.database = new DatabaseConnection();
    }


    async initialize(): Promise<void> {

        await this.initializeDatabase();


        console.log(
            "[Zaiken] Runtime initialized successfully"
        );
    }


    private async initializeDatabase(): Promise<void> {

        const databasePath = path.join(
            app.getPath("userData"),
            "zaiken.db"
        );
        console.log(
    "[Zaiken] DATABASE LOCATION:",
    databasePath
);


        // 0. Initialize drizzle-based client
        initDatabase(databasePath);

        // 1. Create database connection
        this.database.initialize(databasePath);


        console.log(
            "[Zaiken] Database connection created"
        );


        // 2. Run database migrations
        const migrationRunner =
            new MigrationRunner(
                this.database.getConnection()
            );


        migrationRunner.run();


        console.log(
            "[Zaiken] Database migrations completed"
        );


        // 3. Register database instance
        setDatabase(this.database);
        console.log("[Zaiken] DATABASE READY");


        console.log(
            "[Zaiken] Database provider registered"
        );


        // 4. Register repositories
        const gameRepository =
            new SqliteGameRepository();


        setGameRepository(gameRepository);


        console.log(
            "[Zaiken] Game repository registered"
        );


        console.log(
            `[Zaiken] Database path: ${databasePath}`
        );
    }


    shutdown(): void {

        this.database.close();


        console.log(
            "[Zaiken] Runtime shutdown completed"
        );
    }
}
