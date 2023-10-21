let locked = false;

ipcRenderer.on("lyric-update", (event, lrcTxt) => {
    document.getElementById("lrc").innerHTML = lrcTxt;
});
ipcRenderer.on("playing-status", (event, isPlayingSound) => {
    document.getElementById("play").firstElementChild.src = isPlayingSound ? "../img/icon/pause.svg" : "../img/icon/play-one.svg";
});

window.addEventListener("load", () => {
    document.getElementById("previous").onclick
        = document.getElementById("play").onclick
        = document.getElementById("next").onclick
        = document.getElementById("close").onclick
        = function () {
            ipcRenderer.send("desktop-lyric-window", this.id);
        };

    document.getElementById("lock").addEventListener("click", () => {
        locked = true;
        document.body.classList.add("locked");
        document.getElementById("unlock").style.opacity = "0";
        ipcRenderer.send("desktop-lyric-window", "ignore");
    });
    document.getElementById("unlock").addEventListener("click", () => {
        locked = false;
        document.body.classList.remove("locked");
        document.getElementById("unlock").style.opacity = "0";
        ipcRenderer.send("desktop-lyric-window", "notIgnore");
    });

    document.getElementById("lrc").addEventListener("mouseenter", () => {
        if (locked) {
            document.getElementById("unlock").style.opacity = "1";
        }
    });
    document.getElementById("lrc").addEventListener("mouseleave", () => {
        if (locked) {
            document.getElementById("unlock").style.opacity = "0";
        }
    });
    document.getElementById("unlock").addEventListener("mouseenter", () => {
        if (locked) {
            document.getElementById("unlock").style.opacity = "1";
            ipcRenderer.send("desktop-lyric-window", "notIgnore");
        }
    });
    document.getElementById("unlock").addEventListener("mouseleave", () => {
        if (locked) {
            document.getElementById("unlock").style.opacity = "0";
            ipcRenderer.send("desktop-lyric-window", "ignore");
        }
    });
});