var async = require('async');
var fs = require('fs');
var _ = require('lodash');
var path = require('path');
var ffmpeg = require('fluent-ffmpeg');

var CON = {
    paths: {
        base: __dirname + '/',
        video: __dirname + '/videos/',
        tempPath: __dirname + '/tmp-processing/'
    }
}

// body parser
var bodyParser = require('body-parser');

var backend = require(__dirname + '/backend/sql.js').backend;

backend.ensureDir(CON.paths.tempPath, true);

var parseVideo = function(videos) {
    var v = videos.pop();

    console.log('Refining video - ', v);

    var runNext = function() {
        if (!videos.length) return;
        setImmediate(function() {
            parseVideo(videos);
        });
    }
    var p = CON.paths.video + v;
    if (!fs.existsSync(p)) runNext();

    var stat = fs.statSync(p);
    if (v.substr(0, 1) != '.') {
        if (stat.isDirectory()) {
            var removedInfoPath = p + '/clip_remove_info/';

            if (!fs.existsSync(removedInfoPath)) {
                runNext();
                return;
            }

            var removedClips = p + '/removed_clips/';
            backend.ensureDir(removedClips);
            var subClipInfos = fs.readdirSync(removedInfoPath);

            var jobs = [];
            var runningJob = 0, maxRunningJob = 1;
            var runJob = function() {
                if (jobs.length) {
                    var job = jobs.shift();
                    console.log('debug: job, ', job);
                    if (job.type == 'remove') {
                        if (fs.existsSync(p + '/clip/' + job.clip + '.mp4')) {
                            fs.renameSync(p + '/clip/' + job.clip + '.mp4', p + '/removed_clips/' + job.clip + '.mp4');
                        }
                        runJob();
                    }
                } else {
                    runningJob --;
                    if (runningJob <= 0) {
                        console.log('Moving video folder');

                        runNext();
                    }
                }
            }

            var queueJob = function() {
                if (maxRunningJob <= runningJob) return;
                runningJob ++;
                setTimeout(function() {
                    runJob();
                }, 0);
            }

            // select every 3 clips and the last two clips
            var selected = [];

            for (var clipIdx = 0; clipIdx < subClipInfos.length; clipIdx++) {
                var clip = subClipInfos[clipIdx];
                var currIdx = clipIdx;

                var parseClipInfo = function(clip, files) {
                    if (!clip) return;
                    if (!files) {
                        var isFirst = true;
                        files = [];
                    }
                    var ext = path.extname(clip);

                    if (ext == '.txt') {
                        var base = path.basename(clip, ext);
                        var info = JSON.parse(fs.readFileSync(removedInfoPath + clip));

                        if (!info.chosen) {
                            jobs.push({
                                type: 'remove',
                                video: v,
                                clip: base
                            });
                        }
                    }
                }

                parseClipInfo(clip);
            }

            queueJob();
        } else {
            runNext();
        }
    } else {
        runNext();
    }
}

var allVideos = fs.readdirSync(CON.paths.video);
parseVideo(allVideos);