let trayMenu = document.getElementById("tray-menu");

Electron.ipcRenderer.on("show-tray-menu", (event, isSounding) => {
    document.getElementById("play").innerText = isSounding ? "暂停" : "播放";
    setTimeout(() => {
        trayMenu.style.opacity = "1";
    }, 150);
});

window.addEventListener("blur", () => {
    trayMenu.style.transition = "none";
    trayMenu.style.opacity = "0";
    setTimeout(() => {
        trayMenu.style.transition = "";
    }, 200);
});

document.getElementById("play").onclick
    = document.getElementById("previous").onclick
    = document.getElementById("next").onclick
    = document.getElementById("exit").onclick
    = function () {
        Electron.ipcRenderer.send("tray-window", this.id);
    };

document.getElementById("about").onclick = () => {
    Electron.ipcRenderer.send("tray-window", "about", {
        message: "维念音乐",
        type: "info",
        buttons: ["确定"],
        title: "关于",
        detail: "版本：0.4.3 (测试版)\n网站：https://music.vnisoft.top\n作者：玖小柒 (https://jiuxiaoqi.top)\n\n版权所有 © 维念软件 2023。保留所有权利。",
        icon: path.join(__dirname, "../img/logo.png"),
        noLink: true
    });
};