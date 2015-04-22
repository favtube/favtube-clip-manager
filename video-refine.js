var async = require('async');
var fs = require('fs');
var _ = require('lodash');
var path = require('path');
var ffmpeg = require('fluent-ffmpeg');

var CON = {
    paths: {
        base: __dirname + '/',
        videoToRefine: __dirname + '/videos-to-refine/',
        videoRefined: __dirname + '/videos-refined/',
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
    var p = CON.paths.videoToRefine + v;
    if (!fs.existsSync(p)) runNext();

    var stat = fs.statSync(p);
    if (v.substr(0, 1) != '.') {
        if (stat.isDirectory()) {
            var clipInfoPath = p + '/subinfos/';

            if (!fs.existsSync(clipInfoPath)) {
                runNext();
                return;
            }

            var clipV2Path = p + '/clip_v2/';
            backend.ensureDir(clipV2Path);
            var subClipInfos = fs.readdirSync(clipInfoPath);

            var jobs = [];
            var runningJob = 0, maxRunningJob = 1;
            var runJob = function() {
                if (jobs.length) {
                    var job = jobs.shift();
                    console.log('debug: job, ', job);
                    if (job.type == 'concat') {
                        backend.concat(job.video, job.files, CON.paths.videoToRefine,
                            clipV2Path, CON.paths.tempPath, function() {
                            runJob();
                        }, '', job.selected);
                    } else if (job.type == 'concat-sound') {
                        if (!job.files.length) {
                            runJob();
                            return;
                        }

                        backend.concat(job.video, job.files, CON.paths.videoToRefine,
                            clipV2Path, CON.paths.tempPath, function() {
                                runJob();
                            },
                            job.soundName
                        );
                    } else if (job.type == 'merge') {
                        backend.merge(job.video, job.files, CON.paths.videoToRefine, function() {
                            runJob();
                        });
                    }
                } else {
                    runningJob --;
                    if (runningJob <= 0) {
                        console.log('Moving video folder');
                        backend.moveFolder(p + '/', CON.paths.videoRefined + v + '/');

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
                        var info = JSON.parse(fs.readFileSync(clipInfoPath + clip));
                        if (info.chosen || !isFirst) {
                            files.push(base);
                            if (info.linkNext) {
                                clipIdx ++;
                                parseClipInfo(subClipInfos[clipIdx], files);
                            }
                        }

                        if (isFirst && info.chosen) {
                            jobs.push({
                                type: 'concat',
                                video: v,
                                files: files,
                                selected: !(clipIdx % 3)
                            });

                            if (!(clipIdx % 3)) {
                                selected.push(files[0]);
                            }

                            var preSounds = [], postSounds = [];
                            var pushFile = function(idx, list) {
                                var res;
                                if (res = backend.processFileName(subClipInfos[idx], '.txt')) {
                                    list.push(res.base);
                                }
                            }
                            pushFile(currIdx - 2, preSounds);
                            pushFile(currIdx - 1, preSounds);

                            pushFile(clipIdx + 1, postSounds);
                            pushFile(clipIdx + 2, postSounds);

                            jobs.push({
                                type: 'concat-sound',
                                video: v,
                                files: preSounds,
                                soundName: files[0] + '.pre'
                            });

                            jobs.push({
                                type: 'concat-sound',
                                video: v,
                                files: postSounds,
                                soundName: files[0]+ '.post'
                            });
                        }
                    }
                }

                parseClipInfo(clip);
            }

//            jobs.push({
//                type: 'merge',
//                video: v,
//                files: selected,
//                forUpload: true
//            });

            queueJob();
        } else {
            runNext();
        }
    } else {
        runNext();
    }
}

var allVideos = fs.readdirSync(CON.paths.videoToRefine);
parseVideo(allVideos);