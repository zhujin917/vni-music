const path = require("path");
const Electron = require("electron");

const { createBrowserWindow } = require("./basic/browserWindow");
const { createTrayMenu } = require("./basic/TrayMenu");
const { createThumbarButtons } = require("./basic/thumbarButtons");

const { getSongInfo } = require("./function/getSongInfo");
const { lrcStr2synchronisedLyrics } = require("./function/lrcStr2synchronisedLyrics");

const nodeId3 = require("node-id3");

// Blocking multiple startups
Electron.app.on("second-instance", () => {
    mainWindow.show();
    mainWindow.focus();
});
if (!Electron.app.requestSingleInstanceLock()) {
    Electron.app.exit();
}

// Startup
let mainWindow, tray;
Electron.app.whenReady().then(() => {
    mainWindow = createBrowserWindow("main");
    mainWindow.webContents.on("did-finish-load", () => {
        setThumbarButtons();
        setTitleBarOverlay("#f5f5f5");
        // mainWindow.webContents.openDevTools({ mode: "right" });
    });

    tray = new Electron.Tray(path.join(__dirname, "../img/logo.png"));
    tray.setToolTip("维念音乐");
    tray.on("click", () => {
        mainWindow.show();
        mainWindow.focus();
    });
    loadTray();
});

// Basic API
function loadTray() {
    tray.setContextMenu(createTrayMenu(mainWindow.id, isSounding));
};
function setThumbarButtons() {
    mainWindow.setThumbarButtons(createThumbarButtons(mainWindow.id, isSounding));
};
function setTitleBarOverlay(color) {
    mainWindow.setTitleBarOverlay({
        color: color,
        symbolColor: "#000000",
        height: 30
    });
};
Electron.ipcMain.on("set-overlay-background", (event, color) => {
    setTitleBarOverlay(color);
});
Electron.ipcMain.on("show-open-dialog-sync", (event, options) => {
    event.returnValue = Electron.dialog.showOpenDialogSync(options);
});
Electron.ipcMain.on("popup-menu", (event, template, options) => {
    for (let i = 0; i < template.length; i += 1) {
        if (template[i].onclick == undefined) {
            continue;
        }
        template[i].click = () => {
            event.sender.executeJavaScript(`(${template[i].onclick})()`);
        };
    }
    Electron.Menu.buildFromTemplate(template).popup(options);
});
Electron.ipcMain.on("window-role", (event, role) => {
    let win = Electron.BrowserWindow.fromWebContents(event.sender);
    switch (role) {
        case "close":
            win.close();
            break;
        case "minimize":
            win.minimize();
            break;
    }
});

// Song API
let songsInfo = {};
Electron.ipcMain.handle("get-song-info", async (event, songPath) => {
    if (songsInfo[songPath] == undefined) {
        songsInfo[songPath] = await getSongInfo(songPath);
    }
    return songsInfo[songPath];
});

// Lyric API
Electron.ipcMain.on("get-id3-lyric", (event, songPath, callback) => {
    nodeId3.Promise.read(songPath).then((value) => {
        event.sender.executeJavaScript(`(${callback
            .replace("songPath", `songPath=\`${songPath.replaceAll("\\", "\\\\")}\``)
            .replace("lyric", `lyric=\`${JSON.stringify(value.synchronisedLyrics)}\``)
            })()`);
    });
});
Electron.ipcMain.on("set-id3-lyric", (event, songPath, lrcStr) => {
    nodeId3.update({
        synchronisedLyrics: [{
            timeStampFormat: nodeId3.TagConstants.TimeStampFormat.MILLISECONDS,
            contentType: nodeId3.TagConstants.SynchronisedLyrics.ContentType.LYRICS,
            synchronisedText: lrcStr2synchronisedLyrics(lrcStr)
        }]
    }, songPath);
});
Electron.ipcMain.on("lrc-to-synchronised-lyrics", (event, lrcStr) => {
    event.returnValue = lrcStr2synchronisedLyrics(lrcStr);
});

// Update playing info
let isPlaying = false;
let playingInfo = null;
Electron.ipcMain.on("playing-info", (event, title, artist, picture) => {
    if (title == undefined) {
        isPlaying = false;
        playingInfo = null;
        mainWindow.setThumbnailToolTip("");
    }
    else {
        isPlaying = true;
        playingInfo = {
            title: title,
            artist: artist,
            picture: picture
        };
        if (artist != undefined) {
            mainWindow.setThumbnailToolTip(`${title} - ${artist} - 维念音乐`);
        }
        else {
            mainWindow.setThumbnailToolTip(`${title} - 维念音乐`);
        }
    }
    if (simpWindow != undefined && !simpWindow.isDestroyed()) {
        simpWindow.webContents.send("playing-info-update", playingInfo);
    }
});

// Update sounding status
let isSounding = false;
Electron.ipcMain.on("playing-status", (event, unPaused) => {
    isSounding = unPaused;
    setThumbarButtons();
    loadTray();
    if (simpWindow != undefined && !simpWindow.isDestroyed()) {
        simpWindow.webContents.send("playing-status", isSounding);
    }
    if (lyricWindow != undefined && !lyricWindow.isDestroyed()) {
        lyricWindow.webContents.send("playing-status", isSounding);
    }
});

// All types of windows
let simpWindow;
Electron.ipcMain.on("simpmode", () => {
    mainWindow.hide();
    if (simpWindow != undefined && !simpWindow.isDestroyed()) {
        simpWindow.show();
        simpWindow.focus();
        return;
    }
    simpWindow = createBrowserWindow("simp");
    simpWindow.webContents.on("did-finish-load", () => {
        simpWindow.webContents.send("playing-status", isSounding);
        simpWindow.webContents.send("playing-info-update", playingInfo);
        // simpWindow.webContents.openDevTools({ mode: "undocked" });
    });
});
Electron.ipcMain.on("simpmode-window", (event, role) => {
    switch (role) {
        case "restore":
            simpWindow.close();
            mainWindow.show();
            break;
        default:
            mainWindow.webContents.send("out-control", role);
    }
});

let lyricWindow;
Electron.ipcMain.on("desktop-lyric", (evt) => {
    if (lyricWindow != undefined && !lyricWindow.isDestroyed()) {
        lyricWindow.close();
        evt.reply("desktop-lyric-callback", false);
        return;
    }
    lyricWindow = createBrowserWindow("lyric");
    lyricWindow.webContents.on("did-finish-load", () => {
        lyricWindow.webContents.send("playing-status", isSounding);
        // lyricWindow.webContents.openDevTools({ mode: "undocked" });
    });
    lyricWindow.on("closed", () => {
        mainWindow.send("desktop-lyric-callback", false);
    });
    evt.reply("desktop-lyric-callback", true);
});
Electron.ipcMain.on("desktop-lyric-window", (event, role) => {
    switch (role) {
        case "close":
            lyricWindow.close();
            break;
        case "ignore":
            lyricWindow.setIgnoreMouseEvents(true, { forward: true });
            break;
        case "notIgnore":
            lyricWindow.setIgnoreMouseEvents(false);
            break;
        default:
            mainWindow.webContents.send("out-control", role);
            break;
    }
});
Electron.ipcMain.on("lyric-update", (event, lrcTxt) => {
    if (lyricWindow == undefined || lyricWindow.isDestroyed()) {
        return;
    }
    lyricWindow.webContents.send("lyric-update", lrcTxt);
});

Electron.ipcMain.on("mp3-modify", (event, songs) => {
    let mp3ModifyWindow = createBrowserWindow("mp3Modify");
    mp3ModifyWindow.on("ready-to-show", () => {
        mp3ModifyWindow.show();
        mp3ModifyWindow.webContents.send("songs", songs);
        // mp3ModifyWindow.webContents.openDevTools();

        Electron.session.fromPartition("MP3MODIFY-webview").webRequest.onCompleted({
            urls: ["https://music.163.com/weapi/song/lyric?csrf_token="],
            types: ["xhr"]
        }, (details) => {
            mp3ModifyWindow.webContents.send("lyric-upload-data", details.uploadData);
        });
    });
});