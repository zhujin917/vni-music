window.addEventListener("keydown", (evt) => {
    if (evt.ctrlKey && evt.key == "a") {
        for (let dom of document.getElementById("list_content").children) {
            dom.classList.add("item-focused");
        }
    }
    else if (evt.key == "Delete") {
        if (!checkIfCanEdit()) {
            return;
        }
        if (songListType == "folder") {
            Electron.ipcRenderer.sendToHost("alert", "提示", "请前往文件资源管理器删除文件。");
            return;
        }
        for (let dom of document.getElementById("list_content").getElementsByClassName("item-focused")) {
            songList.splice(songList.indexOf(
                decodeURI(dom.getAttribute("data-songpath"))
            ), 1);
        }
        saveSongList();
    }
});