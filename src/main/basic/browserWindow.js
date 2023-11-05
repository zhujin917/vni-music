const path = require("path");
const { screen, Menu, BrowserWindow } = require("electron");

let create = {
    main() {
        let mainWindow = new BrowserWindow({
            width: 1000,
            height: 660,
            minWidth: 780,
            minHeight: 520,
            frame: false,
            show: true,
            backgroundColor: "#f5f5f5",
            titleBarStyle: "hidden",
            titleBarOverlay: true,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
                webviewTag: true
            }
        });
        Menu.setApplicationMenu(null);
        mainWindow.loadFile(path.join(__dirname, "../../html/main.html"));
        mainWindow.on("close", (evt) => {
            evt.preventDefault();
            mainWindow.hide();
        });
        return mainWindow;
    },

    simp() {
        let simpWindow = new BrowserWindow({
            x: screen.getCursorScreenPoint().x,
            y: screen.getCursorScreenPoint().y,
            height: 54,
            width: 344,
            frame: false,
            transparent: true,
            resizable: false,
            skipTaskbar: true,
            alwaysOnTop: true,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
            }
        });
        simpWindow.loadURL(path.join(__dirname, "../../html/simpmode.html"));
        return simpWindow;
    },

    lyric() {
        let lyricWindow = new BrowserWindow({
            height: 110,
            width: 600,
            minHeight: 90,
            minWidth: 320,
            frame: false,
            transparent: true,
            skipTaskbar: true,
            alwaysOnTop: true,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
            }
        });
        lyricWindow.loadURL(path.join(__dirname, "../../html/desktoplyric.html"));
        lyricWindow.on("minimize", () => {
            lyricWindow.close();
        });
        return lyricWindow;
    },

    mp3Modify() {
        let mp3ModifyWindow = new BrowserWindow({
            width: 420,
            height: 680,
            frame: false,
            resizable: false,
            show: false,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
                webviewTag: true
            }
        });
        mp3ModifyWindow.loadFile(path.join(__dirname, "../../html/mp3modify.html"));
        return mp3ModifyWindow;
    }
};

module.exports.createBrowserWindow = (name) => create[name]();