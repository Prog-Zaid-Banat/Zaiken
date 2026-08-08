export {};

declare global {

    interface Window {

        zaiken: {

            auth: {
                login(
                    email:string,
                    password:string
                ): Promise<any>;

                register(
                    email:string,
                    password:string
                ): Promise<any>;

                logout(): Promise<any>;

                getCurrentUser(): Promise<any>;
            };

        };

    }

}