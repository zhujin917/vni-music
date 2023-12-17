Electron.ipcRenderer.on("song-list-id", (event, songListId) => {
    let filePath = `SongLists/${songListId}.json`;
    let fileObject = new AppDataFile(filePath);
    let fileStat = fileObject.statSync();
    let fileContent = fileObject.readObjectSync();

    Electron.ipcRenderer.invoke("get-file-icon", filePath, {
        size: "normal"
    }).then((native) => {
        document.getElementById("top_img").src = native.toDataURL();
    });

    new AppDataFile("User/SongListIndex.json").readObjectSync().forEach(item => {
        if (item.id != songListId) {
            return;
        }
        document.title = `${item.name} ${document.title}`;
        document.getElementById("titleBar_text").innerText = document.title;
        document.getElementById("top_text").innerText = item.name;
        document.getElementById("name").value = item.name;
    });

    document.getElementById("id").value = songListId;
    document.getElementById("type").value = (() => {
        if (fileContent.type == "files") { return "自由"; }
        if (fileContent.type == "folder") { return "从文件夹同步"; }
        if (fileContent.type == "web") { return "从 Web 同步"; }
    })();
    if (fileContent.type == "folder") {
        document.getElementById("source").parentElement.hidden = false;
        document.getElementById("source").value = fileContent.path;
        document.getElementById("openSrc").style.display = "block";
        document.getElementById("openSrc").addEventListener("click", () => {
            Electron.shell.openPath(fileContent.path);
        });
    }
    else if (fileContent.type == "web") {
        document.getElementById("source").parentElement.hidden = false;
        document.getElementById("source").value = fileContent.url;
    }

    document.getElementById("birthtime").value = fileStat.birthtime.toLocaleString();
    document.getElementById("mtime").value = fileStat.mtime.toLocaleString();
    document.getElementById("atime").value = fileStat.atime.toLocaleString();

    document.getElementById("basename").value = path.basename(fileObject.absolutePath);
    document.getElementById("dirname").value = path.dirname(fileObject.absolutePath);
    document.getElementById("size").value = formatSizeUnits(fileStat.size);
    document.getElementById("blksize").value = formatSizeUnits(fileStat.blksize);

    document.getElementById("openDn").addEventListener("click", () => {
        Electron.shell.showItemInFolder(fileObject.absolutePath);
    });
});