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

app.get("/user", function(req, res) {
    if (req.session.user == null) {
        res.json({"user": null});
    } else {
        res.json({"user": "wiza"})
    }
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
