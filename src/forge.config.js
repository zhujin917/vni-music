module.exports = {
    packagerConfig: {
        "name": "维念音乐",
        "executableName": "VniMusic",
        "icon": "./img/logo.ico",
        "overwrite": true,
        "asar": true,
        "appVersion": "0.4.2",
        "appCopyright": "版权所有 © 2023 维念软件。保留所有权利。",
        "ignore": [
            ".git",
            ".vscode",
            "node_modules/.cache"
        ],
        "win32metadata": {
            "CompanyName": "维念软件"
        }
    },
    rebuildConfig: {},
    makers: [],
    plugins: [
        {
            name: '@electron-forge/plugin-auto-unpack-natives',
            config: {},
        },
    ],
};
