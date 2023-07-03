window.addEventListener("load", () => {
    document.getElementById("titleBar_buttons_close").addEventListener("click", () => {
        ipcRenderer.send("mp3-modify-window", "close");
    });
    document.getElementById("titleBar_buttons_minimize").addEventListener("click", () => {
        ipcRenderer.send("mp3-modify-window", "minimize");
    });
});