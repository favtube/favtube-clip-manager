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

    subclips: function(video, page, callback) {
        var path = this.getVideoPath(video) + 'subclips/';
        var all = fs.readdirSync(path);
        var subclips = [];

        var numPerPage = 60, page = Number(page);
        var curr = 0;
        var t = this;

        all.some(function(subclip) {
            var ext = p.extname(subclip);
            if (ext == '.mp4') {
                var base = p.basename(subclip, ext);

                curr++;

                if (curr < page * numPerPage) return false;
                if (curr >= (page + 1) * numPerPage + 6) return true;

                subclips.push({
                    video: video,
                    subclip: base,
                    info: t.subclipInfo(video, base)
                });
            }
        });

        callback(subclips);
    },

    processFileName: function(filename, expectExt) {
        if (!filename) return false;

        var ext = p.extname(filename);
        if (ext == expectExt) {
            return {
                base: p.basename(filename, ext),
                ext: ext
            }
        } else {
            return false;
        }
    },

    subclipInfo: function(video, subclipName) {
        var t = this;
        var path = this.getVideoPath(video);
        var subInfos = path + 'subinfos/';
        t.ensureDir(subInfos);
        var target = subInfos + subclipName + '.txt';

        if (fs.existsSync(target)) {
            var cont = fs.readFileSync(target);
            try {
                var result = JSON.parse(cont);
                if (result) {
                    return result;
                }
            } catch (ex) {
            }
        }
        t.writeSubclipInfo(video, subclipName, {});
        return {};
    },

    writeSubclipInfo: function(video, subclipName, data) {
        if (typeof data == 'object' && data) {
            var t = this;
            var path = this.getVideoPath(video);
            var subInfos = path + 'subinfos/';
            t.ensureDir(subInfos);
            var target = subInfos + subclipName + '.txt';

            fs.writeFileSync(target, JSON.stringify(data));
        }
    },

    concatSound: function(video, files, refinedPath, target, tempPath, callback) {
        var subClipPath = refinedPath + video + '/subclips/';

        if (!files.length) {
            callback();
            return;
        }
        var cmd = ffmpeg();

        while (files.length) {
            cmd.input(subClipPath + files.shift() + '.mp4');
        }

        cmd.noVideo()
            .audioBitrate('128k')
            .audioCodec('libvo_aacenc')
            .mergeToFile(target + '.mp4')
            .on('end', function() {
                callback();
            });
    },

    concat: function(video, files, refinedPath, clipV2Path, tempPath, callback, soundName) {
        var subClipPath = refinedPath + video + '/subclips/';
        var audioV2Path = refinedPath + video + '/audio_v2/';
        this.ensureDir(audioV2Path);
        soundName = soundName || '';
        var t = this;
        var concatStr = "concat:" + files.map(function(f) {return tempPath + f + '.ts';}).join('|');
        var firstClip = files[0], lastClip = files[files.length - 1];
        var target = clipV2Path + firstClip + soundName + '.mp4';

        var transit = function() {
            if (files.length) {
                t.transitToTs(files.shift(), subClipPath, tempPath, function() {
                    transit();
                });
            } else {
                console.log(concatStr);
                ffmpeg()
                    .input(concatStr)
                    .outputOptions([
                        "-c copy",
                        "-bsf:a aac_adtstoasc"
                    ])
                    .save(target)
                    .on('end', function() {
                        ffmpeg()
                            .input(target)
                            .noVideo()
                            .audioCodec('copy')
                            .save(audioV2Path + (soundName ? soundName : firstClip + '.curr') + '.mp4')
                            .on('end', function() {
                                if (soundName) {
                                    fs.unlinkSync(target);
                                }
                                callback();
                            });
                    });
            }
        }
        transit();
    },

    transitToTs: function(clipName, clipPath, tempPath, callback) {
        ffmpeg()
            .input(clipPath + clipName + '.mp4')
            .outputOptions([
                "-c copy",
                "-bsf h264_mp4toannexb"
            ])
            .save(tempPath + clipName + '.ts')
            .on('end', function() {
                callback();
            });
    },

    rmDir: function(path) {
        var rmDir = function(dirPath) {
            try { var files = fs.readdirSync(dirPath); }
            catch(e) { return; }
            if (files.length > 0)
                for (var i = 0; i < files.length; i++) {
                    var filePath = dirPath + '/' + files[i];
                    if (fs.statSync(filePath).isFile())
                        fs.unlinkSync(filePath);
                    else
                        rmDir(filePath);
                }
            fs.rmdirSync(dirPath);
        };
        rmDir(path);
    },

    ensureDir: function(path, reset) {
        var dirname= p.dirname(path);

        if (!fs.existsSync(path)) {
            this.ensureDir(dirname);
            fs.mkdirSync(path);
        } else if (reset) {
            this.rmDir(path);
            fs.mkdirSync(path);
        }
    },

    createSubClips: function(video, seq, path, callback) {
        var clipPath = path + 'clip/' + seq + '.mp4',
            subclipsPath = path + 'subclips/',
            subclipsImagePath = path + 'subimages/',
            soundsPath = path + 'sounds/';

        console.log('debug: video - ', video, 'seq - ', seq, 'path - ', path);

        if (!fs.existsSync(subclipsPath)) {
            fs.mkdirSync(subclipsPath);
        }

        if (!fs.existsSync(subclipsImagePath)) {
            fs.mkdirSync(subclipsImagePath);
        }

        if (!fs.existsSync(soundsPath)) {
            fs.mkdirSync(soundsPath);
        }

        console.log('clip path - ', clipPath);
        ffmpeg.ffprobe(clipPath, function(err, metadata) {

            var vopts, aopts;
            _.each(metadata.streams, function(stream) {
                if (stream.codec_type == 'video') {
                    vopts = stream;
                } else if (stream.codec_type == 'audio') {
                    aopts = stream;
                }
            });

            var useVideoBitrate = vopts.bit_rate ?
                    vopts.bit_rate > 2500000 ? '2700k' :
                    ('' + vopts.bit_rate).toLocaleLowerCase() == 'n/a' ? '1800k' :
                    vopts.bit_rate > 1400000 ? (vopts.bit_rate / 1000 + 200) + 'k' : '1600k'
                : '1200k';

            var duration = vopts.duration;
                ffmpeg(clipPath)
                    .noVideo()
                    .audioBitrate('128k')
                    .audioCodec('copy')
                    .save(soundsPath + seq + '.mp4')
                    .on('end', function () {
                        var count = 0;
                        for (var idx = 0; idx < duration / 3; idx += 1) {
                            count ++;
                            (function (idxInScope) {
                                var prefix = idx < 10 ? '0' : '';
                                var target = subclipsPath + seq + prefix + idxInScope + '.mp4';
                                console.log('from clipPath', clipPath, ' to ', target);
                                console.log('seek input - ', idxInScope * 3);

                                var process = function () {
                                    ffmpeg(clipPath)
                                        .seekInput(idxInScope * 3)
                                        .duration(3)
                                        .videoBitrate(useVideoBitrate)
                                        .videoCodec('libx264')
                                        .audioBitrate('128k')
                                        .audioCodec('libvo_aacenc')
                                        .save(subclipsPath + seq + prefix + idxInScope + '.mp4')
                                        .on('end', function () {
                                            console.log('debug: before creating sub clip image - ' + idxInScope, video, seq);
                                            ffmpeg(target)
                                                .screenshot({
                                                    folder: subclipsImagePath,
                                                    filename:  seq + prefix + idxInScope + '.jpg',
                                                    timestamps: [0]
                                                }).on('end', function (err) {
                                                    count --;
                                                    if (count == 0) {
                                                        callback();
                                                    }
                                                }).on('error', function(err) {
                                                    console.log('ERROR ---- ', err.message);
                                                    count --;
                                                    if (count == 0) {
                                                        callback();
                                                    }
                                                });
                                        });
                                }

                                process();
                            })(idx);
                        }
                        if (count == 0) callback();
                    });
        });
    },

    packVideo: function(opts, callback) {
        var cmd = ffmpeg(opts.source);

        if (opts.clipType == 'video') {
            cmd.noAudio();
        } else if (opts.clipType == 'audio') {
            cmd.noVideo();
        }

        if (opts.vbitrate) {
            cmd.videoBitrate(opts.vbitrate);
        }

        if (opts.abitrate) {
            cmd.videoBitrate(opts.abitrate);
        }

        if (opts.outputOptions) {
            cmd.outputOptions(opts.outputOptions);
        }


        if (opts.inputOptions) {
            cmd.inputOptions(opts.inputOptions);
        }

        cmd.save(opts.target)
            .on('error', function() {
                callback();
            })
            .on('end', function() {
                callback();
            });
    },

    image: function(opts, callback) {
        var cmd = ffmpeg(opts.source)
            .on('end', function() {
                callback();
            })
            .on('error', function() {
                callback();
            })
            .screenshot({
                folder: opts.path,
                filename: opts.filename,
                timestamps: [0]
            });
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


        var bookmarkClause = params.bookmark ? ' and bookmark = 1 ' : '';

        console.log(' params.videos:', params.videos);

        if (params.videos) {
            var videos = _.remove(params.videos, function(v) {return v});
            if (videos.length) {
                var videoClause = ' and (video = \'' + videos.join('\' or video = \'') + '\')';
            }
        }
        videoClause = videoClause || '';

        var sqlStr = 'select * from clips ' +
            ' where 1 ' +
            bookmarkClause +
            videoClause +
            ' order by random() limit 20';

       //  console.log(sqlStr, ' videos:', videos, 'videoClause:', videoClause);

        sql.all(sqlStr, function(err, res) {
            var videoRemoved = {}, sqlQueries = 0;
            ret = ret.concat(res);

            if (err) {
                console.log('error :', err);
                console.log(sqlStr, ' videos:', videos, 'videoClause:', videoClause);
            }
//            console.log('res' , res, 'err', err);

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