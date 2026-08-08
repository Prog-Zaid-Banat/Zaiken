// Copyright © 2026 Zaid Bilal Banat. All rights reserved. Zaiken


import { getDatabase } from "../../../main/ipc/databaseProvider";



const DEFAULT_SETTINGS: Record<string, unknown> = {

    overlayEnabled: false,

    accentColor: "#00FFB2"

};




export class SqliteSettingsRepository {



    private db() {

        return getDatabase()
            .getConnection();

    }




    getAll(): Record<string, unknown> {


        const rows =
            this.db()
                .prepare(
`
SELECT

key,

value_json AS valueJson

FROM settings
`
                )
                .all() as
                { key: string; valueJson: string }[];



        const result: Record<string, unknown> =
            { ...DEFAULT_SETTINGS };


        for (const row of rows) {

            try {

                result[row.key] =
                    JSON.parse(row.valueJson);

            } catch {

                result[row.key] =
                    row.valueJson;

            }

        }


        return result;


    }






    save(
        input: Record<string, unknown>
    ): Record<string, unknown> {


        if (
            !input ||
            typeof input !== "object" ||
            Array.isArray(input)
        ) {

            throw new Error(
                "Settings must be an object."
            );

        }


        const upsert =
            this.db()
                .prepare(
`
INSERT INTO settings
(key, value_json, updated_at)

VALUES (?, ?, datetime('now'))

ON CONFLICT(key) DO UPDATE SET
value_json = excluded.value_json,
updated_at = excluded.updated_at
`
                );


        const runAll =
            this.db()
                .transaction(
                    (
                        entries: [string, unknown][]
                    ) => {

                        for (const [key, value] of entries) {

                            upsert.run(
                                key,
                                JSON.stringify(value)
                            );

                        }

                    }
                );


        runAll(
            Object.entries(input)
        );


        return this.getAll();


    }






    resetAllData(): void {


        this.db()
            .prepare(
                "DELETE FROM settings"
            )
            .run();


    }




}
