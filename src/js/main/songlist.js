let songListIndex;
let songListIndexFileObject = new AppDataFile("User/SongListIndex.json");

function saveSongListIndex() {
    new AppDataFile("User/SongListIndex.json").writeObjectSync(songListIndex);
};
async function readSongList(songListId) {
    let obj = new AppDataFile(`SongLists/${songListId}.json`).readObjectSync();
    if (obj.type == "folder") {
        return await getFilesInDir(obj);
    }
    if (obj.type == "web") {
        ui.alert("提示", "请从歌单页面播放。");
        return [];
    }
    if (obj.type == "files") {
        return obj;
    }
};

if (songListIndexFileObject.existsSync()) {
    songListIndex = songListIndexFileObject.readObjectSync();
}
else {
    songListIndex = [];
    saveSongListIndex();
}

function loadSonglistsMenu() {
    let elemList = document.getElementById("menu_songlist_sl").getElementsByClassName("item");
    for (let i = 0; i < elemList.length; i += 1) {
        let elem = elemList[i];
        if (songListIndex.filter(item => item.id == elem.getAttribute("data-sl-id")).length == 0) {
            elem.remove();
            i -= 1;
        }
    }
    songListIndex.forEach((sl, i) => {
        let itemDom = document.getElementById("menu_songlist_sl").querySelector(`.item[data-sl-id="${sl.id}"]`);
        if (itemDom) {
            itemDom.innerText = sl.name;
            itemDom.style.order = i;
            itemDom.setAttribute("data-sl-index", i);
        }
        else {
            createSonglistsMenuItem(i, sl);
        }
    });
};

let songListContextMenuIndex;
let songListDraggedDom = null;
function createSonglistsMenuItem(index, sl) {
    let d = document.createElement("div");
    d.classList.add("item");
    d.style.order = index;
    d.setAttribute("data-sl-index", index);
    d.setAttribute("data-sl-id", sl.id);
    d.innerText = sl.name;
    d.addEventListener("click", function () {
        if (this.classList.contains("item-focused")) {
            return;
        }
        switchWbvTo(`songlist.html?id=${sl.id}&type=${sl.type}&name=${encodeURIComponent(sl.name)}`, d);
    });
    d.addEventListener("contextmenu", function (evt) {
        songListContextMenuIndex = Array.prototype.indexOf.call(document.getElementById("menu_songlist_sl").children, this);
        new ContextMenu([
            {
                label: "播放全部",
                async click() {
                    let songs = await readSongList(document.getElementById("menu_songlist_sl").children[songListContextMenuIndex].getAttribute("data-sl-id"));
                    addToPlayList(songs, 0, true);
                    playNow(songs[0]);
                }
            }, {
                label: "下一首播放",
                async click() {
                    let songs = await readSongList(document.getElementById("menu_songlist_sl").children[songListContextMenuIndex].getAttribute("data-sl-id"));
                    addToPlayList(songs, "playing", false);
                    switchPlayListStatus(true);
                    setTimeout(() => {
                        document.getElementById("playlist_content").scrollTo({
                            top: document.querySelector(`div[data-songpath="${encodeURI(songs[0])}"]`).offsetTop,
                            behavior: "smooth"
                        });
                        if (!playing) {
                            playNow(playlist[0]);
                        }
                    }, 300);
                }
            }, {
                type: "separator"
            }, {
                label: "导出",
                submenu: [{
                    label: "此歌单",
                    click() {
                        let targetSlDom = document.getElementById("menu_songlist_sl").children[songListContextMenuIndex];
                        let outPath = Electron.ipcRenderer.sendSync("show-open-dialog-sync", {
                            title: `导出歌单「${targetSlDom.innerText}」的索引`,
                            buttonLabel: `导出歌单「${targetSlDom.innerText}」的索引到此文件夹`,
                            properties: ["openDirectory"]
                        })[0];
                        if (outPath == undefined) {
                            return;
                        }
                        songListIndex.forEach((sl) => {
                            if (sl.id != targetSlDom.getAttribute("data-sl-id")) {
                                return;
                            }
                            let content = new AppDataFile(`SongLists/${sl.id}.json`).readObjectSync();
                            content["id"] = sl.id;
                            content["name"] = sl.name;
                            fs.writeFileSync(`${outPath}\\${sl.name}.json`, JSON.stringify(content));
                        });
                        ui.alert("导出操作已完成。", `已完成对歌单「${targetSlDom.innerText}」的索引导出。`);
                    }
                }, {
                    label: "所有歌单",
                    click() {
                        let outPath = Electron.ipcRenderer.sendSync("show-open-dialog-sync", {
                            title: "导出全部歌单的索引",
                            buttonLabel: "导出全部歌单的索引到此文件夹",
                            properties: ["openDirectory"]
                        })[0];
                        if (outPath == undefined) {
                            return;
                        }
                        songListIndex.forEach((sl) => {
                            let content = new AppDataFile(`SongLists/${sl.id}.json`).readObjectSync();
                            content["id"] = sl.id;
                            content["name"] = sl.name;
                            fs.writeFileSync(`${outPath}\\${sl.name}.json`, JSON.stringify(content));
                        });
                        ui.alert("导出操作已完成。", "已完成对全部歌单的索引导出。");
                    }
                }]
            }, {
                label: "操作",
                submenu: [{
                    label: "重命名",
                    click() {
                        ui.prompt("重命名歌单", "歌单名称", {
                            value: songListIndex[songListContextMenuIndex].name
                        }, renSongListCB);
                    }
                }, {
                    label: "删除",
                    click() {
                        ui.confirm("确定要删除该歌单？", "此操作无法恢复。", delSongListCB);
                    }
                }]
            }, {
                type: "separator"
            }, {
                label: "属性",
                click() {
                    let targetSlDom = document.getElementById("menu_songlist_sl").children[songListContextMenuIndex];
                    Electron.ipcRenderer.send("song-list-attributes", "song-list-id", targetSlDom.getAttribute("data-sl-id"));
                }
            }
        ]).popup([evt.clientX, evt.clientY]);
    });
    d.draggable = true;
    bindDragEventsForListItemDom(d, {
        focusable: false,
        indexAttr: "data-sl-index"
    });
    d.addEventListener("dragstart", (evt) => {
        songListDraggedDom = evt.target;
    });
    d.addEventListener("drop", function (evt) {
        let count = (evt.offsetY < this.offsetHeight / 2) ? 0 : 1;
        if (evt.dataTransfer.files.length > 0) {
            for (let file of evt.dataTransfer.files) {
                let orginal = JSON.parse(fs.readFileSync(file.path));
                if (document.getElementById("menu_songlist_sl").querySelector(`div[data-sl-id="${orginal.id}"]`)) {
                    continue;
                }
                songListIndex.push({
                    id: orginal.id,
                    type: orginal.type,
                    name: orginal.name
                });
                let content = {};
                for (let key of Object.keys(orginal)) {
                    if (key == "id" || key == "name") {
                        continue;
                    }
                    content[key] = orginal[key];
                }
                new AppDataFile(`SongLists/${orginal.id}.json`).writeObjectSync(content);
            }
        }
        else if (songListDraggedDom) {
            let targetObj = songListIndex[Number(songListDraggedDom.getAttribute("data-sl-index"))];
            songListIndex[Number(songListDraggedDom.getAttribute("data-sl-index"))] = null;
            songListIndex.splice(Number(this.getAttribute("data-sl-index")) + count, 0, targetObj);
            songListIndex = songListIndex.filter(item => item !== null);
        }
        songListDraggedDom = null;
        saveSongListIndex();
        loadSonglistsMenu();
    });
    document.getElementById("menu_songlist_sl").appendChild(d);
};

window.addEventListener("load", loadSonglistsMenu);

function addNewSongListCB(newSongListName) {
    let newSongListId = Math.floor(Math.random() * Math.pow(10, 8));
    songListIndex.push({
        id: newSongListId,
        type: "files",
        name: newSongListName
    });
    saveSongListIndex();

    new AppDataFile(`SongLists/${newSongListId}.json`).writeObjectSync({
        type: "files",
        songs: [],
        sort: {
            type: "default",
            order: 0
        }
    });

    loadSonglistsMenu();
    document.getElementById("menu_songlist_sl").lastChild.click();
};
function renSongListCB(newSongListName) {
    songListIndex[songListContextMenuIndex].name = newSongListName;
    saveSongListIndex();
    loadSonglistsMenu();
};
function delSongListCB(val) {
    if (!val) {
        return;
    }

    let deletedSongListDom = document.getElementById("menu_songlist_sl").children[songListContextMenuIndex];
    if (deletedSongListDom.classList.contains("item-focused")) {
        document.getElementById("menu_top_home").click();
    }
    deletedSongListDom.remove();

    songListIndex.splice(songListContextMenuIndex, 1);
    saveSongListIndex();

    new AppDataFile(`SongLists/${deletedSongListDom.getAttribute("data-sl-id")}.json`).rmSync();
};