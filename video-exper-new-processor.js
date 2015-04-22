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
    };
    var p = CON.paths.videoRaw + v;
    if (!fs.existsSync(p)) runNext();

    var CLIP_LENGTH = 3, AUDIO_BITRATE = '128k', AUDIO_LENGTH = 6;
    var SPAN_IMAGES = 500;

    var jobs = [];
    var runningJob = 0, maxRunningJob = 1;
    var runJob = function() {
        if (jobs.length) {
            var job = jobs.shift();

            if (job.type == 'video') {

                // to tranform the video into mp4 format
                var cmd = ffmpeg(job.video);

                cmd.videoCodec('libx264');
                cmd.audioCodec('libvo_aacenc');

                cmd.videoBitrate(job.bitRate);
                cmd.audioBitrate(job.bitRate);

                cmd.seekInput(job.start)
                    .duration(CLIP_LENGTH);

                cmd.save(job.clipFolder + fileName(job.start) + '.mp4')
                    .on('end', function (err) {
                        runJob();
                    });
            } else if (job.type == 'audio') {
                // to tranform the video into mp4 format
                var cmd = ffmpeg(job.video);

                cmd.noVideo();
                cmd.audioCodec('libvo_aacenc');
                cmd.audioBitrate(AUDIO_BITRATE);

                cmd.seekInput(job.start)
                    .duration(AUDIO_LENGTH);

                cmd.save(job.clipFolder + fileName(job.videoStart) + job.audioSuffix + '.mp4')
                    .on('end', function (err) {
                        runJob();
                    });
            } else if (job.type == 'image') {
                var cmd = ffmpeg(job.video);

                var times = [];
                for (var i = job.start; i < job.start + SPAN_IMAGES; i += 0.5) {
                    times.push(i);
                }

                console.log('times - ', times);

                cmd.screenshots({
                    timestamps: times,
                    folder: job.imageFolder,
                    filename: '%s.jpg',
                    size: '?x280'
                }).on('end', function(err) {
                    runJob();
                });
            } else if (job.type == 'rename') {
                var files = fs.readdirSync(job.imageFolder);

                files.forEach(function(f) {
                    var ext = path.extname(f);
                    var base = path.basename(f, ext);

                    if (ext == '.jpg') {
                        fs.renameSync(job.imageFolder + f, job.imageFolder + 'img_' + fileName(base) + '.jpg');
                    }
                });
            } else {

                console.log('Processing video - ' + job.video + ' at timestamp: ' + job.start);
                runJob();
            }
        } else {
            runningJob --;
            if (runningJob <= 0) {
                runNext();
            }
        }
    }

    var fileName = function(timeInFloat) {
        timeInFloat = parseFloat(timeInFloat);
        var num = Math.floor(timeInFloat * 100).toString();
        return new Array(8 - num.length).join('0') + num;
    }

    var rand = function() {
        return Math.floor(Math.random() * 30 * 100) / 100;
    }


    var stat = fs.statSync(p);
    if (stat.isFile()) {

        try {
            // to detect the video's bitrate and v/a codecs
            console.log('Probing the video for metadata - ', v);
            ffmpeg.ffprobe(p, function(err, metadata) {
                if (err) {
                    runNext();
                    return;
                }

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

                var useVideoBitrate = vopts.bit_rate ?
                        vopts.bit_rate > 2500000 ? '2700k' :
                            ('' + vopts.bit_rate).toLocaleLowerCase() == 'n/a' ? '2200k' :
                            vopts.bit_rate > 1000000 ? (vopts.bit_rate / 1000 + 200) + 'k' : '1200k'
                    : '1200k';

                console.log('Original video bit rate: ', vopts.bit_rate, ' New video bit rate: ', useVideoBitrate);

                var duration = parseFloat(vopts.duration);
                console.log(' duration of the video : ' + duration);
                if (isNaN(duration) || !duration) {
                    duration = 4 * 3600;
                }

                // create the folder for raw clips
                // we will restructure the clip folder
                var target = base.replace(/[^\w\-]+/g, '_') + '_' +
                    Math.floor(Math.random() * Math.pow(36, 10)).toString(36);

                fs.mkdirSync(CON.paths.videoRaw + target);
                var targetPath = CON.paths.videoRaw + target;

                var clipFolder = targetPath + '/clips/';
                var imageFolder = targetPath + '/images/';

                fs.mkdirSync(clipFolder);
                fs.mkdirSync(imageFolder);

                // get random 3 second clips out of the video
                var clipNum = 0;
                for (var i = 0; i <= duration - CLIP_LENGTH ; i += SPAN_IMAGES) {
                    jobs.push({
                        type: 'message',
                        video: p,
                        start: i
                    });

                    //jobs.push({
                    //    type: 'audio',
                    //    video: p,
                    //    start: i,
                    //    videoStart: i,
                    //    audioSuffix: 'curr',
                    //    clipFolder: clipFolder
                    //});
                    //
                    //jobs.push({
                    //    type: 'audio',
                    //    video: p,
                    //    start: i - 6,
                    //    videoStart: i,
                    //    audioSuffix: 'pre',
                    //    clipFolder: clipFolder
                    //});
                    //
                    //jobs.push({
                    //    type: 'audio',
                    //    video: p,
                    //    start: i + 6,
                    //    videoStart: i,
                    //    audioSuffix: 'post',
                    //    clipFolder: clipFolder
                    //});


                    jobs.push({
                        type: 'image',
                        video: p,
                        start: i,
                        videoStart: i,
                        imageSuffix: '',
                        imageFolder: imageFolder
                    });

                    //jobs.push({
                    //    type: 'image',
                    //    video: p,
                    //    start: i + CLIP_LENGTH / 4,
                    //    videoStart: i,
                    //    imageSuffix: 'i2',
                    //    clipFolder: clipFolder
                    //});
                    //
                    //jobs.push({
                    //    type: 'image',
                    //    video: p,
                    //    start: i + CLIP_LENGTH / 4 * 2,
                    //    videoStart: i,
                    //    imageSuffix: 'i3',
                    //    clipFolder: clipFolder
                    //});
                    //
                    //
                    //jobs.push({
                    //    type: 'image',
                    //    video: p,
                    //    start: i + CLIP_LENGTH / 4 * 3,
                    //    videoStart: i,
                    //    imageSuffix: 'i4',
                    //    clipFolder: clipFolder
                    //});
                    //
                    //jobs.push({
                    //    type: 'image',
                    //    video: p,
                    //    start: i + CLIP_LENGTH - 0.01,
                    //    videoStart: i,
                    //    imageSuffix: 'i5',
                    //    clipFolder: clipFolder
                    //});

                    //jobs.push({
                    //    type: 'video',
                    //    video: p,
                    //    start: i,
                    //    bitRate: useVideoBitrate,
                    //    clipFolder: clipFolder
                    //});

                    clipNum ++;
                }

                jobs.push({
                    type: 'rename',
                    imageFolder: imageFolder
                })

                console.log('New video file saved - ', pathBase + processedExt);

                console.log(clipNum, aopts, vopts);
                runJob();
            });
        } catch(ex) {
            console.log(' ============= FAILED at ============= ', v);
            runNext();
        }
    } else {
        runNext();
    }
}

var allVideos = fs.readdirSync(CON.paths.videoRaw);
parseVideo(allVideos);