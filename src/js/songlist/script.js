let songList;
let songListN = 0;
let getSongList;
let draggedDom = null;

window.addEventListener("load", () => {
    songList = JSON.parse(fs.readFileSync(`${__datadir}\\songlist.json`, "utf-8"));
    for (let sl of songList) {
        if (sl.id != new URLSearchParams(location.search.substring(1)).get("id")) {
            songListN += 1;
            continue;
        }
        getSongList = () => songList[songListN];
        loadSongList();
        break;
    }

    document.getElementById("list").addEventListener("dragover", (ev) => {
        ev.preventDefault();
    });
    document.getElementById("list").addEventListener("drop", (ev) => {
        let count = 0;
        for (let file of ev.dataTransfer.files) {
            if (file.name.substring(file.name.lastIndexOf(".")).toUpperCase() != ".MP3") {
                continue;
            }
            getSongList().songs.splice(document.getElementById("list_content").children.length + count, 0, file.path);
            count += 1;
        }
        saveSongList();
    });

    document.getElementById("info_btns_play").addEventListener("click", () => {
        ipcRenderer.sendToHost("play-all", getSongList().songs);
    });
    document.getElementById("info_btns_add").addEventListener("click", () => {
        ipcRenderer.sendToHost("add-all", getSongList().songs);
    });
});

let infoLoaded;
function showListContent() {
    document.getElementById("list_content").remove();
    document.getElementById("list_content_n").hidden = false;
    document.getElementById("list_content_n").id = "list_content";

    ipcRenderer.sendToHost("list-content-loaded");
};

let contextMenuDom = null;
function getSelectedSongPath() {
    let songsl = [];
    if (!contextMenuDom.classList.contains("item-focused")) {
        songsl = [decodeURI(contextMenuDom.getAttribute("data-songpath"))];
    }
    else {
        for (let focusedDom of document.getElementsByClassName("item-focused")) {
            songsl.push(decodeURI(focusedDom.getAttribute("data-songpath")));
        }
    }
    return songsl;
};

function loadSongList() {
    let listContentDom = document.createElement("div");
    listContentDom.id = "list_content_n";
    listContentDom.classList.add("list-content");
    if (document.getElementById("list_content").innerHTML != "") {
        listContentDom.hidden = true;
    }
    document.getElementById("list").appendChild(listContentDom);

    document.getElementById("info_name").innerText = getSongList().name;
    document.getElementById("info_time").innerText = `创建时间：${new Date(getSongList().time)}`;
    document.getElementById("info_id").innerText = `标识符：${getSongList().id}`;
    if (getSongList().songs.length == 0) {
        document.getElementById("info_pic").src = "../img/icon/music.svg";
        showListContent();
        return;
    }

    let count = 0;
    infoLoaded = 0;
    getSongList().songs.forEach((song) => {
        count += 1;
        let s = document.createElement("div");
        s.classList.add("item");
        s.innerHTML = `
            <div class="content num">${count}</div>
            <div class="content title"></div>
            <div class="content artist"></div>
            <div class="content album"></div>
            <div class="content time"></div>
        `;
        s.setAttribute("data-songnum", count);
        s.setAttribute("data-songpath", encodeURI(song));
        if (count % 2 == 1) {
            s.classList.add("item-odd");
        }
        s.addEventListener("contextmenu", function () {
            contextMenuDom = this;
            ipcRenderer.send("popup-menu", [
                {
                    label: "立即播放",
                    icon: path.join(__dirname, "../img/icon/play-one.png"),
                    onclick: (() => {
                        ipcRenderer.sendToHost("play-selected", getSelectedSongPath());
                    }).toString()
                }, {
                    label: "添加到播放列表",
                    icon: path.join(__dirname, "../img/icon/plus.png"),
                    onclick: (() => {
                        ipcRenderer.sendToHost("add-selected", getSelectedSongPath());
                    }).toString()
                }, {
                    type: "separator"
                }, {
                    label: "搜索歌词",
                    onclick: (() => {
                        ipcRenderer.send("mp3-modify", getSelectedSongPath());
                    }).toString()
                }
            ]);
        });
        s.addEventListener("dblclick", function () {
            this.classList.remove("item-focused");
            ipcRenderer.sendToHost("play-dblclick", getSongList().songs, decodeURI(this.getAttribute("data-songpath")));
        });
        s.addEventListener("click", function (ev) {
            if (ev.shiftKey && document.getElementsByClassName("item-focused").length == 1) {
                let anotherFocusedNum = document.getElementsByClassName("item-focused")[0].getAttribute("data-songnum") - 1;
                for (let i = Math.min(Number(anotherFocusedNum), this.getAttribute("data-songnum") - 1);
                    i <= Math.max(Number(anotherFocusedNum), this.getAttribute("data-songnum") - 1); i += 1) {
                    document.getElementById("list_content").children[i].classList.add("item-focused");
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
        s.draggable = true;
        s.addEventListener("dragover", function (ev) {
            ev.preventDefault();
            let isUpperPart = ev.offsetY < this.offsetHeight / 2;
            this.style.borderRadius = "0";
            this.style.transition = "none";
            this.style.borderBottomColor = isUpperPart ? "transparent" : "#0078d4";
            if (this.previousElementSibling != undefined) {
                this.previousElementSibling.style.borderRadius = "0";
                this.previousElementSibling.style.transition = "none";
                this.previousElementSibling.style.borderBottomColor = isUpperPart ? "#0078d4" : "transparent";
            }
            else if (isUpperPart) {
                this.style.borderTopColor = "#0078d4";
            }
            else {
                this.style.borderTopColor = "transparent";
            }
        });
        s.addEventListener("dragleave", function () {
            this.style.borderRadius = "";
            this.style.transition = "";
            this.style.borderColor = "";
            if (this.previousElementSibling != undefined) {
                this.previousElementSibling.style.borderRadius = "";
                this.previousElementSibling.style.transition = "";
                this.previousElementSibling.style.borderColor = "";
            }
        });
        s.addEventListener("drop", function (ev) {
            ev.stopPropagation();
            this.style.borderRadius = "";
            this.style.borderColor = "transparent";
            if (this.previousElementSibling != undefined) {
                this.previousElementSibling.style.borderRadius = "";
                this.previousElementSibling.style.borderColor = "transparent";
            }

            if (this.classList.contains("item-focused")) {
                draggedDom = null;
                return;
            }

            let count = (ev.offsetY < this.offsetHeight / 2) ? -1 : 0;
            if (ev.dataTransfer.files.length > 0) {
                for (let file of ev.dataTransfer.files) {
                    if (file.name.substring(file.name.lastIndexOf(".")).toUpperCase() != ".MP3") {
                        continue;
                    }
                    if (getSongList().songs.indexOf(file.path) != -1) {
                        if (ev.dataTransfer.files.length == 1) {
                            ipcRenderer.sendToHost("alert", "提示", "该歌曲已存在于此歌单中。");
                        }
                        continue;
                    }
                    getSongList().songs.splice(Number(this.getAttribute("data-songnum")) + count, 0, file.path);
                    count += 1;
                };
            }
            else if (draggedDom != null) {
                let focusedSong = [];
                if (!draggedDom.classList.contains("item-focused")) {
                    focusedSong = [{
                        "num": Number(draggedDom.getAttribute("data-songnum")) - 1,
                        "path": decodeURI(draggedDom.getAttribute("data-songpath"))
                    }];
                }
                else {
                    for (let focusedDom of document.getElementsByClassName("item-focused")) {
                        focusedSong.push({
                            "num": Number(focusedDom.getAttribute("data-songnum")) - 1,
                            "path": decodeURI(focusedDom.getAttribute("data-songpath"))
                        });
                    }
                }
                focusedSong.forEach((s) => {
                    getSongList().songs[s.num] = null;
                });
                focusedSong.forEach((s) => {
                    getSongList().songs.splice(Number(this.getAttribute("data-songnum")) + count, 0, s.path);
                    count += 1;
                });
                getSongList().songs = getSongList().songs.filter(item => item !== null);
            }

            draggedDom = null;
            saveSongList();
        });
        s.addEventListener("dragstart", (ev) => {
            draggedDom = ev.target;
        });
        listContentDom.appendChild(s);

        ipcRenderer.send("get-mp3-info", song, ((songPath, songInfo) => {
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
            if (infoLoaded == getSongList().songs.length) {
                showListContent();
            }
        }).toString());

        if (count == 1) {
            new jsmediatags.Reader(song).setTagsToRead(["picture"]).read({
                onSuccess: (tag) => {
                    document.getElementById("info_pic").src = getPicBase64(tag.tags.picture);
                }
            });
        }
    });
};

function saveSongList() {
    fs.writeFile(`${__datadir}\\songlist.json`, JSON.stringify(songList), () => { });
    loadSongList();
};

ipcRenderer.on("playing-song", (event, songPathTag) => {
    let playingDom = document.querySelector(`div[data-songpath="${songPathTag}"]`);
    let oldPlayingDom = document.getElementsByClassName("item-playing");
    if (oldPlayingDom.length > 0) {
        oldPlayingDom[0].firstElementChild.innerHTML = oldPlayingDom[0].getAttribute("data-songnum");
        oldPlayingDom[0].classList.remove("item-playing");
    }
    if (playingDom == undefined) {
        return;
    }
    playingDom.firstElementChild.innerHTML = `<img src="../img/icon/acoustic.svg" />`;
    playingDom.classList.add("item-playing");
});