window.addEventListener("load", () => {
    document.getElementById("menu_top_home").addEventListener("click", function () {
        switchWbvTo("home.html", this);
    });
    document.getElementById("menu_songlist_add").addEventListener("click", (evt) => {
        new ContextMenu([
            {
                label: "空白歌单",
                click() {
                    ui.openDialog(document.getElementById("newSongList"));
                    document.getElementById("newSongList_err_empty").style.display = "none";
                    document.getElementById("newSongList_name").value = "";
                    document.getElementById("newSongList_name").focus();
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
                    new AppDataFile(`SongLists/${newSongListId}.json`).writeObjectSync(folderPath);
                    loadSonglistsMenu();
                    document.getElementById("menu_songlist_sl").lastChild.click();
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