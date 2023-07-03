ipcRenderer.on("lyric-update", (event, lrcTxt) => {
    document.getElementById("lrc").innerHTML = lrcTxt;
});

let x = 0, y = 0, s = 30;
ipcRenderer.on("kp", (event, key) => {
    switch (key) {
        case "w":
            y -= 10;
            break;
        case "s":
            y += 10;
            break;
        case "a":
            x -= 10;
            break;
        case "d":
            x += 10;
            break;
        case "=":
            s += 2;
            break;
        case "-":
            s -= 2;
            break;
    }
    document.getElementById("lrc").style.transform = `translate(${x}px, ${y}px)`;
    document.getElementById("lrc").style.fontSize = `${s}px`;
});