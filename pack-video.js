var async = require('async');
var fs = require('fs');
var _ = require('lodash');
var path = require('path');
var ffmpeg = require('fluent-ffmpeg');

var CON = {
    paths: {
        base: __dirname + '/',
        packedVideos: __dirname + '/videos-packed/',
        videoRefined: __dirname + '/videos-refined/',
        tempPath: __dirname + '/tmp-processing/'
    }
}

// body parser
var bodyParser = require('body-parser');

var backend = require(__dirname + '/backend/sql.js').backend;

backend.ensureDir(CON.paths.tempPath, true);
backend.ensureDir(CON.paths.packedVideos);

var parseVideo = function(videos) {
    var v = videos.pop();

    var runNext = function() {
        if (!videos.length) return;
        setImmediate(function() {
            parseVideo(videos);
        });
    }
    var p = CON.paths.videoRefined + v;
    if (!fs.existsSync(p)) runNext();

    var stat = fs.statSync(p);
    if (v.substr(0, 1) != '.') {
        if (stat.isDirectory()) {
            var clipV2Path = p + '/clip_v2/';

            if (!fs.existsSync(clipV2Path)) {
                runNext();
                return;
            }


            var jobs = [];
            var runningJob = 0, maxRunningJob = 1;
            var runJob = function() {
                if (jobs.length) {
                    var job = jobs.shift();
                    console.log('debug: job, ', job);
                    if (job.type == 'pack') {
                        backend.packVideo(job, function() {
                            runJob();
                        });
                    } else if (job.type == 'image') {
                        backend.image(job, function() {
                            runJob();
                        });
                    }
                } else {
                    runningJob --;
                    if (runningJob <= 0) {
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

            var targetPath = CON.paths.packedVideos + v + '/';
            backend.ensureDir(targetPath);

            var clips = fs.readdirSync(clipV2Path);
            for (var clipIdx = 0; clipIdx < clips.length; clipIdx++) {
                var clip = clips[clipIdx];
                var nextClip = clips[clipIdx + 1];

                if (path.extname(clip) == '.mp4' && (!nextClip ||
                            path.extname(nextClip) == '.mp4'
                    )) {
                    if (!fs.existsSync(targetPath + nextClip)) {
                        jobs.push({
                            type: 'pack',
                            source: clipV2Path + clip,
                            target: targetPath + clip,
                            clipType: 'video',
                            vbitrate: '450k',
                            outputOptions: [
                                '-vf scale=-2:320'
                            ]
                        });
                    }

                    if (!fs.existsSync(targetPath + nextClip + '.jpg')) {
                        jobs.push({
                            type: 'image',
                            source: targetPath + clip,
                            path: targetPath,
                            filename: path.basename(clip, '.mp4') + '.jpg'
                        });
                    }
                }

            }

            var audioV2Path = p + '/audio_v2/';
            var sounds = fs.readdirSync(audioV2Path);
            sounds.forEach(function(clip, idx) {
                var nextClip = sounds[clipIdx + 1];
                if (path.extname(clip) == '.mp4' &&
                    (!nextClip ||
                        (path.extname(nextClip) == '.mp4'
                            && !fs.existsSync(targetPath + nextClip)))
                    ) {
                    jobs.push({
                        type: 'pack',
                        source: audioV2Path + clip,
                        target: targetPath + clip,
                        clipType: 'audio',
                        abitrate: '72k'
                    })
                }
            })
            queueJob();
        } else {runNext();}
    } else {
        runNext();
    }
}

var allVideos = fs.readdirSync(CON.paths.videoRefined);
parseVideo(allVideos);