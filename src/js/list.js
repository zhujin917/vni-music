function bindDragEventsForListItemDom(dom, { focusable, indexAttr }) {
    function resetDragoverStyle() {
        let styledDom = dom.parentElement.getElementsByClassName("item-dragover");
        if (styledDom.length > 0) {
            styledDom[0].classList.remove("item-dragover");
        }
        styledDom = dom.parentElement.getElementsByClassName("item-dragover-top");
        if (styledDom.length > 0) {
            styledDom[0].classList.remove("item-dragover-top");
        }
    };

    function getPreviousItemDom(currentDom) {
        return dom.parentElement.querySelector(`.item[${indexAttr}="${Number(currentDom.getAttribute(indexAttr)) - 1}"]`);
    };

    dom.addEventListener("dragover", function (evt) {
        evt.preventDefault();
        let isUpperPart = evt.offsetY < this.offsetHeight / 2;
        let previousElement = getPreviousItemDom(this);
        if (isUpperPart) {
            resetDragoverStyle();
            if (previousElement && !previousElement.classList.contains("item-dragover")) {
                previousElement.classList.add("item-dragover");
            }
            else if (!previousElement && !this.classList.contains("item-dragover-top")) {
                this.classList.add("item-dragover-top");
            }
        }
        else if (!isUpperPart && !this.classList.contains("item-dragover")) {
            resetDragoverStyle();
            this.classList.add("item-dragover");
        }
    });
    dom.addEventListener("dragleave", function (evt) {
        evt.preventDefault();
        if (this.style.order == "0" || this.style.order == String(this.parentElement.children.length - 1)) {
            resetDragoverStyle();
        }
    });
    dom.addEventListener("drop", (evt) => {
        evt.stopPropagation();
        resetDragoverStyle();
    });

    if (!focusable) {
        return;
    }
    dom.addEventListener("click", function (evt) {
        if (evt.shiftKey && this.parentElement.getElementsByClassName("item-focused").length == 1) {
            let anotherFocusedNum = this.parentElement.getElementsByClassName("item-focused")[0].getAttribute("data-songnum");
            for (let i = Math.min(Number(anotherFocusedNum), Number(this.getAttribute("data-songnum")));
                i <= Math.max(Number(anotherFocusedNum), Number(this.getAttribute("data-songnum")));
                i += 1) {
                dom.parentElement.querySelector(`.item[data-songnum="${i}"]`).classList.add("item-focused");
            }
            return;
        }
        if (this.parentElement.getElementsByClassName("item-focused").length == 1 && this.classList.contains("item-focused")) {
            this.classList.remove("item-focused");
            return;
        }
        let oldFocused = [];
        if (!evt.ctrlKey) {
            for (let dom of this.parentElement.getElementsByClassName("item-focused")) {
                oldFocused.push(dom);
            }
            oldFocused.forEach((dom) => {
                dom.classList.remove("item-focused");
            });
        }
        if (this.classList.contains("item-focused")) {
            this.classList.remove("item-focused");
            return;
        }
        this.classList.add("item-focused");
    });
};