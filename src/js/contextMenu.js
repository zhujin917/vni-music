class ContextMenu {
    dom;

    constructor(items) {
        this.dom = document.createElement("div");
        this.dom.classList.add("context-menu");
        this.dom.addEventListener("mousedown", (evt) => {
            evt.stopPropagation();
        });

        for (let item of items) {
            let d;
            if (item.label) {
                d = document.createElement("div");
                d.classList.add("context-menu-item");
                d.innerText = item.label;
                d.addEventListener("click", () => {
                    this.dom.parentElement.remove();
                    setTimeout(() => {
                        item.click();
                    }, 10);
                });
            }
            else if (item.type == "separator") {
                d = document.createElement("hr");
                d.classList.add("context-menu-separator");
            }
            this.dom.appendChild(d);
        }
    };

    popup([x, y]) {
        let maskDom = document.getElementById("context-menu-mask");
        if (!maskDom) {
            maskDom = document.createElement("div");
            maskDom.id = "context-menu-mask";
            maskDom.addEventListener("mousedown", function (evt) {
                if (evt.button == 0) {
                    this.remove();
                }
            });
            maskDom.addEventListener("mousedown", function () {
                this.remove();
            });
        }
        maskDom.appendChild(this.dom);
        document.body.appendChild(maskDom);

        this.dom.style.left = `${(x + this.dom.clientWidth < window.innerWidth) ? x : x - this.dom.clientWidth}px`;
        this.dom.style.top = `${(y + this.dom.clientHeight < window.innerHeight) ? y : y - this.dom.clientHeight}px`;

        setTimeout(() => {
            this.dom.style.opacity = "1";
        }, 10);
    };
};

function closeContextMenu() {
    let maskDom = document.getElementById("context-menu-mask");
    if (maskDom) {
        maskDom.remove();
    }
};
window.addEventListener("resize", closeContextMenu);
window.addEventListener("blur", closeContextMenu);