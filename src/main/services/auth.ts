// Copyright © 2026 [Zaid Bilal Banat]. All rights reserved. Zaiken

import crypto from "crypto";
import { SqliteUserRepository } from "../../infrastructure/database/repositories/SqliteUserRepository";


interface AuthUser {

    uid: string;

    email: string;

}



const EMAIL_RE =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


const MIN_PASSWORD_LENGTH = 6;


const SCRYPT_KEYLEN = 64;




function hashPassword(
    password: string,
    salt: string
): string {

    return crypto
        .scryptSync(
            password,
            salt,
            SCRYPT_KEYLEN
        )
        .toString("hex");

}





function validateCredentials(
    email: string,
    password: string
): void {


    if (
        !email ||
        !EMAIL_RE.test(
            String(email).trim()
        )
    ) {

        throw new Error(
            "Please enter a valid email address."
        );

    }



    if (
        !password ||
        String(password).length < MIN_PASSWORD_LENGTH
    ) {

        throw new Error(
            `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
        );

    }

}





function createAuthService() {



    const userRepository =
        new SqliteUserRepository();





    return {




        register: async (
            email: string,
            password: string
        ): Promise<AuthUser> => {



            validateCredentials(
                email,
                password
            );




            const existingUser =
                userRepository.findByEmail(
                    email
                );




            if (existingUser) {

                throw new Error(
                    "An account with this email already exists."
                );

            }





            const salt =
                crypto
                    .randomBytes(16)
                    .toString("hex");





            const passwordHash =
                hashPassword(
                    password,
                    salt
                );





            const user =
                userRepository.addUser({

                    id: crypto.randomUUID(),

                    email,

                    passwordHash,

                    salt

                });





            userRepository.setCurrentUserId(
                user.id
            );





            return {

                uid: user.id,

                email: user.email

            };

        },









        login: async (
            email: string,
            password: string
        ): Promise<AuthUser> => {



            validateCredentials(
                email,
                password
            );





            const user =
                userRepository.findByEmail(
                    email
                );





            const invalidCredentials =
                () =>
                    new Error(
                        "Invalid email or password."
                    );





            if (!user) {

                throw invalidCredentials();

            }





            const inputHash =
                Buffer.from(
                    hashPassword(
                        password,
                        user.salt
                    ),
                    "hex"
                );





            const storedHash =
                Buffer.from(
                    user.passwordHash,
                    "hex"
                );





            const isValid =
                inputHash.length === storedHash.length &&
                crypto.timingSafeEqual(
                    inputHash,
                    storedHash
                );





            if (!isValid) {

                throw invalidCredentials();

            }





            userRepository.setCurrentUserId(
                user.id
            );





            return {

                uid: user.id,

                email: user.email

            };


        },









        logout: async (): Promise<void> => {


            userRepository.setCurrentUserId(
                null
            );


        },









        getCurrentUser:
        async (): Promise<AuthUser | null> => {



            const uid =
                userRepository.getCurrentUserId();





            if (!uid) {

                return null;

            }





            const user =
                userRepository.getUserById(
                    uid
                );





            if (!user) {

                return null;

            }





            return {

                uid: user.id,

                email: user.email

            };


        }



    };


}




export default createAuthService();