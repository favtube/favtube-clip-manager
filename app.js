var express = require('express');
var app = express();

var options = {
    root: __dirname + '/static/'
};

// static paths
app.use('/videos', express.static('videos'));
app.use('/bower', express.static('bower_components'));
app.use('/static', express.static('static'));

// sqlite setup
// https://github.com/mapbox/node-sqlite3/wiki/API
var sqlite3 = require('sqlite3');
var sql = new sqlite3.Database('temp-favtube.db');


app.get('/', function (req, res) {
    res.sendFile('/app.html', options);
});

var server = app.listen(3000, function () {

    var host = server.address().address;
    var port = server.address().port;

    console.log('Example app listening at http://%s:%s', host, port);
});