import { app, BrowserWindow } from "electron";
import path from "path";
import { bootstrap } from "./bootstrap";


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

            sandbox: false
        }

    });



    mainWindow.loadFile(
        path.join(
            __dirname,
            "../renderer/index.html"
        )
    );

    mainWindow.webContents.openDevTools();



    // فتح DevTools فقط في وضع التطوير
    if (process.argv.includes("--dev")) {

        mainWindow.webContents.openDevTools();

    }



    mainWindow.on(
        "closed",
        () => {

            mainWindow = null;

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


    } catch (error) {


        console.error(
            "[Zaiken] Fatal startup error:",
            error
        );


        app.quit();

    }

}



start();




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