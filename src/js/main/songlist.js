let songListIndex;
let songListIndexFileObject = new AppDataFile("User/SongListIndex.json");

function saveSongListIndex() {
    new AppDataFile("User/SongListIndex.json").writeObjectSync(songListIndex);
};
function readSongList(songListId) {
    return new AppDataFile(`SongLists/${songListId}.json`).readObjectSync();
};

if (songListIndexFileObject.existsSync()) {
    songListIndex = songListIndexFileObject.readObjectSync();
}
else {
    songListIndex = [];
    saveSongListIndex();
}

let songListContextMenuIndex;
function loadSonglistsMenu() {
    document.getElementById("menu_songlist_sl").innerHTML = "";
    songListIndex.forEach(sl => {
        let d = document.createElement("div");
        d.classList.add("menu-item");
        d.innerText = sl.name;
        d.setAttribute("data-sl-id", sl.id);
        d.addEventListener("click", function () {
            if (this.classList.contains("menu-item-focused")) {
                return;
            }
            switchWbvTo(`songlist.html?id=${sl.id}&type=${sl.type}&name=${encodeURI(sl.name)}`, d);
        });
        d.addEventListener("contextmenu", function (evt) {
            songListContextMenuIndex = Array.prototype.indexOf.call(document.getElementById("menu_songlist_sl").children, this);
            new ContextMenu([
                {
                    label: "播放全部",
                    click() {
                        let songs = readSongList(document.getElementById("menu_songlist_sl").children[songListContextMenuIndex].getAttribute("data-sl-id"));
                        addToPlayList(songs, true, songs[0]);
                        playNow(songs[0]);
                    }
                }, {
                    label: "添加到播放列表",
                    click() {
                        let songs = readSongList(document.getElementById("menu_songlist_sl").children[songListContextMenuIndex].getAttribute("data-sl-id"));
                        addToPlayList(songs, false, getCurrentSrc());
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
                    label: "向上移动",
                    click() {
                        let tmpSl = songListIndex[songListContextMenuIndex];
                        let focusedId = document.getElementsByClassName("menu-item-focused")[0].getAttribute("data-sl-id");
                        songListIndex.splice(songListContextMenuIndex, 1);
                        songListIndex.splice(songListContextMenuIndex - 1, 0, tmpSl);
                        saveSongListIndex();
                        loadSonglistsMenu();
                        if (focusedId) {
                            document.querySelector(`div[data-sl-id="${focusedId}"]`).classList.add("menu-item-focused");
                        }
                    }
                }, {
                    label: "向下移动",
                    click() {
                        let tmpSl = songListIndex[songListContextMenuIndex];
                        let focusedId = document.getElementsByClassName("menu-item-focused")[0].getAttribute("data-sl-id");
                        songListIndex.splice(songListContextMenuIndex, 1);
                        songListIndex.splice(songListContextMenuIndex + 1, 0, tmpSl);
                        saveSongListIndex();
                        loadSonglistsMenu();
                        if (focusedId) {
                            document.querySelector(`div[data-sl-id="${focusedId}"]`).classList.add("menu-item-focused");
                        }
                    }
                }, {
                    type: "separator"
                }, {
                    label: "导出",
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
                        fs.writeFileSync(`${outPath}\\${targetSlDom.innerText}.json`, JSON.stringify({
                            id: targetSlDom.getAttribute("data-sl-id"),
                            name: targetSlDom.innerText,
                            songs: readSongList(targetSlDom.getAttribute("data-sl-id"))
                        }));
                        ui.alert("导出操作已完成。", `已完成对歌单「${targetSlDom.innerText}」的索引导出。`);
                    }
                }, {
                    label: "导出全部",
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
                            fs.writeFileSync(`${outPath}\\${sl.name}.json`, JSON.stringify({
                                id: sl.id,
                                name: sl.name,
                                songs: readSongList(sl.id)
                            }));
                        });
                        ui.alert("导出操作已完成。", "已完成对全部歌单的索引导出。");
                    }
                }, {
                    type: "separator"
                }, {
                    label: "重命名",
                    click() {
                        document.getElementById("renSongList_name").value = document.getElementById("menu_songlist_sl").children[songListContextMenuIndex].innerText;
                        document.getElementById("renSongList_err_empty").style.display = "none";
                        ui.openDialog(document.getElementById("renSongList"));
                        document.getElementById("renSongList_name").focus();
                        document.getElementById("renSongList_name").select();
                    }
                }, {
                    label: "删除",
                    click() {
                        ui.openDialog(document.getElementById("delSongList"));
                    }
                }
            ]).popup([evt.clientX, evt.clientY]);
        });
        document.getElementById("menu_songlist_sl").appendChild(d);
    });
};

window.addEventListener("load", () => {
    loadSonglistsMenu();

    document.getElementById("newSongList_ok").addEventListener("click", () => {
        let newSongListName = document.getElementById("newSongList_name").value;
        if (newSongListName == "") {
            document.getElementById("newSongList_err_empty").style.display = "block";
            return;
        }
        document.getElementById("newSongList_err_empty").style.display = "none";
        document.getElementById("newSongList_name").value = "";
        ui.closeDialog(document.getElementById("newSongList"));

        let newSongListId = Math.floor(Math.random() * Math.pow(10, 8));
        songListIndex.push({
            id: newSongListId,
            type: "files",
            name: newSongListName
        });
        saveSongListIndex();

        new AppDataFile(`SongLists/${newSongListId}.json`).writeObjectSync([]);

        loadSonglistsMenu();
        document.getElementById("menu_songlist_sl").lastChild.click();
    });
    document.getElementById("renSongList_ok").addEventListener("click", () => {
        let newSongListName = document.getElementById("renSongList_name").value;
        if (newSongListName == "") {
            document.getElementById("renSongList_err_empty").style.display = "block";
            return;
        }
        document.getElementById("renSongList_err_empty").style.display = "none";
        document.getElementById("renSongList_name").value = "";
        ui.closeDialog(document.getElementById("renSongList"));

        songListIndex[songListContextMenuIndex].name = newSongListName;
        saveSongListIndex();

        let focusedId = document.getElementById("menu_songlist_sl").querySelector(".menu-item-focused").getAttribute("data-sl-id");
        loadSonglistsMenu();
        if (document.getElementById("menu_songlist_sl").children[songListContextMenuIndex].getAttribute("data-sl-id") == focusedId) {
            document.getElementById("menu_songlist_sl").children[songListContextMenuIndex].click();
        }
        else {
            document.getElementById("menu_songlist_sl").querySelector(`div[data-sl-id="${focusedId}"]`).classList.add("menu-item-focused");
        }
    });
    document.getElementById("delSongList_ok").addEventListener("click", () => {
        let deletedSongListDom = document.getElementById("menu_songlist_sl").children[songListContextMenuIndex];
        if (deletedSongListDom.classList.contains("menu-item-focused")) {
            document.getElementById("menu_top_home").click();
        }
        deletedSongListDom.remove();

        songListIndex.splice(songListContextMenuIndex, 1);
        saveSongListIndex();

        new AppDataFile(`SongLists/${deletedSongListDom.getAttribute("data-sl-id")}.json`).rmSync();

        ui.closeDialog(document.getElementById("delSongList"));
    });

    document.getElementById("menu").addEventListener("dragover", (ev) => {
        ev.preventDefault();
    });
    document.getElementById("menu").addEventListener("drop", (ev) => {
        for (let file of ev.dataTransfer.files) {
            let orginal = JSON.parse(fs.readFileSync(file.path));
            if (document.getElementById("menu_songlist_sl").querySelector(`div[data-sl-id="${orginal.id}"]`)) {
                continue;
            }
            songListIndex.push({
                id: orginal.id,
                name: orginal.name
            });
            new AppDataFile(`SongLists/${orginal.id}.json`).writeObjectSync(orginal.songs);
        }
        saveSongListIndex();
        loadSonglistsMenu();
    });
});