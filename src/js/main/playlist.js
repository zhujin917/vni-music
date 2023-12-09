let playlistplaylistDraggedDom = null;

function loadPlayList() {
    document.getElementById("playlist_num").innerText = `共 ${playlist.length} 首`;
    let elemList = document.getElementById("playlist_content").getElementsByClassName("item");
    for (let i = 0; i < elemList.length; i += 1) {
        let elem = elemList[i];
        if (playlist.indexOf(decodeURI(elem.getAttribute("data-songpath"))) == -1) {
            elem.remove();
            i -= 1;
        }
    }
    playlist.forEach((songPath, i) => {
        let itemDom = document.getElementById("playlist_content").querySelector(`.item[data-songpath="${encodeURI(songPath)}"]`);
        if (itemDom) {
            if (!isNaN(Number(itemDom.querySelector(".num").innerHTML))) {
                itemDom.querySelector(".num").innerHTML = i + 1;
            }
            if ((i + 1) % 2 == 1) {
                itemDom.classList.add("item-odd");
            }
            else {
                itemDom.classList.remove("item-odd");
            }
            itemDom.style.order = i;
            itemDom.setAttribute("data-songnum", i);
        }
        else {
            createPlayListItem(i, songPath);
        }
    });
};

function createPlayListItem(index, songPath) {
    let d = document.createElement("div");
    d.classList.add("item");
    if ((index + 1) % 2 == 1) {
        d.classList.add("item-odd");
    }
    d.style.order = index;
    d.setAttribute("data-songnum", index);
    d.setAttribute("data-songpath", encodeURI(songPath));
    d.innerHTML = `
        <div class="content num">${index + 1}</div>
        <div class="content title"></div>
        <div class="content artist"></div>
        <div class="content time"></div>
    `;
    d.addEventListener("dblclick", function () {
        this.classList.remove("item-focused");
        playNow(decodeURI(this.getAttribute("data-songpath")));
    });
    d.draggable = true;
    bindDragEventsForListItemDom(d, {
        focusable: true,
        indexAttr: "data-songnum"
    });
    d.addEventListener("dragstart", (evt) => {
        playlistDraggedDom = evt.target;
    });
    d.addEventListener("drop", function (evt) {
        if (this.classList.contains("item-focused")) {
            playlistDraggedDom = null;
            return;
        }
        let count = (evt.offsetY < this.offsetHeight / 2) ? 0 : 1;
        if (playlistDraggedDom != null) {
            let focusedSong = [];
            if (!playlistDraggedDom.classList.contains("item-focused")) {
                focusedSong = [{
                    "num": Number(playlistDraggedDom.getAttribute("data-songnum")),
                    "path": decodeURI(playlistDraggedDom.getAttribute("data-songpath"))
                }];
            }
            else {
                for (let focusedDom of this.parentElement.getElementsByClassName("item-focused")) {
                    focusedSong.push({
                        "num": Number(focusedDom.getAttribute("data-songnum")),
                        "path": decodeURI(focusedDom.getAttribute("data-songpath"))
                    });
                }
            }
            focusedSong.forEach((s) => {
                playlist[s.num] = null;
            });
            focusedSong.forEach((s) => {
                playlist.splice(Number(this.getAttribute("data-songnum")) + count, 0, s.path);
                count += 1;
            });
            playlist = playlist.filter(item => item !== null);
        }
        playlistDraggedDom = null;
        loadPlayList();
    });
    document.getElementById("playlist_content").appendChild(d);

    function fillSongInfo(songInfo) {
        let qsList = document.querySelectorAll(`div[data-songpath="${encodeURI(songPath)}"]`);
        for (let dom of qsList[qsList.length - 1].children) {
            if (dom.classList.contains("title")) {
                dom.innerText = (songInfo.title == undefined) ? songPath.substring(songPath.lastIndexOf("\\") + 1) : songInfo.title;
            }
            else if (dom.classList.contains("artist") && songInfo.artist != undefined) {
                dom.innerText = songInfo.artist;
            }
            else if (dom.classList.contains("album") && songInfo.album != undefined) {
                dom.innerText = songInfo.album;
            }
            else if (dom.classList.contains("time") && songInfo.duration != undefined) {
                dom.innerText = sec2str(songInfo.duration);
            }
        }
    };
    if (songPath.startsWith("http")) {
        document.getElementById("wbv").executeJavaScript(`webSongListInfo["${songPath}"]`).then(fillSongInfo);
    }
    else {
        Electron.ipcRenderer.invoke("get-song-info", songPath).then(fillSongInfo);
    }
};