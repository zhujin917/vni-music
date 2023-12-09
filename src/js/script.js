const fs = require("fs");
const path = require("path");
const Electron = require("electron");

const __datadir = `${process.env.USERPROFILE}\\AppData\\Roaming\\vni-music`;
class AppData {
    constructor(relativePath) {
        this.absolutePath = path.join(__datadir, relativePath);
    };
    absolutePath;
};
class AppDataDir extends AppData {
    constructor(relativePath) {
        super(relativePath);
    };
    makeSync() {
        if (!fs.existsSync(this.absolutePath)) {
            fs.mkdirSync(this.absolutePath);
        }
    };
};
class AppDataFile extends AppData {
    constructor(relativePath) {
        super(relativePath);
    };
    existsSync() {
        return fs.existsSync(this.absolutePath);
    };
    statSync() {
        return fs.statSync(this.absolutePath);
    };
    writeSync(...args) {
        fs.writeFileSync(this.absolutePath, ...args);
    };
    writeObjectSync(obj, ...args) {
        this.writeSync(JSON.stringify(obj), ...args);
    };
    readSync(...args) {
        return fs.readFileSync(this.absolutePath, ...args);
    };
    readObjectSync(...args) {
        return JSON.parse(this.readSync(...args));
    };
    rmSync(...args) {
        fs.rmSync(this.absolutePath, ...args);
    };
};
new AppDataDir("User").makeSync();
new AppDataDir("SongLists").makeSync();

window.addEventListener("dragstart", (ev) => {
    if (ev.target.getAttribute("data-songpath") || ev.target.getAttribute("data-sl-id")) {
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

function getWebResourceBase64(url) {
    return new Promise(resolve => {
        fetch(url, {
            method: "GET"
        }).then(response => {
            return response.blob();
        }).then(blob => {
            let reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = () => {
                resolve(reader.result);
            };
        });
    });
};

function getIPictureBase64(picture) {
    return `data:${picture.format};base64,${picture.data.toString("base64")}`;
};

function getFilesInDir(dirPath) {
    return new Promise(resolve => {
        fs.promises.readdir(dirPath, { withFileTypes: true }).then(dirents => {
            Promise.allSettled(dirents.map(dirent => new Promise(resolve => {
                if (dirent.isFile()) {
                    resolve(path.join(dirPath, dirent.name));
                }
                else if (dirent.isDirectory()) {
                    getFilesInDir(path.join(dirPath, dirent.name)).then(resolve);
                }
            }))).then(results => resolve(
                results.reduce((all, result) => result.status == "fulfilled" ? all.concat(result.value) : all, [])
            ));
        });
    });
};