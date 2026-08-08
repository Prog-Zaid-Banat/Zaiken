import fs from "fs";
import path from "path";
import Database from "better-sqlite3";


export class MigrationRunner {

    constructor(
        private readonly db: Database.Database
    ) {}


    run(): void {

        this.createMigrationTable();


        const migrationsPath = path.join(
            __dirname,
            "migrations"
        );


        if (!fs.existsSync(migrationsPath)) {
            throw new Error(
                `Migrations folder not found: ${migrationsPath}`
            );
        }


        const files = fs
            .readdirSync(migrationsPath)
            .filter(file => file.endsWith(".sql"))
            .sort();


        for (const file of files) {


            const exists =
                this.db
                .prepare(
                    `
                    SELECT 1
                    FROM schema_migrations
                    WHERE name = ?
                    `
                )
                .get(file);



            if (exists) {
                continue;
            }



            const filePath =
                path.join(
                    migrationsPath,
                    file
                );



            const sql =
                fs.readFileSync(
                    filePath,
                    "utf8"
                );



            const execute =
                this.db.transaction(() => {


                    this.db.exec(sql);



                    this.db
                    .prepare(
                        `
                        INSERT INTO schema_migrations
                        (
                            name,
                            applied_at
                        )
                        VALUES (?,?)
                        `
                    )
                    .run(
                        file,
                        new Date().toISOString()
                    );

                });



            execute();



            console.log(
                `[Migration] Applied ${file}`
            );
        }
    }



    private createMigrationTable(): void {

        this.db.exec(
            `
            CREATE TABLE IF NOT EXISTS schema_migrations(

                name TEXT PRIMARY KEY NOT NULL,

                applied_at TEXT NOT NULL

            );
            `
        );

    }

}