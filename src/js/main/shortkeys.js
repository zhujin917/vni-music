window.addEventListener("keydown", (ev) => {
    if (ev.ctrlKey && ev.key == "a") {
        if (document.getElementById("playlist").style.right != "0px") {
            return;
        }
        for (let dom of document.getElementById("playlist_content").children) {
            dom.classList.add("item-focused");
        }
    }
    else if (ev.key == "Delete") {
        if (document.getElementById("playlist").style.right != "0px") {
            return;
        }
        for (let dom of document.getElementById("playlist_content").getElementsByClassName("item-focused")) {
            let n = playlist.indexOf(decodeURI(dom.getAttribute("data-songpath")));
            playlist.splice(n, 1);
            playlistWater.splice(n, 1);
        }
        loadPlayList();
    }
    else if (ev.key == " ") {
        if (document.getElementById("ui_mask") != undefined) {
            return;
        }
        ev.preventDefault();
        document.getElementById("player_center_play").click();
    }
});