/* Backbone models */
SignUp = Backbone.Model.extend({url: "/signup"});
Logout = Backbone.Model.extend({url: "/logout"});
Queue = Backbone.Model.extend({url: "/queue"});
Watch = Backbone.Model.extend({url: "/watch"});
Repos = Backbone.Model.extend({
    defaults: {watched: []},
    url: "/repos"
});
User = Backbone.Model.extend({
    defaults: {
        user : null,
        name : null,
        email: null
    },
    url: "/user"
});

var queue = new Queue();
var repos = new Repos();
var user = new User();
var build_id = null;

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

function getChildByClass(node, classname) {
    var children = node.childNodes;
    var n = children.length;
    for (var i = 0; i < n; i++) {
        var name = children[i].className;
        if (name && name.toLowerCase() == classname) {
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
                refreshReposList();
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
        return false;
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
        return false;
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
        return false;
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
        return false;
    }
}

/* Display name and email */
function addAccountTabEvent() {
    var b = document.getElementById("li-account");
    b.onclick = function() {
        document.getElementById("acnt-name").value = user.get("name") || "";
        document.getElementById("acnt-email").value = user.get("email") || "";
        return false;
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
                        case 403:
                            alert("The name contains illegal characters.");
                            inputs[0].value = "";
                            break;
                        default:
                            alert(response.status + " " + response.statusText);
                    }
                }
            });
        }
        return false;
    }
}

function refreshReposList() {
    repos.fetch({
        success: function(model, response, options) {
            var tmpl = document.getElementById("repos-tmpl");
            var list = document.getElementById("repos-list");
            list.innerHTML = "";
            var watched = repos.get("watched");
            for (var i in watched) {
                var w = watched[i];
                var fullname = w.owner + "/" + w.repos;
                var n = tmpl.cloneNode(true);
                var img = getChildByTagName(n, 'img');
                var a = getChildByTagName(n, 'a');
                a.innerHTML = fullname;
                if (w.host == 1) {
                    img.src = '/images/GitHub-Mark-32px.png';
                    a.href = 'https://github.com/' + fullname;
                    n.setAttribute("giturl", "git@github.com:" + fullname + ".git");
                    n.setAttribute("dir", "/github/" + fullname);
                } else {
                    img.src = '/images/Bitbucket-Mark-32px.png';
                    a.href = 'https://bitbucket.org/' + fullname;
                    n.setAttribute("giturl", "git@bitbucket.org:" + fullname + ".git");
                    n.setAttribute("dir", "/bitbucket/" + fullname);
                }
                getChildByTagName(n, 'p').innerHTML = w.descr;
                getChildByClass(n, 'btn btn-danger').onclick = function() {
                    var watch = new Watch();
                    watch.set({
                        giturl: this.parentNode.getAttribute("giturl"),
                        watch: false
                    });
                    watch.save(watch.attributes, {
                        error: function(model, response, options) {
                            refreshReposList();
                        }
                    });
                    return false;
                };
                getChildByClass(n, 'btn btn-success').onclick = function() {
                    var Options = Backbone.Model.extend({
                        url: "/repos/options" + this.parentNode.getAttribute('dir')
                    });
                    var opt = new Options();
                    opt.fetch({
                        success: function(model, response, options) {
                            displayElementById("repos-options");
                            var c = document.getElementById("repos-opt-cont");
                            c.value = model.get("container");
                            var s = document.getElementById("repos-opt-script");
                            s.value = model.get("script");
                            var b = document.getElementById("repos-update-butt");
                            b.setAttribute("url", opt.url);
                        }
                    });
                    return false;
                };
                n.style.display = "block";
                list.appendChild(n);
            }

            var gs = document.getElementsByClassName('repos-click');
            for (var i in gs) {
                var g = gs[i];
                g.onclick = function() {
                    if (this.parentNode.getAttribute('dir') == null) {
                        return false;
                    }
                    var args = this.parentNode.getAttribute('dir').split('/');
                    refreshHistory(args[1], args[2], args[3]);
                    activeTab('tab-history');
                    document.getElementById('repos-name').innerHTML = args[3];
                    document.getElementById('repos-desc').innerHTML = 
                        getChildByTagName(this.parentNode, 'p').innerHTML;
                    return false;
                }
            }
        },
        error: function(model, response, options) {
            alert("Failed to read the repository list.");
        }
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
        var watch = new Watch();
        watch.set({giturl: i.value.trim(), watch: true});
        watch.save(watch.attributes, {
            error: function(modle, response, options) {
                switch (response.status) {
                    case 200:
                        i.value = "";
                        refreshReposList();
                        break;
                    default:
                        alert("Cannot watch this repository.");
                }
            }
        });
        return false;
    }
}

function addUpdateReposEvent() {
    var b = document.getElementById("repos-update-butt");
    b.onclick = function() {
        window.scrollTo(0, 0);
        var Options = Backbone.Model.extend({
            url: b.getAttribute("url")
        });
        var opt = new Options();
        opt.set({
            container: document.getElementById("repos-opt-cont").value.trim(),
            script: document.getElementById("repos-opt-script").value
        });
        opt.save(opt.attributes, {
            error: function(model, response, options) {
                switch(response.status) {
                    case 200:
                        alert("Update successfully!");
                        displayElementById("repos-options", "none");
                        break;
                    case 400:
                        alert("Empty container name or script.");
                        break;
                    case 401:
                        alert("Invalid container name.");
                        break;
                    default:
                        alert(response.status + " " + response.statusText);
                }
            }
        });
        return false;
    };
}

function refreshTaskQueue() {
    queue.fetch({
        success: function(model, response, options) {
            var d = document.getElementById("queue");
            var t = document.getElementById("task-tmpl");
            d.innerHTML = "";
            for (var i in model.get("queue")) {
                var j = model.get("queue")[i];
                if (j.type == "container") continue;
                var n = t.cloneNode(true); 
                n.id = 'build' + j.id;
                var href = j.owner + '/' + j.repository;
                if (j.url.search("git@github") == 0) {
                    n.className = "github-task";
                    href = 'https://github.com/' + href;
                } else {
                    n.className = "bitbucket-task";
                    href = 'https://bitbucket.org/' + href;
                }
                if (j.start) {
                    var m = Math.floor((new Date).getTime()/1000) - j.start;
                    if (m <= 0) m = 1;
                } else {
                    var m = 0;
                }
                var s = m % 60;
                if (s < 10) s = "0" + String(s);
                m = (m - s) / 60;
                var worker = j.worker || 'pending';
                n.innerHTML = '<span class="task-left"><a href="' + href
                    + '">' + j.owner + '/' + j.repository
                    + '</a><br>' + worker + '</span>'
                    + '<span class="task-right">' + j.build + '<br>'
                    + '<span class="task-time">' + m + ':' + s 
                    + '</span></span><br><br>';
                n.style.display = "block";
                n.setAttribute('worker', worker);
                n.onclick = function() {
                    activeTab('tab-console');
                    updateTabConsole(n.id.substr(5), this.getAttribute('worker'));
                    return false;
                };
                d.appendChild(n);
            }
        }
    });
}

function updateTabConsole(id, worker) {
    build_id = id;
    for (var i in queue.get("queue")) {
        var t = queue.get("queue")[i];
        if (t.id == build_id) {
            document.getElementById('repos-name').innerHTML = t.repository;
            document.getElementById('repos-desc').innerHTML = t.desc;
            document.getElementById('build-value').innerHTML = t.build;
            document.getElementById('container-value').innerHTML = t.container;
            var cmturl = 'https://github.com/' + t.owner + '/' + t.repository
                + '/commit/' + t.commit;
            document.getElementById('commit-value').innerHTML =
                '<a href="' + cmturl + '">' + t.commit.substr(0,7) + 
                '(' + t.branch + ')</a>';
            document.getElementById('worker-value').innerHTML = worker;
            var cmtrurl = 'https://github.com/' + t.committer;
            document.getElementById('committer-value').innerHTML =
                '<a href="' + cmtrurl + '">' + t.committer + '</a>';
            break;
        }
    }
}

function refreshTaskTime() {
    var ts = document.getElementsByClassName('task-time');
    for (var i in ts) {
        var t = ts[i];
        if (t.innerHTML.trim() == '0:00') continue;
        var m = Number(t.innerHTML.split(':')[0]);
        var s = Number(t.innerHTML.split(':')[1]) + 1;
        if (s == 60) {
            t.innerHTML = m + 1 + ':00';
        } else if (s < 10) {
            t.innerHTML = m + ':0' + s;
        } else {
            t.innerHTML = m + ':' + s; 
        }
        if (t.parentNode.parentNode.id == 'build' + build_id) {
            document.getElementById('elapsed-value').innerHTML = t.innerHTML;
            document.getElementById('worker-value').innerHTML =
                t.parentNode.parentNode.getAttribute('worker');
        }
    }
}

function refreshContList() {
    var ContList = Backbone.Model.extend({
        url: "/containers"
    });
    var contlist= new ContList();
    contlist.fetch({
        success: function(model, response, options) {
            if (model.get('list').length == 0) {
                displayElementById("cont-table", "none");
                return;
            } else {
                displayElementById("cont-table", "block");
            }
            var t = document.getElementById('cont-list');
            t.innerHTML = "";
            for (var i in model.get('list')) {
                var r = model.get('list')[i];
                var s = "<tr>";
                s += '<td><a href="/container/' + r.name + '">' + r.name + '</a></td>';
                s += '<td>' + r.descr + '</td>';
                s += '<td>' + (r.size < 0 ? '-' : (r.size + ' MB')) + '</td>';
                s += '<td>' + r.time.substr(0,10) + " " + r.time.substr(11,8) + '</td>';
                var a = '<td><a href="' + '/logs/container/' + r.id + '">';
                if (r.size == 0) {
                    s += '<td>Building</td>';
                } else if (r.size > 0) {
                    s += a + 'Normal</a></td>';
                } else {
                    s += a + 'Error</a></td>';
                }
                s += '<td><button type="button" class="btn btn-danger" '
                     + 'id="/destroy/' + r.name + '">Remove</button></td>';
                s += "</tr>";
                t.innerHTML += s;
            }
            // add remove-container event to buttons
            for (var i in model.get('list')) {
                var r = model.get('list')[i];
                var b = document.getElementById('/destroy/' + r.name);
                b.onclick = function() {
                    var destroy = new Backbone.Model;
                    destroy.url = this.id;
                    destroy.save(this.attributes, {
                        error: function(model, repsonse, options) {
                            refreshContList();
                        }
                    });
                    return false;
                };
            }
        }
    });
}

function addContTabEvent() {
    var b = document.getElementById('li-container');
    b.onclick = function() {
        refreshContList();
        return false;
    };
}

function addCreateContEvent() {
    var b = document.getElementById('create-cont');
    b.onclick = function() {
        var n = document.getElementById('container-name');
        var d = document.getElementById('container-desc');
        var s = document.getElementById('container-script');
        if (n.value.trim() == "") {
            alert("Please specify the name of your container.");
            return false;
        }
        var Container = Backbone.Model.extend({url: '/container'});
        var cont = new Container();
        cont.set({
            name: n.value.trim(),
            desc: d.value,
            script: s.value
        });
        cont.save(cont.attributes, {
            error: function(model, response, options) {
                n.value = d.value = s.value = "";
                refreshContList();
            }
        });
        return false;
    };
}

function addCurrentUserEvent() {
    var e = document.getElementById("current-user");
    e.onclick = function() {
        activeTab('tab-account');
        document.getElementById("acnt-name").value = user.get("name") || "";
        document.getElementById("acnt-email").value = user.get("email") || "";
        return false;
    };
}

function refreshHistory(host, owner, repos) {
    var history = new Backbone.Model;
    history.url = '/history/' + host + '/' + owner + '/' + repos;
    history.fetch({
        success: function(model, response, options) {
            var t = document.getElementById('build-list');
            t.innerHTML = "";
            for (var i in model.get('list')) {
                var r = model.get('list')[i];
                if (! r.worker) continue;
                if (r.host == 1) {
                    var site = "https://github.com/" + r.owner;
                } else {
                    var site = "https://bitbucket.org/" + r.owner;
                }
                var s = '<tr>';
                s += '<td><a href="/logs/build/' + r.id + '">' + r.build + '</a></td>';
                s += '<td>' + r.message + '</td>';
                s += '<td><a href="' + site + '/' + r.repos + '/commit/' + r.commit
                     + '">' + r.commit.substr(0,7) + '(' + r.branch + ')</a></td>';
                s += '<td><a href="' + site + '">' + r.committer + '</a></td>';
                s += '<td>' + r.start.substr(0,10) + " " + r.start.substr(11,8)+ '</td>';
                var sec = r.duration % 60; 
                var min = (r.duration - sec) / 60;
                if (sec < 10) sec = '0' + String(sec);
                s += '<td>' + min + ':' + sec + '</td>';
                s += '</tr>';
                t.innerHTML += s;
            }
        }
    });
}

function refreshConsole() {
    if (build_id) {
        var c = new Backbone.Model;
        c.url = '/console/' + build_id;
        c.fetch({
            success: function(model, response, options) {
                if (model.get("console").length == 0) return;
                var e = document.getElementById("console");
                e.innerHTML = model.get("console");
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
    addUpdateReposEvent();
    addContTabEvent();
    addCreateContEvent();
    addCurrentUserEvent();
}

window.onload = function() {
    addEvents();
    displayByUser();
    refreshTaskQueue();
    window.setInterval(function(){ refreshConsole() }, 5000);
    window.setInterval(function(){ refreshTaskQueue(); }, 5000);
    window.setInterval(function(){ refreshTaskTime(); }, 1000);
}
