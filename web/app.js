var crypto = require("crypto");
var fs = require("fs");
var http = require("http");
var https = require("https");
var util = require("util");

// External libraries
var express = require("express");
var memcache = require("memcache");
var pg = require("pg.js");

// Meeci data location
var meecidir = "/var/lib/meeci";

// PostgreSQL
var pgdb = "postgres://meeci:IoMQwf5E7u8@0.0.0.0/meeci";

// Memcache client
var mcclient = new memcache.Client(11211, 'localhost');
mcclient.on('connect', function() { console.log("Connect to Memcache"); });
mcclient.on('error', function(err) { console.error(err); });
mcclient.connect();

// Global task queue
var tasks = {queue: []};
// Legal workers
var WORKERS = ['127.0.0.1'];

// Create the express app
var app = express();
app.use(express.static("./public"));
app.use(express.logger({
    format: ':remote-addr - - [:date] ":method :url HTTP/:http-version" '+
            ':status :res[content-length] - :response-time ms'
}));
app.use(express.bodyParser());
app.use(express.cookieParser(crypto.randomBytes(64).toString('base64')));
app.use(express.session());
app.use(express.errorHandler());

app.get("/", function(req, res) {
    res.sendfile("home.html");
});

app.get("/logout", function(req, res) {
    req.session.user = null;
    res.send(200);
});

/* Join Now
 * 200: success
 * 400: incomplete information
 * 401: invalid username
 * 402: invalid email
 * 403: invalid password
 * 500: SQL INSERT error
 */
app.post("/signup", function(req, res) {
    var body   = req.body;
    var user   = body.user;
    var email  = body.email;
    var passwd = body.passwd;

    if (user && user.trim() && email && email.trim() && passwd) {
        user = user.trim();
        email = email.trim();
        // check length
        if (user.length > 32) {
            res.send(401);
        } else if (email.length > 128) {
            res.send(402);
        } else if (passwd.length > 128) {
            res.send(403);
        // check letter
        } else if (user[0] == '_') {
            res.send(401);
        } else if (user[0] >= '0' && user[0] <= '9') {
            res.send(401);
        } else if (! check_letter(user)) {
            res.send(401);
        } else if (! check_letter(email, "@.-")) {
            res.send(402);
        } else if (! check_letter(passwd)) {
            res.send(403);
        // check database
        } else {
            passwd = encrypt(passwd);
            var values = strformat(
                "'%s', '%s', '%s', '%s', 1",
                user, email, passwd.hash, passwd.salt
            );
            sql_insert(
                "users", "user_, email, passwd, salt, status", values,
                function(code) {
                    if (code == 200) {
                        var path = meecidir + '/containers/' + user;
                        fs.mkdir(path, function(err) { 
                            if (err) errlog(err);
                            fs.chmodSync(path, '777');
                        });
                    }
                    res.send(code);
                }
            );
        }
    } else {
        res.send(400);
    }
});

/* Log in or update profile with password
 * 200: success
 * 400: incomplete information
 * 401: invalid password
 * 402: invalid new password
 * 403: invalid name
 * 404: non-existent user
 * 500: SQL SELECT error
 */
app.post("/user", function(req, res) {
    var body = req.body;
    var user = body.user, passwd = body.passwd;
    if (user && user.trim() && check_letter(user) && passwd) {
        if (! check_letter(passwd)) {
            return res.send(401);
        }
        user = user.trim();
        sql_auth(user, passwd, function(code) {
            if (code == 200) {
                // log in
                req.session.user = user;
                // update name
                var name = body.name;
                if (name && name.trim()) {
                    name = name.trim();
                    if (! check_legal(name, "-';")) return res.send(403);
                    var q = strformat(
                        "UPDATE users SET name='%s' WHERE user_='%s'",
                        name, user
                    );
                    sql_execute(q);
                }
                // update new password
                var new_passwd = body.new_passwd;
                if (new_passwd) {
                    if (! check_letter(new_passwd)) return res.send(402);
                    passwd = encrypt(new_passwd);
                    q = strformat(
                        "UPDATE users SET passwd='%s', salt='%s' WHERE user_='%s'",
                        passwd.hash, passwd.salt, user
                    );
                    sql_execute(q);
                }
            }
            res.send(code);
        });
    } else {
        res.send(400);
    }
});

// Retrieve user profile if session.user is not null
app.get("/user", function(req, res) {
    if (req.session.user == null) {
        res.json({"user": null});
    } else {
        var user = req.session.user;
        pg.connect(pgdb, function(err, client, release) {
            if (err) return errlog(err);
            var q = strformat("SELECT * FROM users WHERE user_ = '%s'", user); 
            client.query(q, function(err, _res) {
                release();
                if (err) {
                    res.send(500);
                    return errlog(err);
                } else {
                    var row = _res.rows[0];
                    res.json(200, {
                        user: user,
                        name: row.name,
                        email: row.email,
                        gravatar: gravatar_url(row.email),
                        passwd: null
                    });
                }
            });
        });
    }
});

app.post("/watch", function(req, res) {
    var user = req.session.user;
    var giturl = req.body.giturl, watch = req.body.watch;
    if (user && giturl) {
        // resolve host, owner, repository name
        var host = resolve_git(giturl);
        if (host == -1) return res.send(406);
        var owner = repos_owner(giturl)[0];
        var repos = repos_owner(giturl)[1];
        if (!check_legal(owner, " ';") || !check_legal(repos, " ';")) {
            return res.send(403);
        }
        // watch or unwatch
        if (watch == false) {
            var q = strformat(
                "DELETE FROM repos WHERE user_='%s' AND repos='%s' AND owner='%s' AND host=%d",
                user, repos, owner, host
            );
            return sql_execute(q, function(_) {
                res.send(200);
            });
        }
        if (host == 1) {
            var path = strformat("/repos/%s/%s", owner, repos);
        } else {
            var path = strformat("/2.0/repositories/%s/%s", owner, repos);
            // other git repositories are not supported yet
            return res.send(501);
        }
        // fetch repository description from Git server
        https_get(host, path, function(j) {
            if (typeof(j) == "number") {
                res.send(j);
            } else {
                var desc = j.description;
                sql_insert(
                    "repos", "user_, host, owner, repos, descr",
                    strformat("'%s',%d,'%s','%s','%s'", user, host, owner, repos, desc),
                    function(code) { res.send(code); }
                );
            }
        });
    } else {
        res.send(400);
    }
});

app.get("/repos", function(req, res) {
    var user = req.session.user;
    if (user) {
        var q = strformat("SELECT * FROM repos WHERE user_ = '%s'", user);
        sql_execute(q, function(rows) {
            res.json(200, {watched: rows});
        });
    } else {
        res.send(400);
    }
});

app.get("/repos/options/:host/:owner/:repos", function(req, res) {
    var user = req.session.user;
    if (user) {
        var host = (req.params.host == "github") ? 1 : 2;
        var owner = req.params.owner;
        var repos = req.params.repos;
        if (!check_legal(owner, " ';") || !check_legal(repos, " ';")) {
            return res.send(403);
        }
        var q = strformat(
            "SELECT * FROM repos WHERE user_='%s' AND repos='%s' AND owner='%s' AND host=%d",
            user, repos, owner, host
        );
        sql_execute(q, function(rows) {
            res.json(200, {
                container: rows[0].container,
                script: rows[0].script
            });
        });
    } else {
        res.send(400);
    }
});

app.post("/repos/options/:host/:owner/:repos", function(req, res) {
    var user = req.session.user, body = req.body;
    var cont = body.container, script = body.script;
    if (script) script = script.replace(/'/g, "''");
    if (user && cont && cont.trim() && script) {
        cont = cont.trim();
        if (! check_letter(cont, ".-")) return res.send(401);
        var host = (req.params.host == "github") ? 1 : 2;
        var owner = req.params.owner;
        var repos = req.params.repos;
        if (!check_legal(owner, " ';") || !check_legal(repos, " ';")) {
            return res.send(403);
        }
        var q = strformat(
            "UPDATE repos SET container='%s', script='%s' " +
            "WHERE user_='%s' AND repos='%s' AND owner='%s' AND host=%d",
            cont, script, user, repos, owner, host
        );
        sql_execute(q, function(_) { res.send(200); });
    } else {
        res.send(400);
    }
});

app.get("/queue", function(req, res) {
    res.json(200, tasks);
});

app.get("/task", function(req, res) {
    // check worker IP
    if (! req.ip in WORKERS) {
        res.send(403);
    } else if (tasks.queue.length == 0) {
        res.send(204);
    } else {
        for (var i in tasks.queue) {
            var tqi = tasks.queue[i];
            if (tqi.worker == null) {
                tqi.worker = req.ip;
                tqi.start = Math.floor((new Date).getTime()/1000);
                tqi.strid = String(tqi.id);
                return res.json(200, tqi);
            }
        }
        res.send(204);
    }
});

app.get("/scripts/:user/:repos/:owner/:host", function(req, res) {
    var params = req.params, user = params.user;
    var repos = params.repos, owner = params.owner, host = params.host;
    user = user && user.trim();
    repos = repos && repos.trim();
    owner = owner && owner.trim();
    if (user && repos && owner && host) {
        if (!check_letter(user) || !check_legal(repos, " ';") || !check_legal(owner, " ';")) {
            return res.send(403);
        }
        var q = strformat(
            "SELECT script FROM repos WHERE user_ = '%s' AND " +
            "repos = '%s' AND owner = '%s' AND host = %d",
            user, repos, owner, host
        );
        sql_execute(q, function(rows) {
            res.send(200, rows[0].script);
        });
    } else {
        res.send(400);
    }
});

app.post("/container", function(req, res) {
    var user = req.session.user, body = req.body;
    var name = body.name, desc = body.desc, script = body.script;
    if (user && name && check_letter(name, "-.")) {
        sql_insert(
            "container", "user_,name,descr,size,time",
            strformat("'%s','%s','%s',0,now()", user, name, desc),
            function(code) {
                if (code == 200) {
                    var path = strformat(meecidir + "/containers/%s/%s.sh", user, name);
                    fs.writeFile(path, script, function(err) {
                        if (err) {
                            errlog(err);
                            res.send(500);
                        } else {
                            var q = strformat(
                                "SELECT id FROM container WHERE user_='%s' AND name='%s'",
                                user, name
                            );
                            sql_execute(q, function(rows) {
                                var id = rows[0].id;
                                tasks.queue.push({
                                    user: user,
                                    type: 'container',
                                    id: id,
                                    container: name
                                });
                                res.send(200);
                            });
                        }
                    });
                } else {
                    res.send(code);
                }
            }
        );
    } else {
        res.send(400);
    }
});

app.get("/containers", function(req, res) {
    var user = req.session.user;
    if (user) {
        var q = strformat("SELECT * FROM container WHERE user_ = '%s'", user);
        sql_execute(q, function(rows) {
            res.json(200, { list: rows });
        });
    } else {
        res.send(400);
    }
});

app.get("/container/:name", function(req, res) {
    var user = req.session.user, name = req.params.name;
    if (user && name) {
        var path = strformat(meecidir + "/containers/%s/%s.sh", user, name);
        fs.readFile(path, function(err, data) {
            if (err) {
                errlog(err);
                res.send(404);
            } else {
                res.set('Content-Type', 'text/plain');
                res.send(200, data);
            }
        });
    } else {
        res.send(400);
    }
});

app.get("/logs/:type/:id", function(req, res) {
    var type = req.params.type, id = req.params.id;
    var path = strformat(meecidir + "/logs/%s/%d.log", type, id);
    fs.readFile(path, function(err, data) {
        if (err) {
            errlog(err);
            res.send(404);
        } else {
            res.set('Content-Type', 'text/plain');
            res.send(200, data);
        }
    });
});

app.post("/finish/:type/:id", function(req, res) {
    var type = req.params.type, id = req.params.id;
    if (! remove_task(type, id)) {
        errlog("tasks.queue did not have " + type + " " + id);
    }
    var k = type[0] + '#' + id;
    mcclient.delete(k, function(err, res) {
        if (err) errlog(err);
    });
    var k = type[0] + ':' + id;
    mcclient.get(k, function(err, _res) {
        if (err) return errlog(err);
        var j = JSON.parse(_res);
        if (type == 'build') {
            sql_execute(strformat(
                "UPDATE build SET " +
                "worker='%s', start=to_timestamp(%d), duration=%d, return=%d" +
                "WHERE id = %d",
                req.ip, j.start, (j.stop - j.start), j.exit, id
            ));
        } else if (type == 'container') {
            if (j.exit == 0) {
                var path = strformat(
                    meecidir + "/containers/%s/%s.bz2", j.user, j.container
                );
                fs.chmod(path, '744', function(err) { errlog(err); });
                fs.stat(path, function(err, stats) {
                    errlog(err);
                    var s = Math.floor(stats.size/1024/1024) + 1;
                    var q = strformat("UPDATE container SET size=%d WHERE id=%d", s, id);
                    sql_execute(q);
                });
            } else {
                var q = strformat("UPDATE container SET size=%d WHERE id=%d", -1, id);
                sql_execute(q);
            }
        }
        res.send(200);
        mcclient.delete(k);
    });
});

app.post("/destroy/:name", function(req, res) {
    var user = req.session.user, name = req.params.name;
    if (user && name) {
        var q = strformat(
            "DELETE FROM container WHERE user_ = '%s' AND name = '%s'", 
            user, name
        );
        sql_execute(q, function(_) { res.send(200); });
        fs.unlink(meecidir + strformat("/containers/%s/%s.bz2", user, name), function(err) {
            if (err) errlog(err);
        });
        fs.unlink(meecidir + strformat("/containers/%s/%s.sh", user, name), function(err) {
            if (err) errlog(err);
        });
    } else {
        res.send(400);
    }
});

app.get("/history/:host/:owner/:repos", function(req, res) {
    var host = req.params.host, owner = req.params.owner, repos = req.params.repos;
    if (host && owner && repos) {
        var q = strformat(
            "SELECT * FROM build WHERE repos='%s' AND owner='%s' AND host=%d",
            repos, owner, (host == 'github' ? 1 : 2)
        );
        sql_execute(q, function(rows) {
            res.json(200, {list: rows});
        });
    } else {
        res.send(400);
    }
});

app.post("/hooks/:user", function(req, res) {
    var user = req.params.user, body = req.body;
    if (user && body && body.ref && body.commits && body.repository) {
        var host = 1;
        var owner = body.repository.owner.name;
        var repos = body.repository.name;
        var desc = body.repository.description;
        var url = strformat("git@github.com:%s/%s.git", owner, repos);
        var branch = body.ref.substr(11);
        var cond = strformat(
            "user_ = '%s' AND repos = '%s' AND owner = '%s' AND host = %d",
            user, repos, owner, host
        );
        sql_exist('repos', cond, function(rows) {
            var cond = strformat(
                "repos = '%s' AND owner = '%s' AND host = %d",
                repos, owner, host
            );
            var container = rows[0].container;
            var q = "SELECT max(build) max_build FROM build WHERE " + cond;
            sql_execute(q, function(rows) {
                var b = Number(rows[0].max_build) + 1;
                for (var i in body.commits) {
                    var build = b + Number(i);
                    var cmt = body.commits[i];
                    var commit = cmt.id;
                    var committer = cmt.committer.username;
                    var msg = cmt.message;
                    var id = (new Date).getTime()*1000000 + Number('0x'+commit.substr(0,5));
                    sql_insert(
                        'build', 
                        "id, host, owner, repos, build, container," +
                        "branch, commit, committer, message",
                        strformat(
                            "%d,%d,'%s','%s',%d,'%s','%s','%s','%s','%s'",
                            id, host, owner, repos, build, container,
                            branch, commit, committer, msg
                        )
                    );
                    tasks.queue.push({
                        user: user,
                        type: 'build',
                        id: id,
                        url: url,
                        host: 1,
                        owner: owner,
                        repository: repos,
                        desc: desc,
                        branch: branch,
                        commit: commit,
                        committer: committer,
                        message: msg,
                        container: container,
                        build: build
                    });
                }
            });
            res.send(200);
        });
    } else {
        res.send(400);
    }
});

app.get("/console/:id", function(req, res) {
    var id = req.params.id;
    if (id) {
        mcclient.get('b#' + id, function(err, val) {
            if (err) return errlog(err);
            if (val == null) return res.json(200, {console: ""});
            val = val.replace(/&/g, '&amp;')
                     .replace(/"/g, '&quot;')
                     .replace(/'/g, '&#39;')
                     .replace(/</g, '&lt;')
                     .replace(/>/g, '&gt;')
                     .replace(/\r\n/g, '<br/>')
                     .replace(/\n/g, '<br/>');
            res.json(200, {console: val});
        });
    } else {
        res.send(400);
    }
});

// Start http server
var port = process.env.MEECI_PORT || 3780;
http.createServer(app).listen(port, function() {
    console.log("Meeci Web is listening on port " + port);
});


/***************************************
           Internal Functions
 ***************************************/

var strformat = util.format;
var errlog = console.error;

function remove_task(type, id) {
    for (var i in tasks.queue) {
        if (tasks.queue[i].type == type && tasks.queue[i].id == id) {
            tasks.queue.splice(i, 1);
            return true;
        }
    }
    return false;
}

function check_letter(str, extra) {
    for (var i in str) {
        var c = str[i];
        if (c >= 'a' && c <= 'z') continue;
        else if (c >= 'A' && c <= 'Z') continue;
        else if (c >= '0' && c <= '9') continue;
        else if (c == '_') continue;
        else if (extra && extra.search(c) >= 0) continue;
        else return false;
    }
    return true;
}

function check_legal(str, ill) {
    for (var i in ill) {
        var c = ill[i];
        if (str.search(c) >= 0) return false;
    }
    return true;
}

function encrypt(passwd) {
    var salt = crypto.randomBytes(32).toString("base64");
    var hash = crypto.createHash("sha256").update(salt+passwd).digest("base64");
    return { hash: hash, salt: salt };
}

function password_match(passwd, hash, salt) {
    return hash == crypto.createHash("sha256").update(salt+passwd).digest("base64");
}

function gravatar_url(email) {
    var hex = crypto.createHash("md5").update(email).digest("hex");
    return strformat("http://www.gravatar.com/avatar/%s.png?s=48", hex);
}

// Return 1 for GitHub, 2 for Bitbucket, -1 otherwise
function resolve_git(url) {
    var github = /git@github.com:\w+\/\S+\.git/gi;
    var bitbucket = /git@bitbucket.org:\w+\/\S+\.git/gi;
    if (github.test(url)) return 1;
    else if (bitbucket.test(url)) return 2;
    else return -1;
}

// Resolve repository name and owner
function repos_owner(url) {
    var n = url.length;
    if (url.search("git@github.com") == 0) {
        return url.substring(15, n - 4).split('/', 2);
    } else {
        return url.substring(18, n - 4).split('/', 2);
    }
}

// Send a HTTPS GET request to Git server
function https_get(host, path, callback) {
    var host = (host == 1) ? "api.github.com" : "api.bitbucket.org";
    https.get({
        host: host,
        path: path,
        headers: {'user-agent':
            'Mozilla/5.0 (X11; Linux x86_64; rv:27.0) Gecko/20100101 Firefox/27.0'
        }
    }, function(res) {
        if (res.statusCode == 200) {
            var body = [];
            res.on('data', function(chunk) {
                body.push(chunk);
            });
            res.on('end', function(chunk) {
                body = body.join('');
                callback(JSON.parse(body));
            });
        } else {
            errlog("GET https://" + host + path + " " + res.statusCode);
            callback(res.statusCode);
        }
    });
}

function sql_exist(table, cond, callback) {
    var q = strformat("SELECT * FROM %s WHERE %s;", table, cond);
    pg.connect(pgdb, function(err, client, release) {
        if (err) return errlog(err);
        client.query(q, function(err, res) {
            release();
            if (err) {
                return errlog(err);
            } else if (res.rows.length > 0) {
                callback(res.rows);
            }
        });
    });
}

function sql_insert(table, fields, values, callback) {
    var q = strformat("INSERT INTO %s(%s) VALUES(%s)", table, fields, values);
    pg.connect(pgdb, function(err, client, release) {
        if (err) return errlog(err);
        client.query(q, function(err, res) {
            release();
            if (err) {
                var code = 500;
                // 401, 402 are used by post("/signup")
                if (err.toString().search('constraint "users_user_idx"') >= 0) {
                    code = 401;
                }
                if (err.toString().search('constraint "users_email_idx"') >= 0) {
                    code = 402;
                }
                if (callback) callback(code);
                return errlog(err);
            } else {
                if (callback) callback(200);
            }
        });
    });
}

function sql_auth(user, passwd, callback) {
    var q = strformat("SELECT * FROM users WHERE user_='%s' AND status=1", user);
    pg.connect(pgdb, function(err, client, release) {
        if (err) return errlog(err);
        client.query(q, function(err, res) {
            release();
            if (err) {
                callback(500);
                return errlog(err);
            } else {
                if (res.rows.length == 0) {
                    callback(404);
                } else {
                    var hash = res.rows[0].passwd;
                    var salt = res.rows[0].salt;
                    callback(password_match(passwd, hash, salt) ? 200:401);
                }
            }
        });
    });
}

function sql_execute(query, callback) {
    pg.connect(pgdb, function(err, client, release) {
        if (err) return errlog(err);
        client.query(query, function(err, res) {
            release();
            if (err) return errlog(err);
            if (callback) callback(res.rows);
        });
    });
}
