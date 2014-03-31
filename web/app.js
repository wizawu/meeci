var crypto = require("crypto");
var util = require("util");
var express = require("express");
var pg = require("pg.js");

var strformat = util.format;

var app = express();
var pgdb = "postgres://meeci:IoMQwf5E7u8@0.0.0.0/meeci";

app.use(express.static("./public"));
app.use(express.logger({
    format: ':remote-addr - - [:date] ":method :url HTTP/:http-version" '+
            ':status :res[content-length] - :response-time ms'
}));
app.use(express.errorHandler());
app.use(express.bodyParser());
app.use(express.cookieParser(crypto.randomBytes(64).toString('base64')));
app.use(express.session());

app.get("/", function(req, res) {
    res.sendfile("home.html");
});

app.get("/logout", function(req, res) {
    req.session.user = null;
    res.send(200);
});

app.post("/signup", function(req, res) {
    var body = req.body;
    var user = body.user, email = body.email, passwd = body.passwd;
    if (user && email && passwd) {
        if (user[0] >= '0' && user[0] <= '9') {
            res.send(401);
        } else if (! checkLetter(user)) {
            res.send(401);
        } else if (! checkLetter(email, "@-.")) {
            res.send(402);
        } else if (! checkLetter(passwd)) {
            res.send(403);
        } else {
            var cond = strformat("user_ = '%s'", user);
            sql_exist("users", cond, function() {
                res.send(401);
            });
            var cond = strformat("email = '%s'", email);
            sql_exist("users", cond, function() {
                res.send(402);
            });
            passwd = encrypt(passwd);
            var values = strformat(
                "'%s', '%s', '%s', '%s', 1",
                user, email, passwd.hash, passwd.salt
            );
            sql_insert(
                "users", "user_, email, passwd, salt, status",
                values, function(code) { res.send(code); }
            );
        }
    } else {
        res.send(400);
    }
});

app.post("/user", function(req, res) {
    var body = req.body;
    var user = body.user, passwd = body.passwd;
    if (user && passwd) {
        sql_auth(user, passwd, function(code) {
            if (code == 200) {
                req.session.user = user;
                var name = body.name, new_passwd = body.new_passwd, q;
                if (name) {
                    q = strformat(
                        "UPDATE users SET name='%s' WHERE user_='%s'",
                        name, user
                    );
                    sql_execute(q);
                }
                if (new_passwd) {
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
                        gravatar: gravatarURL(row.email),
                        passwd: null
                    });
                }
            });
        });
    }
});

app.post("/repos", function(req, res) {
});

var http = require("http");
var port = process.env.MEECI_PORT || 3780;

http.createServer(app).listen(port, function() {
    console.log("Meeci Web is listening on port " + port);
});

/* Internal Functions */
function errlog(err) {
    return console.error(err);
}

function checkLetter(str, extra) {
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

function encrypt(passwd) {
    var salt = crypto.randomBytes(32).toString("base64");
    var hash = crypto.createHash("sha256").update(salt+passwd).digest("base64");
    return { hash: hash, salt: salt };
}

function passwordMatch(passwd, hash, salt) {
    return hash == crypto.createHash("sha256").update(salt+passwd).digest("base64");
}

function gravatarURL(email) {
    var hex = crypto.createHash("md5").update(email).digest("hex");
    return strformat("http://www.gravatar.com/avatar/%s.png?s=48", hex);
}

function sql_exist(table, cond, callback) {
    var q = strformat("SELECT 1 FROM %s WHERE %s;", table, cond);
    pg.connect(pgdb, function(err, client, release) {
        if (err) return errlog(err);
        client.query(q, function(err, res) {
            release();
            if (err) {
                return errlog(err);
            } else if (res.rows.length > 0) {
                callback();
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
                callback(500);
                return errlog(err);
            } else {
                callback(200);
            }
        });
    });
}

function sql_auth(user, passwd, callback) {
    var q = strformat("SELECT * FROM users WHERE user_ = '%s'", user);
    pg.connect(pgdb, function(err, client, release) {
        if (err) return errlog(err);
        client.query(q, function(err, res) {
            release();
            if (err) {
                callback(500);
                return errlog(err);
            } else {
                if (res.rows.length == 0) {
                    callback(401);
                } else {
                    var hash = res.rows[0].passwd;
                    var salt = res.rows[0].salt;
                    callback(passwordMatch(passwd, hash, salt) ? 200:401);
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
            if (callback) callback();
        });
    });
}
