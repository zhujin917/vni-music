const musicMetadata = require("music-metadata");

const allowedExtNames = ["MP3"];

let songList = [];
let songListId = new URLSearchParams(location.search).get("id");
let songListType = new URLSearchParams(location.search).get("type");
let songListName = new URLSearchParams(location.search).get("name");
let songListFileObject = new AppDataFile(`SongLists/${songListId}.json`);
let songListBirthTime = songListFileObject.statSync().birthtime;
let songListUniqueData = {};
let songListContentLoaded = false;
let sortMode = {
    type: "default",
    order: 0
};
let draggedDom = null;
let infoLoaded = 0;
let webSongListInfo = {};

window.addEventListener("load", () => {
    document.getElementById("info_name").innerText = songListName;
    document.getElementById("info_time").innerText = `创建时间：${songListBirthTime.toLocaleString()}`;
    document.getElementById("info_id").innerText = `标识符：${songListId}`;

    let songListFileContent;
    if (songListFileObject.existsSync()) {
        songListFileContent = songListFileObject.readObjectSync();
    }
    else {
        if (songListType == "files") {
            songListFileContent = saveSongList();
        }
        else return;
    }

    sortMode = songListFileContent.sort;

    switch (songListType) {
        case "files":
            songList = songListFileContent.songs;
            loadListContent();
            break;
        case "folder":
            songListUniqueData["path"] = songListFileContent.path;
            getFilesInDir(songListFileContent.path).then((songPaths) => {
                songList = songPaths.filter((songPath) => allowedExtNames.includes(
                    songPath.substring(songPath.lastIndexOf(".") + 1).toUpperCase()
                ));
                loadListContent();
            });
            break;
        case "web":
            songListUniqueData["url"] = songListFileContent.url;
            fetch(songListFileContent.url, {
                method: "GET"
            }).then(response => {
                return response.json();
            }).then(data => {
                if (data.code != 200) {
                    return;
                }
                songList = data.songs.map(song => {
                    webSongListInfo[song.url] = {
                        "title": song.title,
                        "artist": song.artist,
                        "album": song.album,
                        "duration": song.duration,
                        "picture": song.picture,
                        "lyric": song.lyric
                    };
                    return song.url;
                });
                loadListContent();
            });
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
            }, ...((songListType == "web") ? [] : [{
                type: "separator"
            }, {
                label: "添加到歌单",
                submenu: (() => {
                    let result = [];
                    for (let sl of new AppDataFile("User/SongListIndex.json").readObjectSync()) {
                        if (sl.id == songListId || sl.type == "web") {
                            continue;
                        }
                        result.push({
                            label: sl.name,
                            click() {
                                if (sl.type == "folder") {
                                    Electron.ipcRenderer.send("copy-files", {
                                        "id": songListId,
                                        "name": songListName
                                    }, getSelectedSongPath(), {
                                        "id": sl.id,
                                        "name": sl.name
                                    }, new AppDataFile(`SongLists/${sl.id}.json`).readObjectSync().path);
                                }
                                else if (sl.type == "files") {
                                    let f = new AppDataFile(`SongLists/${sl.id}.json`);
                                    let content = f.readObjectSync();
                                    content.songs = content.songs.concat(getSelectedSongPath());
                                    f.writeObjectSync(content);
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
            }]), ...((getSelectedSongPath().length == 1 && songListType != "web") ? [{
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
                    }, {
                        label: "属性",
                        click() {
                            Electron.ipcRenderer.send("song-attributes", "song-path", getSelectedSongPath()[0]);
                        }
                    }
                ]
            }] : [])
        ]).popup([evt.clientX, evt.clientY]);
    });
    s.addEventListener("dblclick", function () {
        this.classList.remove("item-focused");
        Electron.ipcRenderer.sendToHost("play-dblclick", songList, decodeURI(this.getAttribute("data-songpath")));
    });
    s.draggable = (sortMode.order == 0 && songListType == "files");
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
        if (ev.dataTransfer.files.length > 0 && checkIfCanEdit()) {
            if (songListType == "files") {
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
            else if (songListType == "folder") {
                let srcFileList = [];
                for (let file of ev.dataTransfer.files) {
                    srcFileList.push(file.path);
                }
                Electron.ipcRenderer.send("copy-files", path.dirname(srcFileList[0]), srcFileList, songListUniqueData.path, songListUniqueData.path);
            }
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
        unsortedSongList = [...songList];
        saveSongList();
    });
    document.getElementById("list_content").appendChild(s);

    function fillSongInfo(songInfo) {
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
            setTimeout(showListContent, (songListType == "web") ? 1 : 500);
        }
    };
    if (songListType == "web") {
        fillSongInfo(webSongListInfo[songPath]);
    }
    else {
        Electron.ipcRenderer.invoke("get-song-info", songPath).then(fillSongInfo);
    }
};

function showListContent() {
    refreshSongList().then(() => {
        if (songListContentLoaded) {
            return;
        }
        songListContentLoaded = true;
        document.getElementById("loading").remove();
        document.getElementById("list").style.display = "block";
        Electron.ipcRenderer.sendToHost("list-content-loaded");
    });
};

function saveSongList() {
    let content = {};
    content["type"] = songListType;
    if (songListType == "files") {
        content["songs"] = unsortedSongList ? unsortedSongList : songList;
    }
    else {
        for (let key of Object.keys(songListUniqueData)) {
            content[key] = songListUniqueData[key];
        }
    }
    content["sort"] = sortMode;

    songListFileObject.writeObjectSync(content);
    refreshSongList();

    return content;
};

function refreshSongList() {
    sortSongList();
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
            itemDom.draggable = (sortMode.order == 0 && songListType == "files");
        }
        else {
            createListContentItem(i, songPath);
        }
    });
    return updateInfoPic();
};

function updateInfoPic() {
    return new Promise((resolve) => {
        if (songList.length == 0) {
            document.getElementById("info_pic").src = "../img/icon/music.svg";
            resolve();
        }
        else if (songListType == "web") {
            getWebResourceBase64(webSongListInfo[songList[0]].picture).then(val => {
                document.getElementById("info_pic").src = val;
            });
            resolve();
        }
        else {
            musicMetadata.parseFile(songList[0]).then((value) => {
                if (value.common.picture) {
                    document.getElementById("info_pic").src = getIPictureBase64(value.common.picture[0]);
                }
                else {
                    document.getElementById("info_pic").src = "../img/icon/music.svg";
                }
                resolve();
            });
        }
    });
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

function checkIfCanEdit() {
    if (songListType == "web") {
        Electron.ipcRenderer.sendToHost("alert", "提示", "无法编辑 Web 歌单。");
        return false;
    }
    if (sortMode.order != 0) {
        Electron.ipcRenderer.sendToHost("alert", "提示", "无法在排序模式下编辑歌单。");
        return false;
    }
    return true;
};

window.addEventListener("load", () => {
    document.getElementById("list").addEventListener("dragover", (ev) => {
        ev.preventDefault();
    });
    document.getElementById("list").addEventListener("drop", (ev) => {
        if (!checkIfCanEdit()) {
            return;
        }
        if (songListType == "files") {
            let count = 0;
            for (let file of ev.dataTransfer.files) {
                if (!allowedExtNames.includes(file.name.substring(file.name.lastIndexOf(".") + 1).toUpperCase())) {
                    continue;
                }
                songList.splice(document.getElementById("list_content").children.length + count, 0, file.path);
                count += 1;
            }
            saveSongList();
        }
        else if (songListType == "folder") {
            let srcFileList = [];
            for (let file of ev.dataTransfer.files) {
                srcFileList.push(file.path);
            }
            Electron.ipcRenderer.send("copy-files", path.dirname(srcFileList[0]), srcFileList, songListUniqueData.path, songListUniqueData.path);
        }
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