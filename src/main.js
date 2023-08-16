const { app, BrowserWindow, Menu, ipcMain, nativeImage, session, dialog, screen, Tray } = require("electron");
const path = require("path");

const jsmediatags = require("jsmediatags");
const mp3Duration = require("mp3-duration");
const nodeId3 = require("node-id3");

app.on("second-instance", () => {
    mainWindow.show();
    mainWindow.focus();
});
if (!app.requestSingleInstanceLock()) {
    app.exit();
}

let mainWindow;
app.whenReady().then(() => {
    mainWindow = new BrowserWindow({
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
    mainWindow.loadFile(path.join(__dirname, "html/main.html"));
    mainWindow.webContents.on("did-finish-load", () => {
        setTitleBarOverlay("#f5f5f5");
        setThumbarButtons();
        // mainWindow.webContents.openDevTools({ mode: "right" });

        session.fromPartition("MP3MODIFY-webview").webRequest.onCompleted({
            urls: ["https://music.163.com/weapi/song/lyric?csrf_token="],
            types: ["xhr"]
        }, (details) => {
            mp3ModifyWindow.webContents.send("lyric-upload-data", details.uploadData);
        });
    });
    mainWindow.on("close", (ev) => {
        ev.preventDefault();
        mainWindow.hide();
    });

    loadTray();
});

let isPlaying = false;
let playingInfo = null;
ipcMain.on("playing-info", (event, title, artist, picture) => {
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

function setThumbarButtons() {
    mainWindow.setThumbarButtons([
        {
            tooltip: "上一曲",
            icon: nativeImage.createFromPath(path.join(__dirname, "img/icon/left-two.png")),
            click() {
                mainWindow.webContents.send("out-control", "previous");
            }
        }, {
            tooltip: isPlayingSound ? "暂停" : "播放",
            icon: nativeImage.createFromPath(path.join(__dirname, isPlayingSound ? "img/icon/pause-2.png" : "img/icon/play-one-1.png")),
            click() {
                mainWindow.webContents.send("out-control", "play");
            }
        }, {
            tooltip: "下一曲",
            icon: nativeImage.createFromPath(path.join(__dirname, "img/icon/right-two.png")),
            click() {
                mainWindow.webContents.send("out-control", "next");
            }
        }
    ]);
};
let isPlayingSound = false;
ipcMain.on("playing-status", (event, unPaused) => {
    isPlayingSound = unPaused;
    setThumbarButtons();
    loadTrayContextMenu();
    if (simpWindow != undefined && !simpWindow.isDestroyed()) {
        simpWindow.webContents.send("playing-status", isPlayingSound);
    }
});

function setTitleBarOverlay(color) {
    mainWindow.setTitleBarOverlay({
        color: color,
        symbolColor: "#000000",
        height: 30
    });
};
ipcMain.on("set-overlay-background", (event, color) => {
    setTitleBarOverlay(color);
});

let simpWindow;
ipcMain.on("simpmode", () => {
    mainWindow.hide();
    simpWindow = new BrowserWindow({
        x: screen.getCursorScreenPoint().x,
        y: screen.getCursorScreenPoint().y,
        height: 50,
        width: 340,
        frame: false,
        resizable: false,
        show: false,
        skipTaskbar: true,
        alwaysOnTop: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        }
    });
    simpWindow.loadURL(path.join(__dirname, "html/simpmode.html"));
    simpWindow.on("ready-to-show", () => {
        simpWindow.show();
        simpWindow.webContents.send("playing-status", isPlayingSound);
        simpWindow.webContents.send("playing-info-update", playingInfo);
        // simpWindow.webContents.openDevTools({ mode: "undocked" });
    });
});
ipcMain.on("simpmode-control", (event, type) => {
    if (type == "restore") {
        simpWindow.close();
        mainWindow.show();
        return;
    }
    mainWindow.webContents.send("out-control", type);
});

let lyricWindow;
ipcMain.on("desktop-lyric", (evt) => {
    if (lyricWindow != undefined && !lyricWindow.isDestroyed()) {
        lyricWindow.close();
        evt.returnValue = false;
        return;
    }
    lyricWindow = new BrowserWindow({
        height: screen.getPrimaryDisplay().workArea.height,
        width: screen.getPrimaryDisplay().workArea.width,
        frame: false,
        resizable: false,
        transparent: true,
        show: false,
        skipTaskbar: true,
        alwaysOnTop: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        }
    });
    lyricWindow.loadURL(path.join(__dirname, "html/desktoplyric.html"));
    lyricWindow.on("ready-to-show", () => {
        lyricWindow.show();
        // lyricWindow.webContents.openDevTools({ mode: "undocked" });
    });
    lyricWindow.setIgnoreMouseEvents(true);
    evt.returnValue = true;
});
ipcMain.on("lyric-update", (event, lrcTxt) => {
    if (lyricWindow == undefined || lyricWindow.isDestroyed()) {
        return;
    }
    lyricWindow.webContents.send("lyric-update", lrcTxt);
});
ipcMain.on("keypress", (event, key) => {
    if (lyricWindow == undefined || lyricWindow.isDestroyed()) {
        return;
    }
    lyricWindow.webContents.send("kp", key);
});

ipcMain.on("popup-menu", (event, template, options) => {
    for (let i = 0; i < template.length; i += 1) {
        if (template[i].onclick == undefined) {
            continue;
        }
        template[i].click = () => {
            event.sender.executeJavaScript(`(${template[i].onclick})()`);
        };
    }
    Menu.buildFromTemplate(template).popup(options);
});

ipcMain.on("show-open-dialog-sync", (event, options) => {
    event.returnValue = dialog.showOpenDialogSync(options);
});

let songsInfo = {};
ipcMain.on("get-mp3-info", (event, song, callback) => {
    function executeCallback() {
        event.sender.executeJavaScript(`(${callback
            .replace("songPath", `songPath="${song.replaceAll("\\", "\\\\")}"`)
            .replace("songInfo", `songInfo=${JSON.stringify(songsInfo[song])}`)
            })()`);
    };

    if (songsInfo[song] != undefined) {
        executeCallback();
        return;
    }

    let tagsCompleted = false;
    new jsmediatags.Reader(song).setTagsToRead(
        ["title", "artist", "album"]
    ).read({
        onSuccess: (tag) => {
            if (songsInfo[song] == undefined) {
                songsInfo[song] = {};
            }
            songsInfo[song]["title"] = tag.tags.title;
            songsInfo[song]["artist"] = tag.tags.artist;
            songsInfo[song]["album"] = tag.tags.album;
            tagsCompleted = true;
            if (durationCompleted) {
                executeCallback();
            }
        },
        onError: () => {
            tagsCompleted = true;
            if (durationCompleted) {
                executeCallback();
            }
        }
    });

    let durationCompleted = false;
    mp3Duration(song, true, (err, duration) => {
        if (songsInfo[song] == undefined) {
            songsInfo[song] = {};
        }
        songsInfo[song]["duration"] = duration;
        durationCompleted = true;
        if (tagsCompleted) {
            executeCallback();
        }
    });
});

let mp3ModifyWindow;
ipcMain.on("mp3-modify", (event, songs) => {
    mp3ModifyWindow = new BrowserWindow({
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
    mp3ModifyWindow.loadFile(path.join(__dirname, "html/mp3modify.html"));
    mp3ModifyWindow.on("ready-to-show", () => {
        mp3ModifyWindow.show();
        mp3ModifyWindow.webContents.send("songs", songs);
        // mp3ModifyWindow.webContents.openDevTools();
    });
});
ipcMain.on("mp3-modify-window", (event, role) => {
    switch (role) {
        case "close":
            mp3ModifyWindow.close();
            break;
        case "minimize":
            mp3ModifyWindow.minimize();
            break;
    }
});

ipcMain.on("get-id3-lyric", (event, songPath, callback) => {
    nodeId3.Promise.read(songPath).then((value) => {
        event.sender.executeJavaScript(`(${callback
            .replace("songPath", `songPath=\`${songPath.replaceAll("\\", "\\\\")}\``)
            .replace("lyric", `lyric=\`${JSON.stringify(value.synchronisedLyrics)}\``)
            })()`);
    });
});
ipcMain.on("set-id3-lyric", (event, songPath, lrcStr) => {
    nodeId3.update({
        synchronisedLyrics: [{
            timeStampFormat: nodeId3.TagConstants.TimeStampFormat.MILLISECONDS,
            contentType: nodeId3.TagConstants.SynchronisedLyrics.ContentType.LYRICS,
            synchronisedText: lrcStr2synchronisedLyrics(lrcStr)
        }]
    }, songPath);
});
ipcMain.on("lrc-to-synchronised-lyrics", (event, lrcStr) => {
    event.returnValue = lrcStr2synchronisedLyrics(lrcStr);
});
function lrcStr2synchronisedLyrics(lrcStr) {
    let syncLyrics = [];
    lrcStr.split("\n").forEach((lrc) => {
        let timeStr;
        let regex = new RegExp(/\[[\s\S]*?\]/g);
        while ((timeStr = regex.exec(lrc)) !== null) {
            let text = lrc.substring(lrc.lastIndexOf("]") + 1);
            if (text[text.length - 1] == "\r") {
                text = text.substring(0, text.length - 1);
            }

            let time = timeStr[0].substring(1, timeStr[0].length - 2);
            let timeStamp = Math.floor(Number(time.split(":")[0]) * 60 * 1000 + Number(time.split(":")[1]) * 1000);
            if (isNaN(timeStamp)) {
                timeStamp = 0;
            }

            syncLyrics.push({
                text: text,
                timeStamp: timeStamp
            });
        }
    });
    syncLyrics.sort((a, b) => {
        return a.timeStamp - b.timeStamp;
    });
    if (syncLyrics[0].timeStamp != 0) {
        syncLyrics.unshift({
            text: "",
            timeStamp: 0
        });
    }
    return syncLyrics;
};

let tray = null;
function loadTray() {
    tray = new Tray(path.join(__dirname, "img/logo.png"));
    tray.setToolTip("维念音乐");
    tray.on("click", () => {
        mainWindow.show();
        mainWindow.focus();
    });
    loadTrayContextMenu(false);
};
function loadTrayContextMenu() {
    tray.setContextMenu(Menu.buildFromTemplate([
        {
            label: "维念音乐",
            enabled: false
        }, {
            label: isPlayingSound ? "暂停" : "播放",
            icon: nativeImage.createFromPath(path.join(__dirname, isPlayingSound ? "img/icon/pause.png" : "img/icon/play-one.png")),
            click() {
                mainWindow.webContents.send("out-control", "play");
            }
        }, {
            label: "上一首",
            icon: nativeImage.createFromPath(path.join(__dirname, "img/icon/go-start.png")),
            click() {
                mainWindow.webContents.send("out-control", "previous");
            }
        }, {
            label: "下一首",
            icon: nativeImage.createFromPath(path.join(__dirname, "img/icon/go-end.png")),
            click() {
                mainWindow.webContents.send("out-control", "next");
            }
        }, {
            type: "separator"
        }, {
            label: "关于",
            click() {
                dialog.showMessageBox({
                    message: "维念音乐",
                    type: "info",
                    buttons: ["确定"],
                    title: "关于",
                    detail: "版本：0.1.5 (测试版)\n网站：https://music.vnisoft.top\n作者：玖小柒 (https://jiuxiaoqi.top)\n\n版权所有 © 维念软件 2023。保留所有权利。",
                    icon: path.join(__dirname, "img/logo.png"),
                    noLink: true
                });
            }
        }, {
            label: "退出",
            click() {
                app.exit();
            }
        }
    ]));
};