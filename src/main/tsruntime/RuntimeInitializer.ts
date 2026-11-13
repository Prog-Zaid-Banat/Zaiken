import path from "path";
import { app } from "electron";

import { DatabaseConnection } from "../../infrastructure/database/DatabaseConnection";
import { MigrationRunner } from "../../infrastructure/database/MigrationRunner";
import { SqliteGameRepository } from "../../infrastructure/database/repositories/SqliteGameRepository";

import { setDatabase } from "../ipc/databaseProvider";
import { closeDatabase, initDatabase } from "../../infrastructure/database/client";
import { setGameRepository } from "../ipc/repositoryProvider";
import { getSecretStore } from "../../infrastructure/secrets/SecretStore";


export class RuntimeInitializer {

    private readonly database: DatabaseConnection;
    private initialized = false;


    constructor() {
        this.database = new DatabaseConnection();
    }


    async initialize(): Promise<void> {

        await this.initializeDatabase();
        this.initialized = true;


        // Phase 3: initialize the OS-backed credential store (keytar) so AI
        // credentials are read/written through the OS vault, never settings.
        await getSecretStore().init();


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

        if (!this.initialized) return;

        this.database.close();
        closeDatabase();
        this.initialized = false;


        console.log(
            "[Zaiken] Runtime shutdown completed"
        );
    }
}
