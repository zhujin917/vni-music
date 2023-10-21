const fs = require("fs");
const path = require("path");
const { ipcRenderer } = require("electron");

const jsmediatags = require("jsmediatags");

let __datadir = `${process.env.USERPROFILE}\\AppData\\Roaming\\vni-music\\AppData`;
if (!fs.existsSync(__datadir)) {
    fs.mkdirSync(__datadir);
}

window.addEventListener("dragstart", (ev) => {
    if (ev.target.getAttribute("data-songpath") != null) {
        return;
    }
    ev.preventDefault();
});

function sec2str(sec) {
    let ret = "";
    ret += (Array(2).join(0) + Math.floor(sec / 60)).slice(-2);
    ret += ":";
    ret += (Array(2).join(0) + Math.floor(sec % 60)).slice(-2);
    return ret;
};

function getPicBase64(picture) {
    let ret;
    try {
        let base64String = "";
        for (let i = 0; i < picture.data.length; i += 1) {
            base64String += String.fromCharCode(picture.data[i]);
        }
        ret = `data:${picture.format};base64,${window.btoa(base64String)}`;
    } catch (e) {
        ret = "../img/icon/music.svg";
    } finally {
        return ret;
    }
};