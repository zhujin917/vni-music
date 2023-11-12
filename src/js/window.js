window.addEventListener("load", () => {
    let closeBtn = document.getElementById("titleBar_buttons_close");
    if (closeBtn) {
        closeBtn.addEventListener("click", () => {
            Electron.ipcRenderer.send("window-role", "close");
        });
    }

    let minimizeBtn = document.getElementById("titleBar_buttons_minimize");
    if (minimizeBtn) {
        minimizeBtn.addEventListener("click", () => {
            Electron.ipcRenderer.send("window-role", "minimize");
        });
    }
});