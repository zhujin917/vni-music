const musicMetadata = require("music-metadata");
const nodeId3 = require("node-id3");

Electron.ipcRenderer.on("song-path", (event, songPath) => {
    let basename = path.basename(songPath);

    document.title = `${basename} ${document.title}`;
    document.getElementById("titleBar_text").innerText = document.title;
    document.getElementById("fname").value = basename;
    document.getElementById("path").value = path.dirname(songPath);
    document.getElementById("openPath").addEventListener("click", () => {
        Electron.shell.showItemInFolder(songPath);
    });

    let lrcFilePath = path.format({
        dir: path.dirname(songPath),
        name: path.basename(songPath, path.extname(songPath)),
        ext: ".lrc"
    });
    let existsLrcFile = fs.existsSync(lrcFilePath);
    document.getElementById("lrcFile").value = existsLrcFile ? "存在" : "不存在";
    if (existsLrcFile) {
        document.getElementById("openLrc").hidden = false;
        document.getElementById("openLrc").addEventListener("click", () => {
            Electron.shell.showItemInFolder(lrcFilePath);
        });
    }

    fs.promises.stat(songPath).then((fileStat) => {
        document.getElementById("size").value = formatSizeUnits(fileStat.size);
        document.getElementById("blksize").value = formatSizeUnits(fileStat.blksize);

        document.getElementById("birthtime").value = fileStat.birthtime.toLocaleString();
        document.getElementById("mtime").value = fileStat.mtime.toLocaleString();
        document.getElementById("atime").value = fileStat.atime.toLocaleString();
    });

    musicMetadata.parseFile(songPath).then((songInfo) => {
        document.getElementById("top_img").src = (() => {
            if (songInfo.common.picture) { return getIPictureBase64(songInfo.common.picture[0]); }
            return "../img/icon/music.svg";
        })();

        document.getElementById("top_text").innerText = (() => {
            if (songInfo.common.title) { return songInfo.common.title; }
            return basename;
        })();

        document.getElementById("title").value = songInfo.common.title ? songInfo.common.title : "";
        document.getElementById("artist").value = songInfo.common.artists ? songInfo.common.artists.join("、") : "";
        document.getElementById("album").value = songInfo.common.album ? songInfo.common.album : "";
        document.getElementById("duration").value = sec2str(songInfo.format.duration);

        document.getElementById("container").value = songInfo.format.container;
        document.getElementById("codec").value = songInfo.format.codec;
        document.getElementById("codecProfile").value = songInfo.format.codecProfile;
        document.getElementById("tagTypes").value = songInfo.format.tagTypes.join(", ");
        document.getElementById("bitrate").value = songInfo.format.bitrate + " 位/秒";
        document.getElementById("sampleRate").value = songInfo.format.sampleRate + " 采样/秒";
        document.getElementById("lossless").value = songInfo.format.lossless ? "无损" : "有损";
        document.getElementById("numberOfChannels").value = songInfo.format.numberOfChannels;

        readId3Lyric(songPath, songInfo);
    });
});

function readId3Lyric(songPath, songInfo) {
    let isId3 = false;
    for (let tag of songInfo.format.tagTypes) {
        if (tag.toUpperCase().startsWith("ID3")) {
            isId3 = true;
            nodeId3.Promise.read(songPath).then((value) => {
                let lyric = value.synchronisedLyrics;
                document.getElementById("lyric").value = lyric ? "存在" : "不存在";
                if (lyric) {
                    document.getElementById("clrLrc").hidden = false;
                    document.getElementById("clrLrc").onclick = () => {
                        nodeId3.Promise.write({
                            synchronisedLyrics: []
                        }, songPath).then(() => {
                            readId3Lyric(songPath, songInfo);
                        });
                    };
                }
                else {
                    document.getElementById("clrLrc").hidden = true;
                }
            });
            break;
        }
    }
    if (!isId3) {
        document.getElementById("lyric").value = "不支持";
    }
};