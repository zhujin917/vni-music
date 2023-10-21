module.exports = {
    packagerConfig: {
        "name": "维念音乐", // 应用程序的名称
        "executableName": "VniMusic", // 产品名称（用于生成安装包的名称）
        "icon": "./img/logo.ico", // 应用程序的图标路径
        "overwrite": true, // 是否覆盖已存在的打包文件
        "asar": true, // 是否使用asar打包格式
        "appVersion": "0.3.0", // 应用程序版本号
        "appCopyright": "版权所有 © 2023 维念软件。保留所有权利。", // 版权信息
        "ignore": [ // 不需要打包的文件和文件夹的路径列表
            ".git",
            ".vscode",
            "node_modules/.cache"
        ]
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
