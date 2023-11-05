const path = require("path");
const { app, dialog, BrowserWindow, nativeImage, Menu } = require("electron");

module.exports.createTrayMenu = (mainWindowId, isSounding) => {
    let mainWindow = BrowserWindow.fromId(mainWindowId);
    return Menu.buildFromTemplate([
        {
            label: "维念音乐",
            enabled: false
        }, {
            label: isSounding ? "暂停" : "播放",
            icon: nativeImage.createFromPath(path.join(__dirname, isSounding ? "../../img/icon/pause.png" : "../../img/icon/play-one.png")),
            click() {
                mainWindow.webContents.send("out-control", "play");
            }
        }, {
            label: "上一首",
            icon: nativeImage.createFromPath(path.join(__dirname, "../../img/icon/go-start.png")),
            click() {
                mainWindow.webContents.send("out-control", "previous");
            }
        }, {
            label: "下一首",
            icon: nativeImage.createFromPath(path.join(__dirname, "../../img/icon/go-end.png")),
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
                    detail: "版本：0.3.1 (测试版)\n网站：https://music.vnisoft.top\n作者：玖小柒 (https://jiuxiaoqi.top)\n\n版权所有 © 维念软件 2023。保留所有权利。",
                    icon: path.join(__dirname, "../../img/logo.png"),
                    noLink: true
                });
            }
        }, {
            label: "退出",
            click() {
                app.exit();
            }
        }
    ]);
};