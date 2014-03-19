function activeTab(id) {
    var tabs = document.getElementById("tab-content").childNodes;
    var n = tabs.length;
    for (var i = 0; i < n; i++) {
        if (tabs[i].nodeName.toLowerCase() != "div") {
            continue;
        }
        if (tabs[i].id == id) {
            tabs[i].style.display = "block";
        } else {
            tabs[i].style.display = "none";
        }
    }
}

function addTabClickEvent() {
    var list = document.getElementsByClassName("nav nav-tabs")[0].childNodes;
    var n = list.length;
    for (var i = 0; i < n; i++) {
        if (list[i].nodeName.toLowerCase() != "li") {
            continue;
        }
        list[i].index = i;
        list[i].childNodes[1].onclick = function() {
            for (var j = 0; j < n; j++) {
                if (list[j].nodeName.toLowerCase() == "li") {
                    list[j].className = "";
                }
            }
            var k = this.parentNode.index;
            list[k].className = "active";
            activeTab(list[k].getAttribute("tabid"));
            return false;
        };
    }
}

function addEvents() {
    addTabClickEvent();
}

window.onload = function() {
    addEvents();
}
