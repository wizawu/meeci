var express = require('express');
var app = express();

var http = require('http');
var port = process.env.MEECI_PORT || 8037;

http.createServer(app).listen(port);
