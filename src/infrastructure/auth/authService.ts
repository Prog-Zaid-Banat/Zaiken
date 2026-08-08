export const authService = {

    async register(
        email: string,
        password: string
    ) {

        // مؤقتاً إلى أن تربطه مع Supabase
        console.log(
            "[Auth] Register:",
            email
        );


        return {
            success: true,
            user: {
                id: crypto.randomUUID(),
                email
            }
        };
    },


    async login(
        email: string,
        password: string
    ) {

        console.log(
            "[Auth] Login:",
            email
        );


        return {
            success: true,
            user: {
                id: crypto.randomUUID(),
                email
            }
        };
    }

};