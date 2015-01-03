var fs = require('fs');

var CON = {
    path: {
        base: tmp_base = fs.realpath(__dirname + '/../') + '/',
        video: tmp_base + 'videos/'
    }
};

exports.setup = function(backend, app) {
    function getVideoPath(video) {
        return CON.path.video + video;
    }

    app.post('/ajax/random', function(req, rsp) {
        backend.randomClips({
            bookmark: req.body.bookmark
        }, function(res) {
            rsp.send(JSON.stringify(res));
        });
    });

    app.post('/ajax/story', function(req, rsp) {
        var video = req.body.video;

        backend.getAllVideoClips(video, function(clips) {
            rsp.send(JSON.stringify(clips));
        })
    });

    app.post('/ajax/toggle-fav', function(req, rsp) {
        backend.toggleFav(req.body.video, req.body.seq, req.body.bookmark, function() {
            rsp.send('');
        });
    })
}