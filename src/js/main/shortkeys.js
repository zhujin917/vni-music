window.addEventListener("keydown", (ev) => {
    if (ev.ctrlKey) {
        switch (ev.key) {
            case "a":
                if (document.getElementById("playlist").style.right != "0px") {
                    return;
                }
                for (let dom of document.getElementById("playlist_content").children) {
                    dom.classList.add("item-focused");
                }
                break;
        }
    }
    else {
        switch (ev.key) {
            case "Delete":
                if (document.getElementById("playlist").style.right != "0px") {
                    return;
                }
                for (let dom of document.getElementsByClassName("item-focused")) {
                    let n = playlist.indexOf(decodeURI(dom.getAttribute("data-songpath")));
                    playlist.splice(n, 1);
                    playlistWater.splice(n, 1);
                }
                let playingDom = document.getElementsByClassName("item-playing")[0];
                loadPlayList(
                    (playingDom == undefined) ? undefined : decodeURI(playingDom.getAttribute("data-songpath"))
                );
                break;
            case " ":
                if (document.getElementById("ui_mask") != undefined) {
                    return;
                }
                ev.preventDefault();
                document.getElementById("player_center_play").click();
                break;
        }
    }
});