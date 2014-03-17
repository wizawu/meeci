var express = require('express');
var app = express();

app.use(express.static('./public'));
app.use(express.logger({
    format: ':remote-addr - - [:date] ":method :url HTTP/:http-version" '+
            ':status :res[content-length] - :response-time ms'
}));
app.use(express.errorHandler());

app.get('/', function(req, res) {
    res.sendfile('home.html');
});

var http = require('http');
var port = process.env.MEECI_PORT || 3780;

http.createServer(app).listen(port, function() {
    console.log('Meeci Web is listening on port ' + port);
});
