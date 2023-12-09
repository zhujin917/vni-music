const path = require("path");
const { BrowserWindow, nativeImage } = require("electron");

module.exports.createThumbarButtons = (mainWindowId, isSounding) => {
    let mainWindow = BrowserWindow.fromId(mainWindowId);
    return [
        {
            tooltip: "上一曲",
            icon: nativeImage.createFromPath(path.join(__dirname, "../../img/icon/tb_previous.png")),
            click() {
                mainWindow.webContents.send("out-control", "previous");
            }
        }, {
            tooltip: isSounding ? "暂停" : "播放",
            icon: nativeImage.createFromPath(path.join(__dirname, isSounding ? "../../img/icon/tb_pause.png" : "../../img/icon/tb_play.png")),
            click() {
                mainWindow.webContents.send("out-control", "play");
            }
        }, {
            tooltip: "下一曲",
            icon: nativeImage.createFromPath(path.join(__dirname, "../../img/icon/tb_next.png")),
            click() {
                mainWindow.webContents.send("out-control", "next");
            }
        }
    ];
};