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
            bookmark: req.body.bookmark,
            videos: req.body.videos
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
    });

    app.post('/ajax/subclips', function(req, rsp) {
        backend.subclips(req.body.video, req.body.page, function(subclips) {
            rsp.send(JSON.stringify(subclips));
        });
    });

    app.post('/ajax/writeSubclipInfo', function(req, rsp) {
        var clip = req.body.clip;
        backend.writeSubclipInfo(clip.video, clip.subclip, clip.info);
        rsp.send('');
    });

    app.post('/ajax/writeClipRemoveInfo', function(req, rsp) {
        var clip = req.body.clip;
        backend.writeClipRemoveInfo(clip.video, clip.clip, clip.info);
        rsp.send('');
    });

}