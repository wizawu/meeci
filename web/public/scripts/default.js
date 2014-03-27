/**
 * Switch Tabs
 */
function activeTab(id) {
    var tabs = document.getElementById("tab-content").childNodes;
    var n = tabs.length;
    for (var i = 0; i < n; i++) {
        var t = tabs[i];
        if (t.nodeName.toLowerCase() == "div") {
            t.style.display = (t.id == id)? "block":"none";
        }
    }
}

function addClickTabEvent() {
    var list = document.getElementById("tab-titles").childNodes;
    var n = list.length;
    for (var i = 0; i < n; i++) {
        var li = list[i];
        if (li.nodeName.toLowerCase() == "li") {
            li.index = i;
            li.childNodes[1].onclick = function() {
                for (var j = 0; j < n; j++) {
                    if (list[j].nodeName.toLowerCase() == "li") {
                        list[j].className = "";
                    }
                }
                j = this.parentNode.index;
                list[j].className = "active";
                activeTab(list[j].getAttribute("tabid"));
                return false;
            };
        }
    }
}

/**
 * Hide all elements not in common
 */
function hideAll() {
    var ids = [
        "form-login", "profile",
        "li-repos", "li-container", "li-account", "li-signup"
    ];
    for (var i = 0; i < ids.length; i++) {
        document.getElementById(ids[i]).style.display = "none";
    }
}

function addEvents() {
    addClickTabEvent();
}

window.onload = function() {
    //hideAll(); 
    addEvents();
}
