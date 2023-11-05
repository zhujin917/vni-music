module.exports.lrcStr2synchronisedLyrics = (lrcStr) => {
    let syncLyrics = [];
    lrcStr.split("\n").forEach((lrc) => {
        let timeStr;
        let regex = new RegExp(/\[[\s\S]*?\]/g);
        while ((timeStr = regex.exec(lrc)) !== null) {
            let text = lrc.substring(lrc.lastIndexOf("]") + 1);
            if (text[text.length - 1] == "\r") {
                text = text.substring(0, text.length - 1);
            }

            let time = timeStr[0].substring(1, timeStr[0].length - 2);
            let timeStamp = Math.floor(Number(time.split(":")[0]) * 60 * 1000 + Number(time.split(":")[1]) * 1000);
            if (isNaN(timeStamp)) {
                timeStamp = 0;
            }

            syncLyrics.push({
                text: text,
                timeStamp: timeStamp
            });
        }
    });
    syncLyrics.sort((a, b) => {
        return a.timeStamp - b.timeStamp;
    });
    return syncLyrics;
};