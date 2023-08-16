let songsInfo = {};

ipcRenderer.on("songs", (event, songs) => {
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

        ipcRenderer.send("get-mp3-info", songPath, ((songPath, songInfo) => {
            songsInfo[songPath] = songInfo;
            document.querySelectorAll(`div[data-songpath="${encodeURI(songPath)}"]`)[0]
                .children[2].innerText = songInfo.title;
        }).toString());
    });
});

let webview;
window.addEventListener("load", () => {
    webview = document.getElementById("webview");
    document.getElementById("top_start").addEventListener("click", () => {
        ipcRenderer.send("popup-menu", [
            {
                label: "嵌入到源音频文件",
                onclick: (() => {
                    startSearchingLyric("source-file");
                }).toString()
            }, {
                label: "保存为 LRC 文件到源文件夹",
                onclick: (() => {
                    startSearchingLyric("source-folder");
                }).toString()
            }, {
                label: "保存为 LRC 文件指定文件夹",
                onclick: (() => {
                    lyricSavingFolderPath = ipcRenderer.sendSync("show-open-dialog-sync", {
                        title: "保存歌词为 LRC 文件",
                        buttonLabel: "保存歌词为 LRC 文件到此文件夹",
                        defaultPath: Object.keys(songsInfo)[0].substring(0, Object.keys(songsInfo)[0].lastIndexOf("\\")),
                        properties: ["openDirectory"]
                    });
                    if (lyricSavingPath == undefined) {
                        return;
                    }
                    startSearchingLyric("folder");
                }).toString()
            }
        ], {
            x: window.innerWidth - 230, y: 100
        })
    });
    webview.addEventListener("did-stop-loading", () => {
        let link = webview.getURL().split("https://music.163.com/#")[1];
        if (link.startsWith("/search")) {
            function checkIframeReadyState() {
                webview.executeJavaScript(`document.getElementById("g_iframe").contentDocument.getElementsByClassName("u-load")[0] == undefined`)
                    .then((ret) => {
                        if (!ret) {
                            setTimeout(checkIframeReadyState, 10);
                            return;
                        }
                        checkIfCanSearch();
                    });
            };
            checkIframeReadyState();
            function checkIfCanSearch() {
                webview.executeJavaScript(`document.getElementById("g_iframe").contentDocument.getElementsByClassName("n-nmusic")[0] == undefined`)
                    .then((ret) => {
                        if (!ret) {
                            document.getElementById("list_content").children[lyricSavingCount].children[0].innerHTML
                                = `<span style="color:red">✘</span>`;
                            lyricSavingCount += 1;
                            checkIfComplete();
                            return;
                        }
                        jumpToDetailsPage();
                    });
            };
            function jumpToDetailsPage() {
                webview.executeJavaScript(`
                    document.getElementById("g_iframe").contentDocument
                        .getElementsByClassName("srchsongst")[0].children[0]
                        .children[1].children[0].children[0].children[0].click()
                `);
            };
        }
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
    webview.src = `https://music.163.com/#/search/m/?s=${encodeURI(songsInfo[lyricSavingPath].title)
        } ${encodeURI(songsInfo[lyricSavingPath].artist)} ${encodeURI(songsInfo[lyricSavingPath].album)}`;
};
ipcRenderer.on("lyric-upload-data", (event, uploadData) => {
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
                ipcRenderer.send("set-id3-lyric", lyricSavingPath, lyric.lrc.lyric);
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