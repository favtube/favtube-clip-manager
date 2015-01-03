var async = require('async');
var fs = require('fs');
var _ = require('lodash');
var path = require('path');
var ffmpeg = require('fluent-ffmpeg');

var CON = {
    paths: {
        base: __dirname + '/',
        videoRaw: __dirname + '/videos-raw/',
        videoProcess: __dirname + '/videos-processed/',
        videoRawProcess: __dirname + '/videos-raw-processed/',
        video: __dirname + '/videos/'
    }
}

// body parser
var bodyParser = require('body-parser');

var backend = require(__dirname + '/backend/sql.js').backend;

var parseVideo = function(videos) {
    var v = videos.pop();

    var runNext = function() {
        if (!videos.length) return;
        setImmediate(function() {
            parseVideo(videos);
        });
    }
    var p = CON.paths.videoRaw + v;
    var stat = fs.statSync(p);
    if (v.substr(0, 1) != '.') {
        if (stat.isDirectory()) {
            var clipPath = p + '/clip/';
            if (!fs.existsSync(clipPath)) {
                runNext();
                return;
            }

            var clips = fs.readdirSync(clipPath);
            var proc = 0;

            console.log('Create thumbnail for clip if not exists. for - video ' + v);
            _.each(clips, function (clip) {
                var ext = path.extname(clip);
                if (ext == '.mp4') {
                    proc ++;
                    var base = path.basename(clip, ext);

//                    console.log('Create thumbnail for clip if not exists. for - ' + base);

                    // checking image
                    backend.createImage(v, base, p + '/', function() {
                        proc--;
                        if (proc <= 0) {
                            console.log('Moving video folder');
                            backend.moveFolder(p + '/', CON.paths.video + v + '/');
                            console.log('Video folder moved');
                            backend.syncVideo(v, true);
                            runNext();
                        }
                    });
                }
            });
        } else if (stat.isFile()) {
            if (/\.processed\.mp4$/.exec(v)) {
                runNext();
                return;
            }

            try {

                // to detect the video's bitrate and v/a codecs
                console.log('Probing the video for metadata - ', v);
                ffmpeg.ffprobe(p, function(err, metadata) {
                    var ext = path.extname(v);
                    var base = path.basename(v, ext);
                    var pathBase = CON.paths.videoRaw + base;
                    var processedExt = '.processed.mp4';
                    console.log('Processing - base:', base, ' ext:', ext);

                    var vopts, aopts;
                    _.each(metadata.streams, function(stream) {
                        if (stream.codec_type == 'video') {
                            vopts = stream;
                        } else if (stream.codec_type == 'audio') {
                            aopts = stream;
                        }
                    });

                    // to tranform the video into mp4 format
                    ffmpeg(p)
                        .audioBitrate('128k')
                        .videoBitrate(vopts.bit_rate ?
                            vopts.bit_rate > 2500000 ? '2500k' :
                                vopts.bit_rate > 1200000 ? (vopts.bit_rate / 1000) + 'k' : '1200k'
                                : '1200k')
                        .videoCodec(vopts.codec_name == 'h264' ? 'copy' : 'libx264')
                        .audioCodec(aopts.codec_name == 'aac' ? 'copy' : 'libvo_aacenc')
                        .save(pathBase + processedExt)
                        .on('end', function() {

                            console.log('New video file saved - ', pathBase + processedExt);
                            // create the folder for raw clips
                            if (!fs.existsSync(pathBase)) fs.mkdirSync(pathBase);

                            // use the magic cmd to split the video
                            ffmpeg(pathBase + processedExt)
                                .videoCodec('copy')
                                .audioCodec('copy')
                                .outputOptions(
                                    '-f', 'segment',
                                    '-segment_time', '20',
                                    '-reset_timestamps', 1
                                )
                                .save(pathBase + '/%4d.mp4')
                                .on('end', function() {

                                    console.log('Clips generated.');

                                    // after splitting the video, move the videos files to proccessed
                                    fs.renameSync(pathBase + processedExt, CON.paths.videoProcess + base + processedExt);
                                    fs.renameSync(p, CON.paths.videoRawProcess + v);

                                    // we will restructure the clip folder
                                    var target = base.replace(/[^\w\-]/g, '') + '_' +
                                        Math.floor(Math.random() * Math.pow(36, 10)).toString(36);

                                    fs.mkdirSync(CON.paths.videoRaw + target);
                                    var targetPath = CON.paths.videoRaw + target;

                                    fs.renameSync(pathBase, targetPath + '/clip');
                                    videos.push(target);
                                    runNext();
                                });
                        });
                });
            } catch(ex) {
                console.log(' ============= FAILED at ============= ', v);
                runNext();
            }
        }
    } else {
        runNext();
    }
}

var allVideos = fs.readdirSync(CON.paths.videoRaw);
parseVideo(allVideos);