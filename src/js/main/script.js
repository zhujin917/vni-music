window.addEventListener("load", () => {
    document.getElementById("menu_top_home").addEventListener("click", function () {
        switchWbvTo("home.html", this);
    });
    document.getElementById("menu_songlist_add").addEventListener("click", (evt) => {
        new ContextMenu([
            {
                label: "空白歌单",
                click() {
                    ui.prompt("新空白歌单", "歌单名称", {}, addNewSongListCB);
                }
            }, {
                label: "从文件夹同步",
                click() {
                    let folderPath = Electron.ipcRenderer.sendSync("show-open-dialog-sync", {
                        title: "从文件夹同步",
                        buttonLabel: "从此文件夹同步",
                        defaultPath: path.join(process.env.USERPROFILE, "Music"),
                        properties: ["openDirectory"]
                    })[0];
                    if (folderPath == undefined) {
                        return;
                    }
                    let newSongListId = Math.floor(Math.random() * Math.pow(10, 8));
                    songListIndex.push({
                        id: newSongListId,
                        type: "folder",
                        name: folderPath.substring(folderPath.lastIndexOf("\\") + 1)
                    });
                    saveSongListIndex();
                    new AppDataFile(`SongLists/${newSongListId}.json`).writeObjectSync({
                        type: "folder",
                        path: folderPath,
                        sort: {
                            type: "default",
                            order: 0
                        }
                    });
                    loadSonglistsMenu();
                    document.getElementById("menu_songlist_sl").lastChild.click();
                }
            }, {
                label: "Web 歌单",
                click() {
                    ui.prompt("添加 Web 歌单", "远程链接", {
                        width: 480,
                        autoClose: false
                    }, (value, dom) => {
                        let waiting = ui.waiting();
                        fetch(value, {
                            method: "GET"
                        }).then(response => {
                            return response.json();
                        }).then(data => {
                            waiting.remove();
                            if (data.vniMusicRemoteSongListApiFormatVersion != 1 || data.code != 200) {
                                throw new Error();
                            }
                            let newSongListId = Math.floor(Math.random() * Math.pow(10, 8));
                            songListIndex.push({
                                id: newSongListId,
                                type: "web",
                                name: data.name
                            });
                            saveSongListIndex();
                            new AppDataFile(`SongLists/${newSongListId}.json`).writeObjectSync({
                                type: "web",
                                url: value,
                                sort: {
                                    type: "default",
                                    order: 0
                                }
                            });
                            loadSonglistsMenu();
                            document.getElementById("menu_songlist_sl").lastChild.click();
                            ui.closeDialog(dom);
                        }).catch(() => {
                            waiting.remove();
                            dom.querySelector(".ui-dialog-tip").innerText = "无效的远程链接";
                            dom.querySelector(".ui-dialog-tip").style.display = "block";
                        });
                    });
                }
            }
        ]).popup([evt.pageX, evt.pageY]);
    });

    document.getElementById("wbv").addEventListener("ipc-message", function (ev) {
        switch (ev.channel) {
            case "alert":
                ui.alert(ev.args[0], ev.args[1]);
                break;
            case "list-content-loaded":
                this.send("playing-song", encodeURI(getCurrentSrc()));
                break;
        }
    });
    // document.getElementById("wbv").openDevTools();

    document.getElementById("title_buttons_simpmode").addEventListener("click", () => {
        Electron.ipcRenderer.send("simpmode");
    });
    document.getElementById("title_buttons_donate").addEventListener("click", () => {
        ui.openDialog(document.getElementById("donate"));
    });
});

function setOverlayBackground(color) {
    Electron.ipcRenderer.send("set-overlay-background", color);
};
function switchWbvTo(link, itemdom) {
    if (itemdom != undefined) {
        if (document.getElementById("menu").getElementsByClassName("item-focused").length > 0) {
            document.getElementById("menu").getElementsByClassName("item-focused")[0].classList.remove("item-focused");
        }
        itemdom.classList.add("item-focused");
    }
    document.getElementById("wbv").loadURL(path.join(__dirname, link));
};

Electron.ipcRenderer.on("show-song-list", (event, songListId) => {
    Electron.ipcRenderer.send("window-role", "show");
    document.getElementById("menu_songlist_sl").querySelector(`div[data-sl-id="${songListId}"]`).click();
});

fetch("https://xenon.3sqrt7.com/VniMusic/desktop/checkUpdate");