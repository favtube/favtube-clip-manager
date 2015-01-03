var express = require('express');
var app = express();

var options = {
    root: __dirname + '/static/'
};

// static paths
app.use('/videos', express.static('videos'));
app.use('/bower_components', express.static('bower_components'));
app.use('/static', express.static('static'));

// body parser
var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var sql = require(__dirname + '/backend/sql.js');
require(__dirname + '/backend/ajax.js').setup(sql.backend, app);

app.get('/', function (req, res) {
    res.sendFile('/app.html', options);
});

var server = app.listen(3000, function () {

    var host = server.address().address;
    var port = server.address().port;

    console.log('Example app listening at http://%s:%s', host, port);
});

sql.backend.initDb();