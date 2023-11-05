window.addEventListener("load", () => {
    document.getElementById("titleBar_buttons_close").addEventListener("click", () => {
        Electron.ipcRenderer.send("window-role", "close");
    });
    document.getElementById("titleBar_buttons_minimize").addEventListener("click", () => {
        Electron.ipcRenderer.send("window-role", "minimize");
    });
});