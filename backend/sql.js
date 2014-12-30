var fs = require('fs');
var async = require('async');
var _ = require('lodash');
var p = require('path');

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
    parseVideos: function() {
        var dirs = fs.readdirSync(CON.path.video);
        _.each(dirs, function(dir) {
            var path = CON.path.video + dir;
            var stat = fs.statSync(path);
            if (stat.isDirectory()) {
                // parse clips
                backend.parseClips(dir);

                // check the video.json
            }
        })
    },
    getVideoPath: function(video) {
        return CON.path.video + video + '/';
    },
    parseClips: function(video) {
        var path = CON.path.video + video + '/';
        // structure of a video:
        // clip, image, info, video.txt
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

                            backend.parseClipInfo(video, base);
                        });
                    }
                });

                // image file will require ffmpeg to be present
            }
        });
    },
    parseClipInfo: function(video, seq) {
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
                'bookmarked boolean ' +
                ')', function (er) {
                if (er) {
                    console.log('Table clips is not created, because either it already exists or there was error.');
                } else {
                    sql.run('create table clip_tags (' +
                        'video varchar(60),' +
                        'seq varchar(8),' +
                        'tag varchar(60)' +
                        ')', function (er) {
                        if (er) {
                            console.log('Table clip_tags is not created, because either it already exists or there was error.')
                        } else {
                            // if not, we need to import all data from the video folder
                            backend.parseVideos();

                            // create info file for a video if there is not any
                        }
                    });
                }
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
// do not init db in force mode if you are not developing
// backend.initDb(true);

exports.backend = backend;