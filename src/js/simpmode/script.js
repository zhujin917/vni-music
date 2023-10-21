ipcRenderer.on("playing-info-update", (event, playingInfo) => {
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
ipcRenderer.on("playing-status", (event, isPlayingSound) => {
    document.getElementById("play").firstElementChild.src = isPlayingSound ? "../img/icon/pause.svg" : "../img/icon/play-one.svg";
});

window.addEventListener("load", () => {
    document.getElementById("previous").onclick
        = document.getElementById("play").onclick
        = document.getElementById("next").onclick
        = document.getElementById("restore").onclick
        = function () {
            ipcRenderer.send("simpmode-window", this.id);
        };
});