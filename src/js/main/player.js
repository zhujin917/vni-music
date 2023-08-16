let playing = false;
let playMode = "listed-loop";
let player = document.getElementById("player_audio");

let playlist = [];
let playlistWater = [];

function switchPlayingStatus(isPlaying) {
    document.getElementById("player_left").style.display = isPlaying ? "block" : "none";
    document.getElementById("player_right").style.display = isPlaying ? "block" : "none";
    document.getElementById("player_center_progress_c").style.display = isPlaying ? "block" : "none";
    document.getElementById("player_center_mask").style.display = isPlaying ? "none" : "block";
    if (!isPlaying) {
        document.getElementById("lyric").style.top = "";
        document.getElementById("player_left_pic_mask").firstElementChild.style.transform = "translate(-50%, -50%)";
    }
};

function addToPlayList(list, isReplace, restorePlayingPathParam) {
    if (isReplace) {
        playlist = [];
        playlistWater = [];
    }
    list.forEach((s) => {
        if (playlist.indexOf(s) != -1) {
            return;
        }
        playlist.push(s);
        playlistWater.push(0);
    });
    loadPlayList(restorePlayingPathParam);
};

let infoLoaded;
let restorePlayingPath;
function showPlayListContent() {
    document.getElementById("playlist_content").remove();
    document.getElementById("playlist_content_n").hidden = false;
    document.getElementById("playlist_content_n").id = "playlist_content";

    if (restorePlayingPath == undefined) {
        return;
    }
    let playingDom = document.querySelector(`div[data-songpath="${encodeURI(restorePlayingPath)}"]`);
    if (playingDom == undefined) {
        stopPlaying();
        return;
    }
    playingDom.firstElementChild.innerHTML = `
        <img src="../img/icon/acoustic.svg" />
    `;
    playingDom.classList.add("item-playing");
};
function loadPlayList(restorePlayingPathParam) {
    restorePlayingPath = restorePlayingPathParam;

    let listContentDom = document.createElement("div");
    listContentDom.id = "playlist_content_n";
    listContentDom.classList.add("playlist-content");
    if (document.getElementById("playlist_content").innerHTML != "") {
        listContentDom.hidden = true;
    }
    document.getElementById("playlist").appendChild(listContentDom);
    document.getElementById("playlist_num").innerText = `共 ${playlist.length} 首`;

    if (playlist.length == 0) {
        showPlayListContent();
        return;
    }

    let count = 0;
    infoLoaded = 0;
    playlist.forEach((songPath) => {
        count += 1;
        let d = document.createElement("div");
        d.classList.add("item");
        if (count % 2 == 1) {
            d.classList.add("item-odd")
        }
        d.setAttribute("data-songnum", count);
        d.setAttribute("data-songpath", encodeURI(songPath));
        d.innerHTML = `
            <div class="content num">${count}</div>
            <div class="content title"></div>
            <div class="content artist"></div>
            <div class="content time"></div>
        `;
        d.addEventListener("dblclick", function () {
            this.classList.remove("item-focused");
            playNow(decodeURI(this.getAttribute("data-songpath")));
        });
        d.addEventListener("click", function (ev) {
            if (ev.shiftKey && document.getElementsByClassName("item-focused").length == 1) {
                let anotherFocusedNum = document.getElementsByClassName("item-focused")[0].getAttribute("data-songnum") - 1;
                for (let i = Math.min(Number(anotherFocusedNum), this.getAttribute("data-songnum") - 1);
                    i <= Math.max(Number(anotherFocusedNum), this.getAttribute("data-songnum") - 1); i += 1) {
                    listContentDom.children[i].classList.add("item-focused");
                }
                return;
            }
            if (document.getElementsByClassName("item-focused").length == 1 && this.classList.contains("item-focused")) {
                this.classList.remove("item-focused");
                return;
            }
            let oldFocused = [];
            if (!ev.ctrlKey) {
                for (let dom of document.getElementsByClassName("item-focused")) {
                    oldFocused.push(dom);
                }
                oldFocused.forEach((dom) => {
                    dom.classList.remove("item-focused");
                });
            }
            if (this.classList.contains("item-focused")) {
                this.classList.remove("item-focused");
                return;
            }
            this.classList.add("item-focused");
        });
        listContentDom.appendChild(d);

        ipcRenderer.send("get-mp3-info", songPath, ((songPath, songInfo) => {
            let qsList = document.querySelectorAll(`div[data-songpath="${encodeURI(songPath)}"]`);
            for (let dom of qsList[qsList.length - 1].children) {
                if (dom.classList.contains("title")) {
                    dom.innerText = (songInfo.title == undefined) ? songPath.substring(songPath.lastIndexOf("\\") + 1) : songInfo.title;
                }
                else if (dom.classList.contains("artist") && songInfo.artist != undefined) {
                    dom.innerText = songInfo.artist;
                }
                else if (dom.classList.contains("album") && songInfo.album != undefined) {
                    dom.innerText = songInfo.album;
                }
                else if (dom.classList.contains("time") && songInfo.duration != undefined) {
                    dom.innerText = sec2str(songInfo.duration);
                }
            }
            infoLoaded += 1;
            if (infoLoaded == playlist.length) {
                showPlayListContent();
            }
        }).toString());
    });
};

let nxtLrcTs, nxtLrcCount;
function playNow(songPath) {
    playing = true;
    player.src = songPath;
    player.play();
    nxtLrcTs = null;

    new jsmediatags.Reader(songPath).setTagsToRead(
        ["title", "artist", "picture"]
    ).read({
        onSuccess: (tag) => {
            document.getElementById("player_left_song").innerText
                = document.getElementById("lyric_left_m_t").innerText
                = (tag.tags.title == undefined) ? songPath.substring(songPath.lastIndexOf("\\") + 1) : tag.tags.title;

            document.getElementById("player_left_singer").innerText
                = document.getElementById("lyric_left_m_a").innerText
                = (tag.tags.artist == undefined) ? "" : tag.tags.artist;

            document.getElementById("player_left_pic").src
                = document.getElementById("lyric_left_m_pic").src = getPicBase64(tag.tags.picture);

            ipcRenderer.send("playing-info",
                document.getElementById("player_left_song").innerText,
                tag.tags.artist,
                document.getElementById("lyric_left_m_pic").src
            );
        }
    });

    ipcRenderer.send("get-id3-lyric", songPath, ((songPath, lyric) => {
        document.getElementById("lyric_right_c").innerHTML = "";
        let synchronisedText;
        if (lyric == "undefined") {
            let lrcFilePath = songPath.substring(0, songPath.length - 4) + ".lrc";
            if (!fs.existsSync(lrcFilePath)) {
                return;
            }
            synchronisedText = ipcRenderer.sendSync("lrc-to-synchronised-lyrics", fs.readFileSync(lrcFilePath).toString());
        }
        else {
            synchronisedText = JSON.parse(lyric)[0].synchronisedText;
        }
        synchronisedText.forEach((lrc) => {
            if (lrc.text == "") {
                return;
            }
            if (nxtLrcTs == null) {
                nxtLrcTs = lrc.timeStamp;
                nxtLrcCount = 0;
            }
            let d = document.createElement("div");
            d.classList.add("lrc");
            d.setAttribute("data-n", document.getElementById("lyric_right_c").children.length);
            d.setAttribute("data-ts", lrc.timeStamp);
            d.innerHTML = lrc.text;
            d.addEventListener("click", function () {
                setCurrentTime((Number(this.getAttribute("data-ts")) + 1) / 1000);
            });
            document.getElementById("lyric_right_c").appendChild(d);
        });
        document.getElementById("lyric_right_c").scrollTo({
            left: 0, top: 0,
            behavior: "instant"
        });
    }).toString());

    switchPlayingStatus(true);

    for (let i in playlistWater) {
        playlistWater[i] += 1;
    }
    playlistWater[
        Number(document.querySelector(`div[data-songpath="${encodeURI(songPath)}"]`).getAttribute("data-songnum")) - 1
    ] = 0;
};

function stopPlaying() {
    playing = false;
    player.pause();
    switchPlayingStatus(false);
    setTimeout(() => {
        document.getElementById("player_center_progress_l").innerHTML = "00:00";
        document.getElementById("player_center_progress_r").innerHTML = "00:00";
        document.getElementById("player_center_progress_i").style.width = "";

        ipcRenderer.send("playing-info", undefined);
    }, 300);

    if (document.getElementById("wbv").getTitle() == "vni-music/SONGLIST") {
        document.getElementById("wbv").send("playing-song", undefined);
    }
};

function getRandomSongPath() {
    let sum = 0;
    playlistWater.forEach((plw) => {
        sum += plw;
    });
    let rn = Math.floor(Math.random() * (sum + 1));

    let count = 0;
    sum = 0;
    for (let plw of playlistWater) {
        sum += plw;
        if (sum >= rn) {
            break;
        }
        count += 1;
    }
    return playlist[count];
};

player.addEventListener("loadedmetadata", function () {
    document.getElementById("player_center_progress_r").innerText = sec2str(this.duration);
});
player.addEventListener("play", function () {
    ipcRenderer.send("playing-status", true);
    document.getElementById("player_center_play").firstElementChild.src = "../img/icon/pause.svg";

    let oldPlayingDom = document.getElementsByClassName("item-playing");
    if (oldPlayingDom.length > 0) {
        oldPlayingDom[0].firstElementChild.innerText = oldPlayingDom[0].getAttribute("data-songnum");
        oldPlayingDom[0].classList.remove("item-playing");
    }

    let playingDom = document.querySelector(`div[data-songpath="${encodeURI(getCurrentSrc())}"]`);
    playingDom.firstElementChild.innerHTML = `<img src="../img/icon/acoustic.svg" />`;
    playingDom.classList.add("item-playing");

    document.getElementById("wbv").send("playing-song", encodeURI(getCurrentSrc()));
});
player.addEventListener("pause", function () {
    ipcRenderer.send("playing-status", false);
    document.getElementById("player_center_play").firstElementChild.src = "../img/icon/play-one.svg";
});
player.addEventListener("timeupdate", function () {
    if (pagexDraggingProgressC != null) {
        return;
    }
    document.getElementById("player_center_progress_l").innerText = sec2str(this.currentTime);
    document.getElementById("player_center_progress_i").style.width
        = document.getElementById("player_center_progress_c").style.left
        = `${100 * this.currentTime / this.duration}%`;

    if (nxtLrcTs != null && this.currentTime * 1000 >= nxtLrcTs
        && this.currentTime * 1000 >= Number(document.getElementById("lyric_right_c").children[nxtLrcCount].getAttribute("data-ts"))) {
        if (document.getElementsByClassName("lrc-focused")[0] != undefined) {
            document.getElementsByClassName("lrc-focused")[0].classList.remove("lrc-focused");
        }

        let currentLrcDom = document.getElementById("lyric_right_c").children[nxtLrcCount];
        currentLrcDom.classList.add("lrc-focused");
        if (new Date().getTime() - lyricScrolledTime >= 1500) {
            document.getElementById("lyric_right_c").scrollTo({
                left: 0,
                top: currentLrcDom.offsetTop - document.getElementById("lyric_right_c").clientHeight * 0.25 - 50,
                behavior: "smooth"
            });
        }

        ipcRenderer.send("lyric-update", currentLrcDom.innerText);

        let nxtLrcDom = document.querySelector(`div[data-ts="${nxtLrcTs}"]`).nextElementSibling;
        if (nxtLrcDom != undefined) {
            nxtLrcTs = Number(nxtLrcDom.getAttribute("data-ts"));
            nxtLrcCount += 1;
        }
    }
});
player.addEventListener("ended", function () {
    switch (playMode) {
        case "listed-loop":
        case "shuffle":
            document.getElementById("player_center_next").click();
            break;
        case "single-loop":
            playNow(getCurrentSrc());
            break;
    }
});

document.getElementById("player_center_play").addEventListener("click", () => {
    if (!playing) {
        return;
    }
    if (player.paused) {
        player.play();
    }
    else {
        player.pause();
    }
});
document.getElementById("player_center_previous").addEventListener("click", () => {
    if (!playing) {
        return;
    }
    if (playMode == "listed-loop" || playMode == "single-loop") {
        if (playlist.indexOf(getCurrentSrc()) == 0) {
            playNow(playlist[playlist.length - 1]);
            return;
        }
        playNow(playlist[playlist.indexOf(getCurrentSrc()) - 1]);
        return;
    }
    playNow(getRandomSongPath());
});
document.getElementById("player_center_next").addEventListener("click", () => {
    if (!playing) {
        return;
    }
    if (playMode == "listed-loop" || playMode == "single-loop") {
        if (playlist.indexOf(getCurrentSrc()) == playlist.length - 1) {
            playNow(playlist[0]);
            return;
        }
        playNow(playlist[playlist.indexOf(getCurrentSrc()) + 1]);
        return;
    }
    playNow(getRandomSongPath());
});
document.getElementById("player_center_mode").addEventListener("click", () => {
    switch (playMode) {
        case "listed-loop":
            playMode = "single-loop";
            document.getElementById("player_center_mode").firstElementChild.src = "../img/icon/play-once.svg";
            break;
        case "single-loop":
            playMode = "shuffle";
            document.getElementById("player_center_mode").firstElementChild.src = "../img/icon/shuffle-one.svg";
            break;
        case "shuffle":
            playMode = "listed-loop";
            document.getElementById("player_center_mode").firstElementChild.src = "../img/icon/loop-once.svg";
            break;
    }
});

let pagexDraggingProgressC = null;
let mxDraggingProgressC;
function updateProgressStat(pagex) {
    let n = mxDraggingProgressC + pagex
        - ((document.getElementById("player").clientWidth - document.getElementById("player_center").clientWidth) / 2)
        - document.getElementById("player_center_progress").offsetLeft - pagexDraggingProgressC;
    if (n < 0) {
        n = 0;
    }
    else if (n > document.getElementById("player_center_progress").clientWidth) {
        n = document.getElementById("player_center_progress").clientWidth;
    }
    document.getElementById("player_center_progress_c").style.left = `${n}px`;
    document.getElementById("player_center_progress_i").style.width = `${n}px`;
};
document.getElementById("player_center_progress").addEventListener("mousedown", (ev) => {
    pagexDraggingProgressC = 0;
    mxDraggingProgressC = 0;
    updateProgressStat(ev.pageX);
});
document.getElementById("player_center_progress_c").addEventListener("mousedown", (ev) => {
    ev.stopPropagation();
    mxDraggingProgressC = 5;
    pagexDraggingProgressC = ev.offsetX;
});
window.addEventListener("mousemove", (ev) => {
    if (pagexDraggingProgressC == null) {
        return;
    }
    updateProgressStat(ev.pageX);
});
window.addEventListener("mouseup", () => {
    if (pagexDraggingProgressC == null) {
        return;
    }
    confirmProgress();
    pagexDraggingProgressC = null;
});
function confirmProgress() {
    setCurrentTime(player.duration * document.getElementById("player_center_progress_i").clientWidth
        / document.getElementById("player_center_progress").clientWidth);
};
function setCurrentTime(t) {
    player.currentTime = t;
    if (nxtLrcTs == null) {
        return;
    }
    for (let lrcDom of document.getElementById("lyric_right_c").children) {
        if (player.currentTime * 1000 < Number(lrcDom.getAttribute("data-ts"))) {
            if (!lrcDom.previousElementSibling) {
                nxtLrcTs = Number(document.getElementById("lyric_right_c").firstElementChild.getAttribute("data-ts"));
                nxtLrcCount = Number(document.getElementById("lyric_right_c").firstElementChild.getAttribute("data-n"));
                return;
            }
            nxtLrcTs = Number(lrcDom.previousElementSibling.getAttribute("data-ts"));
            nxtLrcCount = Number(lrcDom.previousElementSibling.getAttribute("data-n"));
            return;
        }
    }
    nxtLrcTs = Number(document.getElementById("lyric_right_c").lastElementChild.getAttribute("data-ts"));
    nxtLrcCount = Number(document.getElementById("lyric_right_c").lastElementChild.getAttribute("data-n"));
};

document.getElementById("wbv").addEventListener("ipc-message", (ev) => {
    switch (ev.channel) {
        case "mousedown":
            switchPlayListStatus(false);
            break;
        case "mousemove":
            if (pagexDraggingProgressC == null) {
                return;
            }
            updateProgressStat(ev.args[0] + 200);
            break;
        case "mouseup":
            if (pagexDraggingProgressC == null) {
                return;
            }
            confirmProgress();
            pagexDraggingProgressC = null;
            break;
        case "play-dblclick":
            addToPlayList(ev.args[0], true, ev.args[1]);
            playNow(ev.args[1]);
            break;
        case "play-all":
            addToPlayList(ev.args[0], true, ev.args[0][0]);
            playNow(ev.args[0][0]);
            break;
        case "play-selected":
            addToPlayList(ev.args[0], false, ev.args[0][0]);
            playNow(ev.args[0][0]);
            break;
        case "add-all":
        case "add-selected":
            addToPlayList(ev.args[0], false, getCurrentSrc());
            switchPlayListStatus(true);
            setTimeout(() => {
                document.getElementById("playlist_content").scrollTo({
                    top: document.querySelector(`div[data-songpath="${encodeURI(ev.args[0][0])}"]`).offsetTop,
                    behavior: "smooth"
                });
            }, 300);
            break;
    }
});

function switchPlayListStatus(stat) {
    if (!stat) {
        document.getElementById("player_right_list").style.background = "";
        document.getElementById("player_right_list").firstElementChild.style.filter = "";
        document.getElementById("playlist").style.right = "";
    }
    else {
        for (let dom of document.getElementById("playlist_content").children) {
            dom.classList.remove("item-focused");
        }
        document.getElementById("player_right_list").style.background = "var(--theme-color)";
        document.getElementById("player_right_list").firstElementChild.style.filter = "brightness(100)";
        document.getElementById("playlist").style.right = "0";
    }
};
document.getElementById("player").addEventListener("mousedown", (ev) => {
    ev.stopPropagation();
});
document.getElementById("player_right_list").addEventListener("click", () => {
    switchPlayListStatus(document.getElementById("playlist").style.right != "0px");
});

document.getElementById("wbv").addEventListener("did-finish-load", function () {
    this.executeJavaScript(`
        document.body.addEventListener("mousedown", () => {
            ipcRenderer.sendToHost("mousedown");
        });
        document.body.addEventListener("mousemove", (ev) => {
            ipcRenderer.sendToHost("mousemove", ev.pageX);
        });
        document.body.addEventListener("mouseup", (ev) => {
            ipcRenderer.sendToHost("mouseup");
        });
    `);
});
document.body.addEventListener("mousedown", () => {
    switchPlayListStatus(false);
});
document.getElementById("playlist").addEventListener("mousedown", (ev) => {
    ev.stopPropagation();
});

document.getElementById("playlist_clear").addEventListener("click", () => {
    playlist = [];
    playlistWater = [];
    loadPlayList();
    stopPlaying();
});

ipcRenderer.on("out-control", (event, msg) => {
    switch (msg) {
        case "play":
            document.getElementById("player_center_play").click();
            break;
        case "previous":
            document.getElementById("player_center_previous").click();
            break;
        case "next":
            document.getElementById("player_center_next").click();
            break;
    }
});

function getCurrentSrc() {
    if (!playing || player.currentSrc == "") {
        return;
    }
    return decodeURI(player.currentSrc.split("file:///")[1].replaceAll("/", "\\"));
};

document.getElementById("player_center_lyric").addEventListener("click", function () {
    let desktopLyricStatus = ipcRenderer.sendSync("desktop-lyric");
    this.style.background = desktopLyricStatus ? "var(--theme-color)" : "";
    this.style.color = desktopLyricStatus ? "#fff" : "";
});

document.getElementById("player_left_pic_mask").addEventListener("click", function () {
    if (document.getElementById("lyric").style.top != "60px") {
        document.getElementById("lyric").style.top = "60px";
        this.firstElementChild.style.transform = "translate(-50%, -50%) rotate(180deg)";
        return;
    }
    document.getElementById("lyric").style.top = "";
    this.firstElementChild.style.transform = "translate(-50%, -50%)";
});

let lyricScrolledTime = 0;
document.getElementById("lyric_right_c").addEventListener("wheel", () => {
    lyricScrolledTime = new Date().getTime();
});