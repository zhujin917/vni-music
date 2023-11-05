const fs = require("fs");
const path = require("path");
const Electron = require("electron");

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

function getIPictureBase64(picture) {
    return `data:${picture.format};base64,${picture.data.toString("base64")}`;
};