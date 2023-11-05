Electron.ipcRenderer.on("playing-info-update", (event, playingInfo) => {
    if (playingInfo == null) {
        document.getElementById("info_title").src = "";
        document.getElementById("info_artist").src = "";
        document.getElementById("picture").src = "../img/icon/music.svg";
        return;
    }
    document.getElementById("info_title").innerText = playingInfo.title;
    document.getElementById("info_artist").innerText = playingInfo.artist;
    document.getElementById("picture").src = playingInfo.picture;
});
Electron.ipcRenderer.on("playing-status", (event, isSounding) => {
    document.getElementById("play").firstElementChild.src = isSounding ? "../img/icon/pause.svg" : "../img/icon/play-one.svg";
});

window.addEventListener("load", () => {
    document.getElementById("previous").onclick
        = document.getElementById("play").onclick
        = document.getElementById("next").onclick
        = document.getElementById("restore").onclick
        = function () {
            Electron.ipcRenderer.send("simpmode-window", this.id);
        };
});