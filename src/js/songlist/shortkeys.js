window.addEventListener("keydown", (ev) => {
    if (ev.ctrlKey) {
        switch (ev.key) {
            case "a":
                for (let dom of document.getElementById("list_content").children) {
                    dom.classList.add("item-focused");
                }
                break;
        }
    }
    else {
        switch (ev.key) {
            case "Delete":
                for (let dom of document.getElementsByClassName("item-focused")) {
                    songList.splice(songList.indexOf(
                        decodeURI(dom.getAttribute("data-songpath"))
                    ), 1);
                }
                saveSongList();
                break;
        }
    }
});