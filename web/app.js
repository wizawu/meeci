var express = require("express");
var app = express();

app.use(express.static("./public"));
app.use(express.logger({
    format: ':remote-addr - - [:date] ":method :url HTTP/:http-version" '+
            ':status :res[content-length] - :response-time ms'
}));
app.use(express.errorHandler());
app.use(express.bodyParser());

app.get("/", function(req, res) {
    res.sendfile("home.html");
});

app.get("/user", function(req, res) {

});

var http = require("http");
var port = process.env.MEECI_PORT || 3780;

http.createServer(app).listen(port, function() {
    console.log("Meeci Web is listening on port " + port);
});

/**
 * Internal Functions
 */
function encrypt(passwd) {
    var salt = crypto.randomBytes(32).toString("base64");
    var hash = crypto.createHash("sha256").update(salt+passwd).digest("base64");
    return { hash: hash, salt: salt };
}
