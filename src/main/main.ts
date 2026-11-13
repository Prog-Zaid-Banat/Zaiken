import { app, BrowserWindow } from "electron";
import path from "path";
import { bootstrap, shutdownRuntime } from "./bootstrap";
import { setMainWindow } from "./windowRegistry";

const IS_SMOKE_TEST = process.argv.includes("--smoke-test");
const IS_DEV = process.argv.includes("--dev");

let mainWindow: BrowserWindow | null = null;



function createWindow(): void {

    mainWindow = new BrowserWindow({

        width: 1400,
        height: 900,

        minWidth: 1000,
        minHeight: 700,

        webPreferences: {

            preload: path.join(
                __dirname,
                "preload.js"
            ),

            contextIsolation: true,

            nodeIntegration: false,

            sandbox: true
        }

    });

    setMainWindow(mainWindow);



    mainWindow.loadFile(
        path.join(
            __dirname,
            "../renderer/index.html"
        )
    );


    // Phase 3: DevTools only in development mode — never in production.
    if (IS_DEV) {

        mainWindow.webContents.openDevTools({ mode: "detach" });

    }


    // Phase 3: smoke-test instrumentation for scripts/electron-smoke.js
    if (IS_SMOKE_TEST) {

        mainWindow.webContents.once("did-fail-load", (_event, code, desc) => {

            console.error(
                "[Zaiken] SMOKE renderer load failed:",
                code,
                desc
            );

            app.exit(1);

        });

        mainWindow.webContents.once("did-finish-load", () => {

            console.log(
                "[Zaiken] SMOKE renderer loaded"
            );

        });

    }



    mainWindow.on(
        "closed",
        () => {

            mainWindow = null;
            setMainWindow(null);

        }
    );

}




async function start(): Promise<void> {

    try {


        await app.whenReady();


        await bootstrap();


        createWindow();


        console.log(
            "[Zaiken] Application started successfully"
        );


        if (IS_SMOKE_TEST) {

            setTimeout(
                () => {

                    console.log(
                        "[Zaiken] SMOKE window open; quitting"
                    );

                    app.quit();

                },
                6000
            );

        }


    } catch (error) {


        console.error(
            "[Zaiken] Fatal startup error:",
            error
        );


        if (IS_SMOKE_TEST) {

            app.exit(1);

        } else {

            app.quit();

        }

    }

}



start();

app.on("before-quit", () => {
    shutdownRuntime();
});




// Windows / Linux
app.on(
    "window-all-closed",
    () => {

        if (process.platform !== "darwin") {

            app.quit();

        }

    }
);




// macOS
app.on(
    "activate",
    () => {

        if (mainWindow === null) {

            createWindow();

        }

    }
);
