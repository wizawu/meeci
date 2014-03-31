/* Backbone models */
SignUp = Backbone.Model.extend({url: "/signup"});
Logout = Backbone.Model.extend({url: "/logout"});
Repos = Backbone.Model.extend({
    defaults: {
        towatch: null,
        watched: []
    },
    url: "repos"
});
var repos = new Repos();

User = Backbone.Model.extend({
    defaults: {
        "user" : null,
        "name" : null,
        "email": null
    },
    url: "/user"
});
var user = new User();

/* Return the first child with the specified tag name */
function getChildByTagName(node, tag) {
    var children = node.childNodes;
    var n = children.length;
    for (var i = 0; i < n; i++) {
        if (children[i].nodeName.toLowerCase() == tag) {
            return children[i];
        }
    }
}

function displayElementById(id, attr) {
    if (!attr) attr = "block";
    document.getElementById(id).style.display = attr;
}

/* Change the tab content */
function activeTab(id) {
    var list = document.getElementById("tab-titles").childNodes;
    var n = list.length;
    for (var i = 0; i < n; i++) {
        if (list[i].nodeName.toLowerCase() == "li") {
            if (list[i].getAttribute("tabid") == id) {
                list[i].className = "active";
            } else {
                list[i].className = "";
            }
        }
    }

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
            getChildByTagName(li, "a").onclick = function() {
                activeTab(this.parentNode.getAttribute("tabid"));
                return false;
            };
        }
    }
}

function displayUserTabs(attr) {
    displayElementById("li-repos", attr);
    displayElementById("li-container", attr);
    displayElementById("li-account", attr);
    displayElementById("li-signup", "none");
}

/* Display divs according to whether user has logged in */
function displayByUser() {
    user.fetch({
        success: function(model, response, options) {
            if (model.get("user")) {
                displayElementById("form-login", "none");
                displayElementById("profile", "block");
                var e = document.getElementById("gravatar");
                e.src = model.get("gravatar");
                e = document.getElementById("current-user");
                e.innerHTML = model.get("user");
                displayUserTabs("block");
            } else {
                displayElementById("form-login", "block");
                displayElementById("profile", "none");
                displayUserTabs("none");
            }
        }
    });
}

/* Switch to Join-Now tab */
function addJoinEvent() {
    var b = document.getElementById("join-now");
    b.onclick = function() {
        displayElementById("li-signup");
        activeTab("tab-signup");
    };
}

/* Submit sign-up information */
function addSignUpEvent() {
    var f = getChildByTagName(document.getElementById("tab-signup"), "form");
    var b = getChildByTagName(f, "button");
    b.onclick = function() {
        var inputs = ["sign-user", "sign-email", "sign-pswd1", "sign-pswd2"];
        for (var i in inputs) {
            inputs[i] = document.getElementById(inputs[i]);
        }
        if (inputs[2].value != inputs[3].value) {
            alert("The two passwords are not consistent.");
            inputs[2].value = inputs[3].value = "";
            return false;
        }
        var signup = new SignUp({
            user   : inputs[0].value.trim(),
            email  : inputs[1].value.trim(),
            passwd : inputs[2].value.trim()
        });
        signup.save(signup.attributes, {
            error: function(model, response, options) {
                switch (response.status) {
                    case 200:
                        alert("You have signed up successfully!");
                        for (var i in inputs) inputs[i].value = "";
                        break;
                    case 400:
                        alert("Incomplete sign-up form.");
                        break;
                    case 401:
                        alert("Please use another username.");
                        inputs[0].value = "";
                        break;
                    case 402:
                        alert("Please use another email.");
                        inputs[1].value = "";
                        break;
                    case 403:
                        alert("Invalid password.");
                        inputs[2].value = inputs[3].value = "";
                        break;
                    default:
                        alert(response.status + " " + response.statusText);
                }
            }
        });
    }
}

/* Log in */
function addLoginEvent() {
    var b = document.getElementById("log-in");
    b.onclick = function() {
        var u = document.getElementById("login-user").value;
        var p = document.getElementById("login-pswd").value;
        user.set({user: u, passwd: p});
        user.save(user.attributes, { 
            error: function(model, response, options) {
                switch (response.status) {
                    case 200:
                        displayByUser();
                        activeTab("tab-console");
                        break;
                    default:
                        alert("Authentication failed.");
                }
            }
        });
    }
}

/* Log out */
function addLogoutEvent() {
    var b = document.getElementById("log-out");
    b.onclick = function() {
        var logout = new Logout();
        logout.fetch();
        displayByUser();
        activeTab("tab-console");
    }
}

/* Display name and email */
function addAccountTabEvent() {
    var b = document.getElementById("li-account");
    b.onclick = function() {
        document.getElementById("acnt-name").value = user.get("name") || "";
        document.getElementById("acnt-email").value = user.get("email") || "";
    }
}

function addUpdateAccountEvent() {
    document.getElementById("acnt-email").setAttribute("readonly", "readonly");
    var b = document.getElementById("acnt-update");
    b.onclick = function() {
        var inputs = ["acnt-name", "acnt-pswd0", "acnt-pswd1", "acnt-pswd2"];
        for (var i in inputs) {
            inputs[i] = document.getElementById(inputs[i]);
        }
        if (inputs[1].value.trim() == "") {
            alert("Current Password cannot be empty.");
            return false;
        } else if (inputs[2].value != inputs[3].value) {
            alert("The two new passwords are not consistent.");
            inputs[2].value = inputs[3].value = "";
            return false;
        } else {
            user.set({
                name: inputs[0].value.trim(),
                passwd: inputs[1].value.trim(),
                new_passwd: inputs[2].value.trim()
            });
            user.save(user.attributes, {
                error: function(model, response, options) {
                    switch (response.status) {
                        case 200:
                            alert("Update successfully!");
                            inputs[1].value = "";
                            inputs[2].value = inputs[3].value = "";
                            break;
                        case 401:
                            alert("The current password is incorrect.");
                            inputs[1].value = "";
                            break;
                        case 402:
                            alert("Invalid new password.");
                            inputs[2].value = inputs[3].value = "";
                            break;
                        default:
                            alert(response.status + " " + response.statusText);
                    }
                }
            });
        }
    }
}

function loadReposList() {
    repos.fetch({
        success: function(model, response, options) {
        }),
        error: function(model, response, options) {
        })
    });
}

function addWatchReposEvent() {
    var b = document.getElementById("watch-butt");
    b.onclick = function() {
        var i = document.getElementById("watch-url");
        if (i.value.trim() == "") return false;
        if (i.value.search("git@") != 0) {
            alert("The URL must begin with 'git@'.");
            return false;
        }
        repos.set({towatch: i.value.trim()});
        repos.save(repos.attributes, {
            error: function(modle, response, options) {
                switch (response.status) {
                    case 200:
                        i.value = "";
                        break;
                    default:
                        alert("Cannot watch this repository.");
                }
            }
        });
    }
}

/* Gather all add-event functions */
function addEvents() {
    addClickTabEvent();
    addJoinEvent();
    addSignUpEvent();
    addLoginEvent();
    addLogoutEvent();
    addAccountTabEvent();
    addUpdateAccountEvent();
    addWatchReposEvent();
}

function scrollTop() {
    window.scrollTo(0, 0);
}

window.onload = function() {
    addEvents();
    displayByUser();
}
