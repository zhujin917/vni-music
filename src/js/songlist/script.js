const musicMetadata = require("music-metadata");

const allowedExtNames = ["MP3"];

let songList = [];
let songListId = new URLSearchParams(location.search).get("id");
let songListType = new URLSearchParams(location.search).get("type");
let songListName = new URLSearchParams(location.search).get("name");
let songListFileObject = new AppDataFile(`SongLists/${songListId}.json`);
let songListStat = songListFileObject.statSync();
let draggedDom = null;
let infoLoaded = 0;

window.addEventListener("load", () => {
    document.getElementById("info_name").innerText = songListName;
    document.getElementById("info_time").innerText = `创建时间：${songListStat.birthtime.toLocaleString()}`;
    document.getElementById("info_id").innerText = `标识符：${songListId}`;

    switch (songListType) {
        case "files":
            if (songListFileObject.existsSync()) {
                songList = songListFileObject.readObjectSync();
            }
            else {
                songListFileObject.writeObjectSync(songList);
            }
            loadListContent();
            break;
        case "folder":
            if (songListFileObject.existsSync()) {
                getFilesInDir(songListFileObject.readObjectSync()).then((songPaths) => {
                    songList = songPaths.filter((songPath) => allowedExtNames.includes(
                        songPath.substring(songPath.lastIndexOf(".") + 1).toUpperCase()
                    ));
                    loadListContent();
                });
            }
            break;
    }
});

function loadListContent() {
    if (songList.length == 0) {
        showListContent();
        return;
    }
    songList.forEach((songPath, i) => {
        createListContentItem(i, songPath);
    });
};

function createListContentItem(index, songPath) {
    let s = document.createElement("div");
    s.classList.add("item");
    s.innerHTML = `
        <div class="content num">${index + 1}</div>
        <div class="content title"></div>
        <div class="content artist"></div>
        <div class="content album"></div>
        <div class="content time"></div>
    `;
    s.style.order = index;
    s.setAttribute("data-songnum", index);
    s.setAttribute("data-songpath", encodeURI(songPath));
    if ((index + 1) % 2 == 1) {
        s.classList.add("item-odd");
    }
    s.addEventListener("contextmenu", function (evt) {
        contextMenuDom = this;
        new ContextMenu([
            {
                label: "立即播放",
                click() {
                    Electron.ipcRenderer.sendToHost("play-selected", getSelectedSongPath());
                }
            }, {
                label: "添加到播放列表",
                click() {
                    Electron.ipcRenderer.sendToHost("add-selected", getSelectedSongPath());
                }
            }, {
                type: "separator"
            }, {
                label: "搜索歌词",
                click() {
                    Electron.ipcRenderer.send("mp3-modify", getSelectedSongPath());
                }
            }
        ]).popup([evt.clientX, evt.clientY]);
    });
    s.addEventListener("dblclick", function () {
        this.classList.remove("item-focused");
        Electron.ipcRenderer.sendToHost("play-dblclick", songList, decodeURI(this.getAttribute("data-songpath")));
    });
    s.addEventListener("click", function (ev) {
        if (ev.shiftKey && document.getElementsByClassName("item-focused").length == 1) {
            let anotherFocusedNum = document.getElementsByClassName("item-focused")[0].getAttribute("data-songnum");
            for (let i = Math.min(Number(anotherFocusedNum), this.getAttribute("data-songnum"));
                i <= Math.max(Number(anotherFocusedNum), this.getAttribute("data-songnum")); i += 1) {
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
    s.draggable = (songListType == "files");
    s.addEventListener("dragover", function (ev) {
        ev.preventDefault();
        let isUpperPart = ev.offsetY < this.offsetHeight / 2;
        this.style.borderRadius = "0";
        this.style.borderBottomColor = isUpperPart ? "transparent" : "#0078d4";
        let previousElement = getPreviousItemDom(this);
        if (previousElement) {
            previousElement.style.borderRadius = "0";
            previousElement.style.borderBottomColor = isUpperPart ? "#0078d4" : "transparent";
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
        this.style.borderColor = "";
        let previousElement = getPreviousItemDom(this);
        if (previousElement) {
            previousElement.style.borderRadius = "";
            previousElement.style.borderColor = "";
        }
    });
    s.addEventListener("drop", function (ev) {
        ev.stopPropagation();
        this.style.borderRadius = "";
        this.style.borderColor = "transparent";
        let previousElement = getPreviousItemDom(this);
        if (previousElement) {
            previousElement.style.borderRadius = "";
            previousElement.style.borderColor = "transparent";
        }

        if (this.classList.contains("item-focused")) {
            draggedDom = null;
            return;
        }

        let count = (ev.offsetY < this.offsetHeight / 2) ? 0 : 1;
        if (ev.dataTransfer.files.length > 0) {
            for (let file of ev.dataTransfer.files) {
                if (!allowedExtNames.includes(file.name.substring(file.name.lastIndexOf(".") + 1).toUpperCase())) {
                    continue;
                }
                if (songList.indexOf(file.path) != -1) {
                    if (ev.dataTransfer.files.length == 1) {
                        Electron.ipcRenderer.sendToHost("alert", "提示", "该歌曲已存在于此歌单中。");
                    }
                    continue;
                }
                songList.splice(Number(this.getAttribute("data-songnum")) + count, 0, file.path);
                count += 1;
            };
        }
        else if (draggedDom != null) {
            let focusedSong = [];
            if (!draggedDom.classList.contains("item-focused")) {
                focusedSong = [{
                    "num": Number(draggedDom.getAttribute("data-songnum")),
                    "path": decodeURI(draggedDom.getAttribute("data-songpath"))
                }];
            }
            else {
                for (let focusedDom of document.getElementsByClassName("item-focused")) {
                    focusedSong.push({
                        "num": Number(focusedDom.getAttribute("data-songnum")),
                        "path": decodeURI(focusedDom.getAttribute("data-songpath"))
                    });
                }
            }
            focusedSong.forEach((s) => {
                songList[s.num] = null;
            });
            focusedSong.forEach((s) => {
                songList.splice(Number(this.getAttribute("data-songnum")) + count, 0, s.path);
                count += 1;
            });
            songList = songList.filter(item => item !== null);
        }

        draggedDom = null;
        saveSongList();
    });
    s.addEventListener("dragstart", (ev) => {
        draggedDom = ev.target;
    });
    document.getElementById("list_content").appendChild(s);

    Electron.ipcRenderer.invoke("get-song-info", songPath).then((songInfo) => {
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
        if (infoLoaded == songList.length) {
            showListContent();
        }
    });
};

function showListContent() {
    setTimeout(() => {
        updateInfoPic().then(() => {
            document.getElementById("list_loading").remove();
            document.getElementById("list_content").style.display = "flex";
            Electron.ipcRenderer.sendToHost("list-content-loaded");
        });
    }, 500);
};

function saveSongList() {
    if (songListType != "files") {
        return;
    }
    songListFileObject.writeObjectSync(songList);
    sortSongList();
};

function sortSongList() {
    let elemList = document.getElementById("list_content").getElementsByClassName("item");
    for (let i = 0; i < elemList.length; i += 1) {
        let elem = elemList[i];
        if (songList.indexOf(decodeURI(elem.getAttribute("data-songpath"))) == -1) {
            elem.remove();
            i -= 1;
        }
    }
    songList.forEach((songPath, i) => {
        let itemDom = document.getElementById("list_content").querySelector(`.item[data-songpath="${encodeURI(songPath)}"]`);
        if (itemDom) {
            if (!isNaN(Number(itemDom.querySelector(".num").innerHTML))) {
                itemDom.querySelector(".num").innerHTML = i + 1;
            }
            itemDom.style.order = i;
            itemDom.setAttribute("data-songnum", i);
        }
        else {
            createListContentItem(i, songPath);
        }
    });
    updateInfoPic();
};

function updateInfoPic() {
    return new Promise((resolve) => {
        if (songList.length == 0) {
            document.getElementById("info_pic").src = "../img/icon/music.svg";
            resolve();
        }
        else {
            musicMetadata.parseFile(songList[0]).then((value) => {
                if (value.common.picture) {
                    document.getElementById("info_pic").src = getIPictureBase64(value.common.picture[0]);
                }
                resolve();
            });
        }
    });
};

function getPreviousItemDom(elem) {
    return document.getElementById("list_content").querySelector(`.item[data-songnum="${Number(elem.getAttribute("data-songnum")) - 1}"]`);
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

window.addEventListener("load", () => {
    document.getElementById("list").addEventListener("dragover", (ev) => {
        ev.preventDefault();
    });
    document.getElementById("list").addEventListener("drop", (ev) => {
        let count = 0;
        for (let file of ev.dataTransfer.files) {
            if (!allowedExtNames.includes(file.name.substring(file.name.lastIndexOf(".") + 1).toUpperCase())) {
                continue;
            }
            songList.splice(document.getElementById("list_content").children.length + count, 0, file.path);
            count += 1;
        }
        saveSongList();
    });

    document.getElementById("info_btns_play").addEventListener("click", () => {
        Electron.ipcRenderer.sendToHost("play-all", songList);
    });
    document.getElementById("info_btns_add").addEventListener("click", () => {
        Electron.ipcRenderer.sendToHost("add-all", songList);
    });
});

Electron.ipcRenderer.on("playing-song", (event, songPath) => {
    let playingDom = document.querySelector(`div[data-songpath="${songPath}"]`);
    let oldPlayingDom = document.getElementsByClassName("item-playing");
    if (oldPlayingDom.length > 0) {
        oldPlayingDom[0].firstElementChild.innerHTML = Number(oldPlayingDom[0].getAttribute("data-songnum")) + 1;
        oldPlayingDom[0].classList.remove("item-playing");
    }
    if (playingDom == undefined) {
        return;
    }
    playingDom.firstElementChild.innerHTML = `<img src="../img/icon/acoustic.svg" />`;
    playingDom.classList.add("item-playing");
});

function getFilesInDir(dirPath) {
    return new Promise(resolve => {
        fs.promises.readdir(dirPath, { withFileTypes: true }).then(dirents => {
            Promise.allSettled(dirents.map(dirent => new Promise(resolve => {
                if (dirent.isFile()) {
                    resolve(path.join(dirPath, dirent.name));
                }
                else if (dirent.isDirectory()) {
                    getFilesInDir(path.join(dirPath, dirent.name)).then(resolve);
                }
            }))).then(results => resolve(
                results.reduce((all, result) => result.status == "fulfilled" ? all.concat(result.value) : all, [])
            ));
        });
    });
};