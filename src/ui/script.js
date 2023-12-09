let ui = {
    openDialog(dom) {
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
    closeDialog(dom, removeMask) {
        dom.style.display = "none";
        if (removeMask !== false) {
            document.getElementById("ui_mask").remove();
        }
        if (dom.classList.contains("ui-dialog-script")) {
            dom.remove();
        }
        setOverlayBackground("#f5f5f5");
    },
    alert(title, text) {
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
    },
    confirm(title, text, callback) {
        let dom = document.createElement("div");
        dom.id = "ui_confirm";
        dom.classList.add("ui-dialog");
        dom.classList.add("ui-dialog-script");
        dom.innerHTML = `
            <p class="ui-dialog-title">${title}</p>
            <p class="ui-dialog-text">${text}</p>
            <div class="ui-dialog-btnbox">
                <button class="ui-btn ui-dialog-btn ui-dialog-cancel-btn" data-ui-dialog="close">取消</button>
                <button class="ui-btn ui-dialog-btn ui-btn-colored ui-dialog-ok-btn" data-ui-dialog="close">确定</button>
            </div>
        `;
        dom.querySelector(".ui-dialog-cancel-btn").addEventListener("click", () => {
            callback(false);
        });
        dom.querySelector(".ui-dialog-ok-btn").addEventListener("click", () => {
            callback(true);
        });
        document.body.appendChild(dom);
        ui.openDialog(dom);
    },
    prompt(title, placeholder, { value, width, allowEmpty, autoClose }, callback) {
        let dom = document.createElement("div");
        dom.id = "ui_prompt";
        dom.classList.add("ui-dialog");
        dom.classList.add("ui-dialog-script");
        dom.innerHTML = `
            <p class="ui-dialog-title">${title}</p>
            <input class="ui-input" type="text" placeholder="${placeholder}"><br>
            <p class="ui-dialog-tip" style="color: red; display: none;"></p>
            <div class="ui-dialog-btnbox">
                <button class="ui-btn ui-dialog-btn ui-dialog-cancel-btn" data-ui-dialog="close">取消</button>
                <button class="ui-btn ui-dialog-btn ui-btn-colored ui-dialog-ok-btn">确定</button>
            </div>
        `;
        dom.querySelector(".ui-input").value = value ? value : "";
        dom.querySelector(".ui-input").style.width = (width ? width : 280 - 24) + "px";
        dom.querySelector(".ui-dialog-ok-btn").addEventListener("click", () => {
            let val = dom.querySelector(".ui-input").value;
            if (!allowEmpty && val == "") {
                dom.querySelector(".ui-dialog-tip").innerText = `${placeholder}不能为空`;
                dom.querySelector(".ui-dialog-tip").style.display = "block";
                return;
            }
            if (autoClose !== false) {
                ui.closeDialog(dom);
            }
            callback(val, dom);
        });
        document.body.appendChild(dom);
        ui.openDialog(dom);
        dom.querySelector(".ui-input").select();
        dom.querySelector(".ui-input").focus();
    },
    waiting() {
        let dom = document.createElement("div");
        dom.classList.add("ui-waiting");
        document.body.appendChild(dom);
        return dom;
    }
};