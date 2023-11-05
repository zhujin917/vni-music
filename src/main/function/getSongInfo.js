const musicMetadata = require("music-metadata");

module.exports.getSongInfo = (songPath) => new Promise((resolve) => {
    let result = {};
    musicMetadata.parseFile(songPath).then((value) => {
        result["title"] = value.common.title;
        result["artist"] = value.common.artist;
        result["album"] = value.common.album;
        result["duration"] = value.format.duration;
        resolve(result);
    });
});