let unsortedSongList;

function sortSongList() {
    for (let elem of document.getElementById("list_top").getElementsByClassName("sort-icon")) {
        if (elem.parentElement.getAttribute("data-sort") != sortMode.type) {
            elem.style.display = "";
            continue;
        }
        switch (sortMode.order) {
            case 0:
                elem.style.display = "";
                break;
            case -1:
                elem.style.display = "inline-block";
                elem.src = "../img/icon/sort-amount-down.svg";
                break;
            case 1:
                elem.style.display = "inline-block";
                elem.src = "../img/icon/sort-amount-up.svg";
                break;
        }
    }

    if (sortMode.order != 0 && !unsortedSongList) {
        unsortedSongList = [...songList];
    }

    if (sortMode.order == 0) {
        sortMode.type = "default";
        if (unsortedSongList) {
            songList = [...unsortedSongList];
        }
    }
    else {
        songList.sort((songPathA, songPathB) => {
            let textA = document.getElementById("list_content").querySelector(`.item[data-songpath="${encodeURI(songPathA)}"]`).querySelector(`.${sortMode.type}`).innerText;
            let textB = document.getElementById("list_content").querySelector(`.item[data-songpath="${encodeURI(songPathB)}"]`).querySelector(`.${sortMode.type}`).innerText;
            return textA.localeCompare(textB) * sortMode.order;
        });
    }
};

window.addEventListener("load", () => {
    document.getElementById("list_top").querySelector(".title").onclick
        = document.getElementById("list_top").querySelector(".artist").onclick
        = document.getElementById("list_top").querySelector(".album").onclick
        = function () {
            if (sortMode.type != this.getAttribute("data-sort")) {
                sortMode.type = this.getAttribute("data-sort");
                sortMode.order = 1;
            }
            else {
                sortMode.order += 1;
                if (sortMode.order > 1) {
                    sortMode.order = -1;
                }
            }

            saveSongList();
        };
});