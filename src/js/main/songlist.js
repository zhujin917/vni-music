let songlist;
function readSongList() {
    if (!fs.existsSync(`${__datadir}\\songlist.json`)) {
        fs.writeFileSync(`${__datadir}\\songlist.json`, "[]", "utf-8");
        songlist = [];
    }
    else {
        songlist = JSON.parse(fs.readFileSync(`${__datadir}\\songlist.json`));
    }
};

let songListContextMenuCount;
function loadSonglistsMenu() {
    readSongList();
    document.getElementById("menu_songlist_sl").innerHTML = "";

    songlist.forEach(sl => {
        let d = document.createElement("div");
        d.classList.add("menu-item");
        d.innerText = sl.name;
        d.setAttribute("data-sl-id", sl.id);
        d.addEventListener("click", function () {
            if (this.classList.contains("menu-item-focused")) {
                return;
            }
            switchWbvTo(`songlist.html?id=${sl.id}`, d);
        });
        d.addEventListener("contextmenu", function (evt) {
            songListContextMenuCount = Array.prototype.indexOf.call(document.getElementById("menu_songlist_sl").children, this);
            new ContextMenu([
                {
                    label: "播放全部",
                    click() {
                        readSongList();
                        let songs = songlist[songListContextMenuCount].songs;
                        addToPlayList(songs, true, songs[0]);
                        playNow(songs[0]);
                        songlist = undefined;
                    }
                }, {
                    label: "添加到播放列表",
                    click() {
                        readSongList();
                        let songs = songlist[songListContextMenuCount].songs;
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
                        songlist = undefined;
                    }
                }, {
                    type: "separator"
                }, {
                    label: "向上移动",
                    click() {
                        readSongList();
                        let tmpSl = songlist[songListContextMenuCount];
                        let focusedSl = document.getElementsByClassName("menu-item-focused")[0].getAttribute("data-sl-id");
                        songlist.splice(songListContextMenuCount, 1);
                        songlist.splice(songListContextMenuCount - 1, 0, tmpSl);
                        saveSongList();
                        loadSonglistsMenu();
                        document.querySelector(`div[data-sl-id="${focusedSl}"]`).classList.add("menu-item-focused");
                    }
                }, {
                    label: "向下移动",
                    click() {
                        readSongList();
                        let tmpSl = songlist[songListContextMenuCount];
                        let focusedSl = document.getElementsByClassName("menu-item-focused")[0].getAttribute("data-sl-id");
                        songlist.splice(songListContextMenuCount, 1);
                        songlist.splice(songListContextMenuCount + 1, 0, tmpSl);
                        saveSongList();
                        loadSonglistsMenu();
                        document.querySelector(`div[data-sl-id="${focusedSl}"]`).classList.add("menu-item-focused");
                    }
                }, {
                    type: "separator"
                }, {
                    label: "导出",
                    click() {
                        let slName = document.getElementById("menu_songlist_sl").children[songListContextMenuCount].innerText;
                        let outPath = Electron.ipcRenderer.sendSync("show-open-dialog-sync", {
                            title: `导出歌单「${slName}」的索引`,
                            buttonLabel: `导出歌单「${slName}」的索引到此文件夹`,
                            properties: ["openDirectory"]
                        });
                        if (outPath == undefined) {
                            return;
                        }
                        readSongList();
                        fs.writeFileSync(`${outPath}\\${slName}.json`, JSON.stringify(songlist[songListContextMenuCount]));
                        songlist = undefined;
                        ui.alert("导出操作已完成。", `已完成对歌单「${slName}」的索引导出。`);
                    }
                }, {
                    label: "导出全部",
                    click() {
                        let outPath = Electron.ipcRenderer.sendSync("show-open-dialog-sync", {
                            title: "导出全部歌单的索引",
                            buttonLabel: "导出全部歌单的索引到此文件夹",
                            properties: ["openDirectory"]
                        });
                        if (outPath == undefined) {
                            return;
                        }
                        readSongList();
                        songlist.forEach((sl) => {
                            fs.writeFileSync(`${outPath}\\${sl.name}.json`, JSON.stringify(sl));
                        });
                        songlist = undefined;
                        ui.alert("导出操作已完成。", "已完成对全部歌单的索引导出。");
                    }
                }, {
                    type: "separator"
                }, {
                    label: "重命名",
                    click() {
                        document.getElementById("renSongList_name").value = document.getElementById("menu_songlist_sl").children[songListContextMenuCount].innerText;
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
    songlist = undefined;
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

        readSongList();
        songlist.push({
            id: Math.floor(Math.random() * 100000000),
            name: newSongListName,
            time: new Date().getTime(),
            songs: []
        });
        saveSongList();

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

        document.getElementById("menu_songlist_sl").children[songListContextMenuCount].innerText = newSongListName;

        readSongList();
        songlist[songListContextMenuCount].name = newSongListName;
        saveSongList();

        if (document.getElementById("menu_songlist_sl").children[songListContextMenuCount].classList.contains("menu-item-focused")) {
            document.getElementById("wbv").reload();
        }
    });
    document.getElementById("delSongList_ok").addEventListener("click", () => {
        let deletedSongListDom = document.getElementById("menu_songlist_sl").children[songListContextMenuCount];
        if (deletedSongListDom.classList.contains("menu-item-focused")) {
            document.getElementById("menu_top_home").click();
        }
        deletedSongListDom.remove();

        readSongList();
        songlist.splice(songListContextMenuCount, 1);
        saveSongList();

        ui.closeDialog(document.getElementById("delSongList"));
    });

    document.getElementById("menu").addEventListener("dragover", (ev) => {
        ev.preventDefault();
    });
    document.getElementById("menu").addEventListener("drop", (ev) => {
        readSongList();
        for (let file of ev.dataTransfer.files) {
            songlist.push(JSON.parse(fs.readFileSync(file.path)));
        }
        saveSongList();
        readSongList();
        loadSonglistsMenu();
    });
});

function saveSongList() {
    fs.writeFileSync(`${__datadir}\\songlist.json`, JSON.stringify(songlist), "utf-8");
    songlist = undefined;
};