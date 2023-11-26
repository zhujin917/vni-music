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
                label: "下一首播放",
                click() {
                    Electron.ipcRenderer.sendToHost("add-selected", getSelectedSongPath());
                }
            }, {
                type: "separator"
            }, {
                label: "添加到歌单",
                submenu: (() => {
                    let result = [];
                    for (let sl of new AppDataFile("User/SongListIndex.json").readObjectSync()) {
                        if (sl.id == songListId) {
                            continue;
                        }
                        result.push({
                            label: sl.name,
                            click() {
                                if (sl.type == "folder") {
                                    let outPath = new AppDataFile(`SongLists/${sl.id}.json`).readObjectSync();
                                    getSelectedSongPath().forEach((srcPath) => {
                                        fs.promises.copyFile(srcPath, path.join(outPath, srcPath.substring(srcPath.lastIndexOf("\\") + 1)));
                                    })
                                }
                                else if (sl.type == "files") {
                                    let f = new AppDataFile(`SongLists/${sl.id}.json`);
                                    let songs = f.readObjectSync();
                                    songs = songs.concat(getSelectedSongPath());
                                    f.writeObjectSync(songs);
                                }
                            }
                        });
                    }
                    return result;
                })()
            }, {
                label: "搜索歌词",
                click() {
                    Electron.ipcRenderer.send("mp3-modify", getSelectedSongPath());
                }
            }, ...((getSelectedSongPath().length == 1) ? [{
                type: "separator"
            }, {
                label: "文件",
                submenu: [
                    {
                        label: "另存为",
                        click() {
                            let srcPath = getSelectedSongPath()[0];
                            let outPath = Electron.ipcRenderer.sendSync("show-save-dialog-sync", {
                                title: "另存为",
                                buttonLabel: "保存",
                                defaultPath: srcPath,
                                filters: [{
                                    name: "目标文件格式",
                                    extensions: [srcPath.substring(srcPath.lastIndexOf(".") + 1)]
                                }],
                                properties: ["dontAddToRecent"]
                            });
                            if (!outPath || outPath == srcPath) {
                                return;
                            }
                            fs.promises.copyFile(srcPath, outPath);
                        }
                    }, {
                        label: "打开文件位置",
                        click() {
                            Electron.shell.showItemInFolder(getSelectedSongPath()[0]);
                        }
                    }, {
                        label: "复制文件地址",
                        click() {
                            Electron.clipboard.writeText(`"${getSelectedSongPath()[0]}"`);
                        }
                    }
                    // }, {
                    //     label: "属性"
                    // }
                ]
            }] : [])
        ]).popup([evt.clientX, evt.clientY]);
    });
    s.addEventListener("dblclick", function () {
        this.classList.remove("item-focused");
        Electron.ipcRenderer.sendToHost("play-dblclick", songList, decodeURI(this.getAttribute("data-songpath")));
    });
    s.draggable = (songListType == "files");
    bindDragEventsForListItemDom(s, {
        focusable: true,
        indexAttr: "data-songnum"
    });
    s.addEventListener("dragstart", (ev) => {
        draggedDom = ev.target;
    });
    s.addEventListener("drop", function (ev) {
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
                for (let focusedDom of document.getElementById("list_content").getElementsByClassName("item-focused")) {
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
            if ((i + 1) % 2 == 1) {
                itemDom.classList.add("item-odd");
            }
            else {
                itemDom.classList.remove("item-odd");
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

function setDraggable(draggable) {
    for (let elem of document.getElementById("list_content").getElementsByClassName("item")) {
        elem.draggable = draggable;
    }
};

let contextMenuDom = null;
function getSelectedSongPath() {
    let songsl = [];
    if (!contextMenuDom.classList.contains("item-focused")) {
        songsl = [decodeURI(contextMenuDom.getAttribute("data-songpath"))];
    }
    else {
        for (let focusedDom of document.getElementById("list_content").getElementsByClassName("item-focused")) {
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