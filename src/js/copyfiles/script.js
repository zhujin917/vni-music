let totalNum = 0;
let totalSize = 0;
let copiedNum = 0;
let copiedSize = 0;

let processing = false;
window.addEventListener("load", () => {
    document.getElementById("cancel").addEventListener("click", () => {
        if (processing) {
            processing = false;
            return;
        }
        Electron.ipcRenderer.send("window-role", "destroy");
    });
});

Electron.ipcRenderer.on("close", () => {
    document.getElementById("cancel").click();
});

Electron.ipcRenderer.on("start-copy", (event, from, srcFileList, to, targetFolder) => {
    totalNum = srcFileList.length;
    document.title += ` ${totalNum} 首歌曲`;
    document.getElementById("titleBar_text").innerText = document.title;
    document.getElementById("subtitle_sum").innerText = totalNum;
    document.getElementById("subtitle_from").innerText = (typeof from == "string") ? path.basename(from) : from.name;
    document.getElementById("subtitle_to").innerText = (typeof to == "string") ? path.basename(to) : to.name;

    document.getElementById("subtitle_from").addEventListener("click", () => {
        if (typeof from == "string") {
            Electron.shell.openPath(from);
        }
        else {
            Electron.ipcRenderer.send("send-to-main-window", "show-song-list", from.id);
        }
    });
    document.getElementById("subtitle_to").addEventListener("click", () => {
        if (typeof to == "string") {
            Electron.shell.openPath(to);
        }
        else {
            Electron.ipcRenderer.send("send-to-main-window", "show-song-list", to.id);
        }
    });

    let extraFileList = [];
    srcFileList.forEach(filePath => {
        totalSize += fs.statSync(filePath).size;
        let lrcPath = path.format({
            dir: path.dirname(filePath),
            name: path.basename(filePath, path.extname(filePath)),
            ext: ".lrc"
        });
        if (fs.existsSync(lrcPath)) {
            extraFileList.push(lrcPath);
            totalNum += 1;
            totalSize += fs.statSync(lrcPath).size;
        }
    });
    srcFileList = srcFileList.concat(extraFileList);

    setTimeout(() => {
        processing = true;
        document.getElementById("title").innerText = "已完成 0%";
        document.getElementById("progress_bar").style.animation = "none";
        document.getElementById("progress_bar").style.width = "0";
        document.getElementById("details").style.opacity = "1";
        copy(srcFileList, 0, targetFolder);
    }, 1000);
});

function copy(srcFileList, index, targetFolder) {
    let filePath = srcFileList[index];
    let srcStream = fs.createReadStream(filePath);
    let targetStream = fs.createWriteStream(path.join(targetFolder, path.basename(filePath)));
    srcStream.on("data", (buffer) => {
        copiedSize += buffer.length;
        let percentage = Math.round(copiedSize * 100 / totalSize);
        document.getElementById("title").innerText = `已完成 ${percentage}%`;
        document.getElementById("progress_bar").style.width = `${percentage}%`;
        document.getElementById("details_name").innerText = path.basename(filePath);
        document.getElementById("details_items").innerText = `${totalNum - copiedNum - 1} (${formatSizeUnits(totalSize - copiedSize)})`;
    });
    srcStream.on("end", () => {
        copiedNum += 1;
        if (copiedNum < totalNum && processing) {
            setTimeout(() => {
                copy(srcFileList, copiedNum, targetFolder);
            }, 1);
        }
        else {
            setTimeout(() => {
                processing = false;
                document.getElementById("cancel").click();
            }, 200);
        }
    });
    srcStream.pipe(targetStream);
};
