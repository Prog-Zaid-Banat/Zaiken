// Copyright © 2026 Zaid Bilal Banat. All rights reserved. Zaiken


import { getDatabase } from "../../../main/ipc/databaseProvider";



export interface UserRecord {

    id: string;

    email: string;

    passwordHash: string;

    salt: string;

}




export interface CreateUserInput {

    id: string;

    email: string;

    passwordHash: string;

    salt: string;

}





export class SqliteUserRepository {



    private db() {

        return getDatabase()
            .getConnection();

    }








    findByEmail(
        email: string
    ): UserRecord | undefined {


        return this.db()
            .prepare(
`
SELECT

id,

email,

password_hash AS passwordHash,

salt

FROM users

WHERE email = ?

COLLATE NOCASE
`
            )
            .get(
                email.trim()
            ) as UserRecord | undefined;


    }








    findUserByEmail(
        email: string
    ): UserRecord | undefined {


        return this.findByEmail(
            email
        );


    }









    addUser(
        user: CreateUserInput
    ) {



        this.db()
            .prepare(
`
INSERT INTO users
(
id,
email,
password_hash,
salt,
created_at
)

VALUES
(
?,
?,
?,
?,
?
)
`
            )
            .run(

                user.id,

                user.email
                    .trim()
                    .toLowerCase(),

                user.passwordHash,

                user.salt,

                new Date()
                    .toISOString()

            );





        return {

            id: user.id,

            email:
                user.email
                    .trim()
                    .toLowerCase()

        };


    }









    getUserById(
        id: string
    ): UserRecord | undefined {



        return this.db()
            .prepare(
`
SELECT

id,

email,

password_hash AS passwordHash,

salt

FROM users

WHERE id = ?
`
            )
            .get(
                id
            ) as UserRecord | undefined;


    }









    setCurrentUserId(
        userId: string | null
    ): void {



        this.db()
            .prepare(
`
UPDATE auth_session

SET current_user_id = ?

WHERE id = 1
`
            )
            .run(
                userId
            );


    }









    getCurrentUserId(): string | null {



        const row =
            this.db()
                .prepare(
`
SELECT

current_user_id AS userId

FROM auth_session

WHERE id = 1
`
                )
                .get() as
                {
                    userId: string | null
                }
                | undefined;





        return row?.userId ?? null;


    }




}
