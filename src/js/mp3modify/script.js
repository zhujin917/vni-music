let songsInfo = {};

Electron.ipcRenderer.on("songs", (event, songs) => {
    document.getElementById("top_num").innerText = `共 ${songs.length} 个文件`;

    let count = 0;
    songs.forEach((songPath) => {
        count += 1;
        songsInfo[songPath] = {};

        let d = document.createElement("div");
        d.classList.add("item");
        if (count % 2 == 1) {
            d.classList.add("item-odd")
        }
        d.setAttribute("data-songnum", count);
        d.setAttribute("data-songpath", encodeURI(songPath));
        d.innerHTML = `
            <div class="content num">${count}</div>
            <div class="content file">${songPath.substring(songPath.lastIndexOf("\\") + 1)}</div>
            <div class="content title"></div>
        `;
        document.getElementById("list_content").appendChild(d);

        Electron.ipcRenderer.invoke("get-song-info", songPath).then((songInfo) => {
            songsInfo[songPath] = songInfo;
            document.querySelectorAll(`div[data-songpath="${encodeURI(songPath)}"]`)[0]
                .children[2].innerText = songInfo.title;
        });
    });
});

let webview;
window.addEventListener("load", () => {
    webview = document.getElementById("webview");
    document.getElementById("top_start").addEventListener("click", () => {
        new ContextMenu([
            {
                label: "嵌入到源音频文件",
                click() {
                    startSearchingLyric("source-file");
                }
            }, {
                label: "保存为 LRC 文件到源文件夹",
                click() {
                    startSearchingLyric("source-folder");
                }
            }, {
                label: "保存为 LRC 文件指定文件夹",
                click() {
                    lyricSavingFolderPath = Electron.ipcRenderer.sendSync("show-open-dialog-sync", {
                        title: "保存歌词为 LRC 文件",
                        buttonLabel: "保存歌词为 LRC 文件到此文件夹",
                        defaultPath: Object.keys(songsInfo)[0].substring(0, Object.keys(songsInfo)[0].lastIndexOf("\\")),
                        properties: ["openDirectory"]
                    })[0];
                    if (lyricSavingFolderPath == undefined) {
                        return;
                    }
                    startSearchingLyric("folder");
                }
            }
        ]).popup([window.innerWidth - 230, 100]);
    });

    webview.addEventListener("did-finish-load", () => {
        if (webview.getURL() != "https://www.baidu.com/") {
            return;
        }
        let keyword = "site:music.163.com \"";
        if (songsInfo[lyricSavingPath].title) {
            keyword += songsInfo[lyricSavingPath].title + " ";
        }
        if (songsInfo[lyricSavingPath].artist) {
            keyword += songsInfo[lyricSavingPath].artist + " ";
        }
        keyword += "单曲 网易云音乐\"";
        webview.executeJavaScript(`
            document.getElementById("kw").value = \`${keyword}\`;
            document.getElementById("su").click();
        `);
    });

    webview.addEventListener("page-title-updated", () => {
        if (!webview.getTitle().endsWith("_百度搜索")) {
            return;
        }
        getSearchingResult(0);
        function getSearchingResult(times) {
            if (times >= 8) {
                document.getElementById("list_content").children[lyricSavingCount].children[0].innerHTML
                    = `<span style="color:red">✘</span>`;
                lyricSavingCount += 1;
                checkIfComplete();
                return;
            }
            webview.executeJavaScript(`
                leeTianSuo1145141919810result = [];
                for (let elem of document.getElementsByClassName("result")) {
                    if (/https:\\\/\\\/music\\.163\\.com\\\/\\S*song\\?id=\\S+/.test(elem.getAttribute("mu"))) {
                        leeTianSuo1145141919810result.push(elem.getAttribute("mu"));
                    }
                }
                leeTianSuo1145141919810result;
            `).then((ret) => {
                if (ret.length == 0) {
                    throw new Error("retry");
                }
                webview.src = ret[0];
            }).catch(() => {
                setTimeout(() => {
                    getSearchingResult(times + 1);
                }, 200);
            });
        };
    });
});

let lyricSavingFolderPath;
let lyricSavingMode;
let lyricSavingCount, lyricSavingPath;
function startSearchingLyric(mode) {
    lyricSavingMode = mode;
    document.getElementById("top_start").style.display = "none";
    document.getElementById("top_loading").style.display = "block";
    document.getElementById("top_tip").style.display = "block";
    document.getElementById("top_num").innerText = `已完成 0 / ${Object.keys(songsInfo).length} 个文件`;
    lyricSavingCount = 0;
    searchNextLyric();
};
function searchNextLyric() {
    document.getElementById("list_content").children[lyricSavingCount].scrollIntoView();
    document.getElementById("list_content").children[lyricSavingCount].children[0].innerHTML
        = document.getElementById("top_loading").outerHTML.replace("id", "data-id");
    lyricSavingPath = Object.keys(songsInfo)[lyricSavingCount];
    webview.src = "https://www.baidu.com/";
};
Electron.ipcRenderer.on("lyric-upload-data", (event, uploadData) => {
    fetch("https://music.163.com/weapi/song/lyric?csrf_token=", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: uint8ArrayToString(uploadData[0].bytes)
    }).then((response) => {
        return response.json();
    }).then((lyric) => {
        switch (lyricSavingMode) {
            case "source-file":
                Electron.ipcRenderer.send("set-id3-lyric", lyricSavingPath, lyric.lrc.lyric);
                break;
            case "source-folder":
                fs.writeFileSync(`${lyricSavingPath.substring(0, lyricSavingPath.length - 4)}.lrc`, lyric.lrc.lyric);
                break;
            case "folder":
                fs.writeFileSync(
                    `${lyricSavingFolderPath}\\${lyricSavingPath.substring(lyricSavingPath.lastIndexOf("\\"), lyricSavingPath.lastIndexOf("."))}.lrc`,
                    lyric.lrc.lyric);
                break;
        }
        document.getElementById("list_content").children[lyricSavingCount].children[0].innerHTML
            = `<span style="color:#00B050">✔</span>`;
        lyricSavingCount += 1;
        checkIfComplete();
    });
});
function checkIfComplete() {
    document.getElementById("top_num").innerText
        = `已完成 ${lyricSavingCount} / ${Object.keys(songsInfo).length} 个文件`;
    if (lyricSavingCount < Object.keys(songsInfo).length) {
        searchNextLyric();
        return;
    }
    document.getElementById("top_start").innerText = "重新搜索";
    document.getElementById("top_start").style.display = "block";
    document.getElementById("top_loading").style.display = "none";
    document.getElementById("top_tip").style.display = "none";
    ui.alert("搜索完毕", "已完成对所有音乐文件的歌词搜索。");
};

function uint8ArrayToString(data) {
    let ret = "";
    for (let i = 0; i < data.length; i += 1) {
        ret += String.fromCharCode(data[i]);
    }
    return ret;
};