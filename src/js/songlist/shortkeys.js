window.addEventListener("keydown", (evt) => {
    if (evt.ctrlKey && evt.key == "a") {
        for (let dom of document.getElementById("list_content").children) {
            dom.classList.add("item-focused");
        }
    }
    else if (evt.key == "Delete") {
        for (let dom of document.getElementById("list_content").getElementsByClassName("item-focused")) {
            songList.splice(songList.indexOf(
                decodeURI(dom.getAttribute("data-songpath"))
            ), 1);
        }
        saveSongList();
    }
});