var fs = require('fs');
var async = require('async');
var _ = require('lodash');
var p = require('path');
var ffmpeg = require('fluent-ffmpeg');

// sqlite setup
// https://github.com/mapbox/node-sqlite3/wiki/API
var sqlite3 = require('sqlite3')
    // uncomment the verbose only when you are debugging
//    .verbose();
var sql = new sqlite3.Database('temp-favtube.db');

var tmp_base;
var CON = {
    path: {
            base : tmp_base = fs.realpathSync(__dirname + '/..') + '/',
            video : tmp_base + 'videos/'
        }
    };

var backend = {
    syncVideos: function() {

            var dirs = fs.readdirSync(CON.path.video);

            _.each(dirs, function(dir) {
                backend.syncVideo(dir);
            });

    },

    getVideoPath: function(video) {
        return CON.path.video + video + '/';
    },

    createImage: function(video, seq, second, suffix) {
        var t = this;
        var path = t.getVideoPath(video);
        second = second || 2;
        suffix = suffix || '';

        var imageFile = path + 'image/' + seq + suffix + '.jpg';
        if (fs.existsSync(imageFile)) {
            return;
        }

        var cmd = ffmpeg(path + 'clip/' + seq + '.mp4')
            .screenshot({
                folder: path + 'image/',
                filename: seq + suffix + '.jpg',
                timestamps: [2],
                size: '300x?'
            });

    },

    syncVideo: function(video) {
        sql.get('select * from clips where video = $video limit 1', {
            $video: video
        }, function(err, res) {
            if (res) {
                console.log('Record found for video : ' + video + ' ---- skipped');
                return;
            }

            var path = CON.path.video + video;
            var stat = fs.statSync(path);
            path += '/';
            if (!stat.isDirectory()) return;

            // structure of a video:
            // clip, image, info, video.txt
            if (!fs.existsSync(path + 'clip')) {
                fs.mkdirSync(path + 'clip');
                var files = fs.readdirSync(path);
                _.each(files, function(f) {
                    if (f && f.substr(1) != '.' && f != 'clip') {
                        fs.renameSync(path + f, path + 'clip/' + f);
                    }

                });
            }
            var files = fs.readdirSync(path + 'clip');
            _.each(files, function(file) {
                var ext = p.extname(file);
                if (ext == '.mp4') {
                    var base = p.basename(file, ext);
                    var params = {
                        $video: video,
                        $seq: base
                    }

                    // insert into db
                    sql.get('select * from clips where video = $video and seq = $seq', params, function(err, res) {
                        if (!res) {
                            sql.run('insert into clips(video, seq) values($video, $seq)', params, function(err) {
                                // need to check the existence of the info & image file
                                // write to info if not exist
                                var pathInfo = path + '/info/';
                                if (!fs.existsSync(pathInfo)) {
                                    fs.mkdirSync(pathInfo);
                                }

                                var pathInfoFile = pathInfo + base + '.txt';
                                if (!fs.existsSync(pathInfoFile)) {
                                    /**
                                     * file stucture:
                                     *  linked: integer -- if the clip is split at a bad position
                                     *  bookmark: boolean
                                     *  tags: array
                                     */
                                    fs.writeFileSync(pathInfoFile, JSON.stringify({
                                        linked: 0,
                                        bookmark: false,
                                        tags: []
                                    }));
                                }

                                backend.syncClipInfo(video, base);
                            });
                        }
                    });

                    // image file will require ffmpeg to be present
                    var pathImage = path + '/image/';
                    if (!fs.existsSync(pathImage)) {
                        fs.mkdirSync(pathImage);
                    }

                    backend.createImage(video, base);
                }
            });
        });
    },

    syncClipInfo: function(video, seq) {
        var path = backend.getVideoPath(video);
        var pathInfo = path + 'info/' + seq + '.txt';

        var info = JSON.parse(fs.readFileSync(pathInfo));
        var params = {
            $video: video,
            $seq: seq
        }

        sql.run('delete from clip_tags where video = $video and seq = $seq', params, function(err) {
            _.each(info.tags, function(tag) {
                sql.run('insert into clip_tags(video, seq, tag) values($video, $seq, $tag)',
                    _.extend({}, params, {$tag: tag}), function(err) {
                        console.log('saving - ', tag);
                    });
            });
        });

        sql.run('update clips set bookmarked = $bookmark where video = $video and seq = $seq',
            _.extend({}, params, {$bookmark: info.bookmark}), function(err) {
            if (err) {
                throw err;
            }
             console.log(_.extend({}, params, {$bookmark: info.bookmark}));
        });
    },

    initDb: function(force) {
        var run = function() {
            sql.run('create table clips (' +
                'seq varchar(8),' +
                'video varchar(60),' +
                'rand_seq bigint, ' +
                'bookmarked boolean,' +
                'not_found boolean ' +
                ')', function (er) {
                if (er) {
                    console.log('Table clips is not created, because either it already exists or there was error.');
                }

                sql.run('create table clip_tags (' +
                    'video varchar(60),' +
                    'seq varchar(8),' +
                    'tag varchar(60)' +
                    ')', function (er) {
                    if (er) {
                        console.log('Table clip_tags is not created, because either it already exists or there was error.')
                    }

                    backend.syncVideos();
                });
            });
        }

        if (force) {
            sql.run('drop table clips;', function(err) {
                sql.run('drop table clip_tags;', function(err) {
                    run();
                })
            });
        } else {
            run();
        }
    }
}

backend.initDb();
//backend.syncVideos();
// do not init db in force mode if you are not developing
// backend.initDb(true);

exports.backend = backend;