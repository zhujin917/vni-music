let ui = {
    "openDialog": (dom) => {
        if (!document.getElementById("ui_mask")) {
            let mask = document.createElement("div");
            mask.id = "ui_mask";
            document.body.appendChild(mask);
        }
        dom.style.display = "block";
        for (let d of dom.children) {
            if (!d.classList.contains("ui-dialog-btnbox")) {
                continue;
            }
            for (let dd of d.children) {
                if (dd.getAttribute("data-ui-dialog") != "close") {
                    continue;
                }
                dd.onclick = () => {
                    ui.closeDialog(dom);
                };
            }
        }
        setOverlayBackground("#939393");
    },
    "closeDialog": (dom, removeMask) => {
        dom.style.display = "none";
        if (removeMask !== false) {
            document.getElementById("ui_mask").remove();
        }
        if (dom.classList.contains("ui-dialog-script")) {
            dom.remove();
        }
        setOverlayBackground("#f5f5f5");
    },
    "alert": (title, text) => {
        let dom = document.createElement("div");
        dom.id = "ui_alert";
        dom.classList.add("ui-dialog");
        dom.classList.add("ui-dialog-script");
        dom.innerHTML = `
            <p class="ui-dialog-title">${title}</h1>
            <p class="ui-dialog-text">${text}</p>
            <div class="ui-dialog-btnbox">
                <button class="ui-btn ui-dialog-btn ui-btn-colored" data-ui-dialog="close">确定</button>
            </div>
        `;
        document.body.appendChild(dom);
        ui.openDialog(dom);
    }
};