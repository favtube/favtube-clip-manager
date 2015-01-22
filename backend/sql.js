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

    mergeDir: function() {

    },

    createImage: function(video, seq, path, callback, second, suffix, opts) {
        opts = opts || {};
        var t = this;
        path = path || t.getVideoPath(video);
        second = typeof second === 'undefined' ? 2 : second;
        suffix = suffix || '';

        var imagePath = path + 'image/';
        if (!fs.existsSync(imagePath)) {
            fs.mkdirSync(imagePath);
        }

        var imageFile = path + 'image/' + seq + suffix + '.jpg';
//        console.log(imageFile);
        if (fs.existsSync(imageFile)) {
            setImmediate(function() {
                callback && callback();
            });
            return;
        }

        var cmd = ffmpeg(path + 'clip/' + seq + '.mp4')
            .on('end', function() {
                callback && callback();
            })
            .screenshot({
                folder: path + 'image/',
                filename: seq + suffix + '.jpg',
                timestamps: [second],
                size: opts.width ? opts.width + 'x?' : '300x?'
            });

//        console.log('creating image second:', second, 'suffix:', suffix);
    },

    syncVideo: function(video, force) {
        sql.get('select * from clips where video = $video limit 1', {
            $video: video
        }, function(err, res) {
            if (res && !force) {
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
                                if (err) throw err;
                            });
                        }

                        var pathInfo = path + '/info/';
                        // need to check the existence of the info & image file
                        // write to info if not exist
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

    syncClipInfo: function(video, seq, cb) {
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

        sql.run('update clips set bookmark = $bookmark where video = $video and seq = $seq',
            _.extend({}, params, {$bookmark: info.bookmark}), function(err) {
            if (err) {
                throw err;
            }
                cb && cb();
        });
    },

    initDb: function(force) {
        var run = function() {
            sql.run('create table clips (' +
                'seq varchar(8),' +
                'video varchar(60),' +
                'rand_seq bigint, ' +
                'bookmark boolean,' +
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
    },
    CON: {
        results: {
            videoRemoved: 'video-removed',
            clipRemoved: 'clip-removed'
        }
    },
    randomClips: function(params, ok, ret) {
        ret = ret || [];

        var bookmarkClause = params.bookmark ? ' where bookmark = 1 ' : '';

        sql.all('select * from clips ' +
            bookmarkClause
            + ' order by random() limit 20', function(err, res) {
            var videoRemoved = {}, sqlQueries = 0;
            ret = ret.concat(res);
            _.each(res, function(clip) {
                if (err) throw err;
                if (clip.video in videoRemoved) return;
                sqlQueries ++;

                backend.checkAvailability(clip.video, clip.seq, function(result) {
                    if (result == backend.CON.results.videoRemoved) {
                        videoRemoved[clip.video] = 1;
                        ret = _.remove(ret, function(r) {
                            return r.video == clip.video;
                        });
                    } else if (result == backend.CON.results.clipRemoved) {
                        ret = _.remove(ret, function(r) {
                            return r.video == clip.video && r.seq == clip.seq;
                        });
                    }

                    if (--sqlQueries <= 0) {
                        if (ret.length >= 20) ok(ret);
                        else backend.randomClips(params, ok, ret);
                    }
                });
            });
        });
    },
    checkAvailability: function(video, seq, cb) {
        var path = backend.getVideoPath(video);
        if (!fs.existsSync(path)) {
            sql.run('delete from clips where video = $video', {
                $video: video
            }, function(err) {
                if (err) throw err;
                cb(backend.CON.results.videoRemoved)
            });
        } else if (!fs.existsSync(path + '/clip/' + seq + '.mp4')) {
            sql.run('delete from clips where video = $video and seq = $seq', {
                $video: video,
                $seq: seq
            }, function(err) {
                if (err) throw err;
                cb(backend.CON.results.clipRemoved);
            })
        } else {
            setImmediate(function() {cb()});
        }
    },
    getAllVideoClips: function(video, cb) {
        sql.all('select * from clips where video = $video order by seq', {
            $video: video
        }, function(err, data) {
            if (err) throw err;
            cb(data);
        })
    },
    toggleFav: function(video, seq, bookmark, cb) {
        var infoPath = backend.getVideoPath(video) + '/info/' + seq + '.txt';
        try {
            var info = JSON.parse(fs.readFileSync(infoPath));
        } catch (ex) {
            info = null;
        }

        console.log(info);
        if (!info) {
            info = {
                linked: 0,
                bookmark: bookmark,
                tags: []
            }
        } else {
            info.bookmark = bookmark;
        }

        fs.writeFileSync(infoPath, JSON.stringify(info));

        backend.syncClipInfo(video, seq, function() {
            cb();
        });
    },

    /**
     *
     * @param source end with /
     * @param target end with /
     */
    moveFolder: function(source, target) {
        if (!fs.existsSync(target)) {
            fs.mkdirSync(target);
        }

        var allSubItems = fs.readdirSync(source);
        _.each(allSubItems, function(item) {
            if (item == '.' || item == '..') return;

            var path = source + item;
            var stat = fs.statSync(path);
            if (stat.isFile()) {
                fs.renameSync(path, target + item);
            } else if(stat.isDirectory()) {
                backend.moveFolder(path + '/', target + item + '/');
            }
        });

//        console.log('try removing dir - ', source);
        fs.rmdirSync(source);
    }
}

//backend.syncVideos();
// do not init db in force mode if you are not developing
// backend.initDb(true);

exports.backend = backend;