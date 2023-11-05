window.addEventListener("load", () => {
    document.getElementById("menu_top_home").addEventListener("click", function () {
        switchWbvTo("home.html", this);
    });
    document.getElementById("menu_songlist_add").addEventListener("click", () => {
        ui.openDialog(document.getElementById("newSongList"));
        document.getElementById("newSongList_err_empty").style.display = "none";
        document.getElementById("newSongList_name").value = "";
        document.getElementById("newSongList_name").focus();
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
        if (document.getElementsByClassName("menu-item-focused").length > 0) {
            document.getElementsByClassName("menu-item-focused")[0].classList.remove("menu-item-focused");
        }
        itemdom.classList.add("menu-item-focused");
    }
    document.getElementById("wbv").src = `./${link}`;
};