var favtubeControllers = angular.module('favtubeControllers', []);

var keymap = {
    'backspace': '8',
    'tab': '9',
    'enter': '13',
    'shift': '16',
    'ctrl': '17',
    'left_meta': 91,
    'right_meta': 93,
    'alt': '18',
    'pause_break': '19',
    'caps_lock': '20',
    'escape': '27',
    'page_up': '33',
    'page down': '34',
    'end': '35',
    'home': '36',
    'left_arrow': '37',
    'up_arrow': '38',
    'right_arrow': '39',
    'down_arrow': '40',
    'insert': '45',
    'delete': '46',
    'space': 32,
    '0': '48',
    '1': '49',
    '2': '50',
    '3': '51',
    '4': '52',
    '5': '53',
    '6': '54',
    '7': '55',
    '8': '56',
    '9': '57',
    'a': '65',
    'b': '66',
    'c': '67',
    'd': '68',
    'e': '69',
    'f': '70',
    'g': '71',
    'h': '72',
    'i': '73',
    'j': '74',
    'k': '75',
    'l': '76',
    'm': '77',
    'n': '78',
    'o': '79',
    'p': '80',
    'q': '81',
    'r': '82',
    's': '83',
    't': '84',
    'u': '85',
    'v': '86',
    'w': '87',
    'x': '88',
    'y': '89',
    'z': '90',
    'left_window key': '91',
    'right_window key': '92',
    'select_key': '93',
    'numpad 0': '96',
    'numpad 1': '97',
    'numpad 2': '98',
    'numpad 3': '99',
    'numpad 4': '100',
    'numpad 5': '101',
    'numpad 6': '102',
    'numpad 7': '103',
    'numpad 8': '104',
    'numpad 9': '105',
    'multiply': '106',
    'add': '107',
    'subtract': '109',
    'decimal point': '110',
    'divide': '111',
    'f1': '112',
    'f2': '113',
    'f3': '114',
    'f4': '115',
    'f5': '116',
    'f6': '117',
    'f7': '118',
    'f8': '119',
    'f9': '120',
    'f10': '121',
    'f11': '122',
    'f12': '123',
    'num_lock': '144',
    'scroll_lock': '145',
    'semi_colon': '186',
    'equal_sign': '187',
    'comma': '188',
    'dash': '189',
    'period': '190',
    'forward_slash': '191',
    'grave_accent': '192',
    'open_bracket': '219',
    'backslash': '220',
    'closebracket': '221',
    'single_quote': '222'
};

favtubeControllers.controller('favtubePlayerCtrl',
    ['$scope', '$http', '$routeParams', '$location',
        function ($scope, $http, $routeParams, $location) {
            var idSeq = 0;

            $scope.random = [];
            loadMoreClips(null);

            $scope.getImageUrl = function (video, seq) {
                return '/videos/' + video + '/image/' + seq + '.jpg';
            }

            $scope.getClipUrl = function (video, seq) {
                return '/videos/' + video + '/clip/' + seq + '.mp4';
            }

            function getClipElem(clip) {
                var $clip = $('#clip-list .clip[cid="' + clip.id + '"]')
                return $clip.length ? $clip : $('#clip-list .clip[video="' + clip.video + '"][seq="' + clip.seq + '"]');
            }

            var navTo = _.throttle(function navTo(direction) {
                var selected = $scope.selected;
                var $clip = getClipElem(selected);
//            console.log($clip);

                if ($clip.is(':visible')) {
                    if (direction == 'next') {
                        var $next = $clip.next();
                    } else {
                        $next = $clip.prev();
                    }
                } else {
                    $next = $('#clip-list .clip').eq(0);
                }
                if ($next.length) {
                    $next.click();
                } else {
                    if ($scope.mode == 'story') {
                        if (direction == 'next') {
                            $next = $('#clip-list .clip').eq(0);
                        } else {
                            $next = $('#clip-list .clip').eq(-1);
                        }
                        $next.click();
                    } else {
                        loadMoreClips(function () {
                            setTimeout(function () {
                                if (direction == 'next') {
                                    var $next = $clip.next();
                                } else {
                                    $next = $('#clip-list .clip').eq(-1);
                                }
                                $next.click();
                            }, 0);
                        });
                    }

                }
            }, 600, {trailing: true});

            function loadMoreClips(cb, initCall) {
                $http.post('/ajax/random', {
                    bookmark: $scope.isFilterStar
                })
                    .success(function (data) {
                        _.each(data, function (clip) {
                            clip.id = idSeq++
                        });

                        if (!initCall) {
                            $scope.random = $scope.random.concat(data);
                            var maxLen = 120;
                            if ($scope.random.length > maxLen) {
                                var $clips = $('#clip-list .clip');
                                var height = $clips.eq(0).outerHeight() +
                                    $clips.eq(1).outerHeight(true) * ($scope.random.length - maxLen - 1);
                                var $content = $('#clip-list .list-content');
                                var scrollTop = $content.scrollTop();
                                $content.scrollTop(scrollTop - height);
                                $scope.random.splice(0, $scope.random.length - maxLen);
                            }
                            $scope.clips = $scope.random;
                        }

                        cb && cb(data);
                    });
            }

            var userScrollTimer = null;
            $scope.userScroll = function (value) {
                $scope.isScrolling = value;
                clearTimeout(userScrollTimer);

                if (!value) return;
                userScrollTimer = setTimeout(function () {
                    $scope.isScrolling = false;
                }, 5000);
            }

            $scope.clickPlay = function (clip) {
                // need to revisit this later
//            $scope.userScroll(false);
                $scope.playClip(clip);
            }

            $scope.playClip = function (clip) {
                $scope.selected = clip;

                var clipUrl = this.getClipUrl(clip.video, clip.seq);

                $scope.playerUrl = clipUrl;
                _.each($scope.clips, function (c) {
                    c.selected = false
                });
                clip.selected = true;

                var jvideo = $('#player video');
                setTimeout(function () {
                    jvideo[0].play();
                }, 0);

                // scroll to the playing list
                // however, avoid scrolling if the user is scrolling
                if (!$scope.isScrolling) {
                    var $clip = getClipElem(clip);
                    var $list = $('#clip-list .list-content');
                    var scrollTop = $clip.position().top - 200 + $list.scrollTop();
                    $list.animate({
                        scrollTop: scrollTop
                    }, 200);
                }
            }

            $scope.toggleFav = function ($e, clip) {
                $e && $e.stopPropagation();

                $http.post('/ajax/toggle-fav', {
                    video: clip.video,
                    seq: clip.seq,
                    bookmark: !clip.bookmark
                })
                    .success(function () {
                        clip.bookmark = !clip.bookmark;
                    });
            }


            $scope.toggleFilterStar = function ($e) {
                var val = $scope.isFilterStar;
                $scope.isFilterStar = !val;

                loadMoreClips(function (data) {
                    $scope.random = data;

                    if ($scope.mode != 'story') {
                        $scope.clips = $scope.random;
                    }
                }, true)

            }

            $scope.toggleModeFromClip = function ($e, clip) {
                if ($scope.mode == 'random')
                    $scope.selected = clip;
                $scope.toggleMode();
                $e.stopPropagation();
            }

            $scope.toggleMode = function (type, video) {
                if (type && type == $scope.mode) return;

                var $content = $('#clip-list .list-content');
                if (($scope.selected || video || $routeParams.video) && $scope.mode != 'story') {
                    $scope.mode = 'story';
                    var selected = $scope.originSelected = $scope.selected;

                    $http.post('/ajax/story', {
                        video: video || ($scope.selected && $scope.selected.video) || $routeParams.video
                    }).success(function (data) {
                        $scope.clips = data;

                        if (!$scope.selected) return;
                        setTimeout(function () {
                            $scope.userScroll(false);
                            var $clip = getClipElem(selected);
                            $clip.click();
                        });
                    });
                } else {
                    _.extend($scope.originSelected, $scope.selected);
                    $scope.clips = $scope.random;
                    $scope.mode = 'random';

                    $content.scrollTop(0);
                    $scope.$apply();
                    setTimeout(function () {
                        $scope.userScroll(false);

                        if (!$scope.originSelected) return;
                        var $clip = getClipElem($scope.originSelected);
                        $clip.click();
                    });
                }
            }

            $(function () {
                var $content = $('#clip-list .list-content')
                    .off()
                    .on('scroll', function () {
                        if ($scope.mode != 'story') {
                            var cont = $content[0];
                            if (cont.scrollTop == cont.scrollHeight - cont.clientHeight) {
                                loadMoreClips();
                            }
                        }
                        $scope.userScroll(true);
                    });

                var autoJump = false;
                var $v = $('#player video'), v = $v[0];

                var jumpPlay = _.throttle(function (direction) {
                    var curr = $v[0].currentTime;
                    var interval = 5;

                    if (direction == 'forward') {
                        $v[0].currentTime = curr + interval;
                    } else if (direction == 'backward') {
                        if (curr - interval / 2 <= 0) {
                            navTo('prev');

                            // NOTE: this logic could be fragile
                            setTimeout(function () {
                                var dur = v.duration;
                                v.currentTime = dur - interval / 2;
                            }, 500);
                        } else {
                            $v[0].currentTime = curr - interval;
                        }
                    }
                }, 200, {
                    trailing: true
                });

                clearInterval($(document).data('auto-jumper'));

                $scope.clipLoaded = function() {
                    v.playbackRate = $scope.playbackRate;
                }
                $scope.playbackRate = 1;

                $(document).data('auto-jumper', setInterval(function() {
                    if (autoJump) jumpPlay('forward');
                }, 5000));

                $(document)
                    .off()
                    .on('keydown', function (e) {


                    if (e.keyCode == keymap.space) {
                        $v[0].paused ? $v[0].play() : $v[0].pause();
                        e.preventDefault();
                        e.stopImmediatePropagation();
                    } else if (e.keyCode == keymap.up_arrow) {
                        $scope.userScroll(false);
                        navTo('prev');
                    } else if (e.keyCode == keymap.down_arrow) {
                        $scope.userScroll(false);
                        navTo('next');
                    } else if (e.keyCode == keymap.right_arrow) {
                        jumpPlay('forward');
                    } else if (e.keyCode == keymap.left_arrow) {
                        jumpPlay('backward');
                    } else if (e.keyCode == keymap.period) {
                        $scope.playbackRate = v.playbackRate += 0.2;
                        $scope.$apply();
                    } else if (e.keyCode == keymap.comma) {
                        $scope.playbackRate = v.playbackRate -= 0.2;
                        $scope.$apply();
                    } else if (e.keyCode == keymap.m) {
                        $scope.playbackRate = v.playbackRate = 1;
                        $scope.$apply();
                    }
                })
                    .on('keyup', function (e) {
                        if (e.keyCode == keymap.ctrl || e.keyCode == keymap.left_meta || e.keyCode == keymap.right_meta
                            || e.keyCode == keymap.alt) {
                            $scope.toggleMode();
                        } else if (e.keyCode == keymap.forward_slash || e.keyCode == keymap.f) {
                            $scope.toggleFav(null, $scope.selected);
                        } else if (e.keyCode == keymap.p) {
                            autoJump = !autoJump;
                            if (autoJump) jumpPlay('forward');
                        }
                    });

                $('#player video')
                    .off()
                    .on('ended', function() {
                    navTo('next');
                }).on('timeupdate', _.throttle(function() {
                        this.playbackRate = $scope.playbackRate;
                    }, 500));

            });

            // rewrite to the video
            setTimeout(function () {
                if ($routeParams.video) {
                    $scope.selected = {
                        video: $routeParams.video,
                        seq: $routeParams.seq
                    }
                    $scope.toggleMode('story', $routeParams.video);
                }
            });

        }]);

favtubeControllers.controller('favtubeStreamCtrl',

    ['$scope', '$http', '$routeParams', '$location',
        function ($scope, $http, $routeParams, $location) {

            var idSeq = 0;

            var type = $routeParams.type;
            var config = $routeParams.config;


            $scope.getLargeImageUrl = function (video, seq) {
                return '/videos/' + video + '/image/' + seq + '.large.jpg';
            }

            $scope.getClipUrl = function (video, seq) {
                return '/videos/' + video + '/clip/' + seq + '.mp4#' + idSeq;
            }

            var configData;
            function loadMoreClips(cb) {
                var randomClip = function() {
                    $http.post('/ajax/random', {
                        bookmark: type == 'fav',
                        videos: configData.videos
                    })
                    .success(function (data) {
                        _.each(data, function (clip) {
                            clip.id = idSeq++
                        });

                        cb && cb(data);
                    });
                }
                if (config && !configData) {
                    $http.get('/static/config/' + config)
                        .success(function(data) {
                            configData = data;

                            randomClip();
                        });

                } else {
                    randomClip();
                }
            }

        // visible section

            // cached section

            // invisible section

        loadMoreClips(function(data) {
            $scope.clips = data;

            setTimeout(function() {
                checkClipStatus();
                $(window)
                    .scrollTop(1);
            }, 200);
        });

            var isLoading = false;
            var checkClipStatus = _.throttle(function() {
                var scrollTop = $(window).scrollTop(),
                    windowHeight = $(window).height();
                var voiceClipCount = 0;

                var vheight;
                $('video').each(function() {
                    var $v = $(this), v = this;
                    var vtop = $v.position().top;
                    vheight = $v.outerHeight();
//                    console.log(vtop, scrollTop - vheight, vtop + vheight, windowHeight + scrollTop, 'h', windowHeight);

                    if (vtop >= scrollTop - 10 && voiceClipCount++ < 2) {
                        if (!$v.attr('src'))  {
                            $v.attr('src', $v.attr('ng-src'));
                            v.load();
                        }
                        if (v.paused) v.play();
                        $v.on('canplay.stream', function() {
                            v.play();
                            $v.css('opacity', '')
                        });

                        v.volume = 1; //(3 - voiceClipCount) * 0.5;
                        $v.parent().css('opacity', 1);
                    } else {
                        v.pause();
                        v.src = '';
                        $v.off('canplay.stream')
                            .css('opacity', 0);
                        v.volume = 0;
                        $v.parent().css('opacity', '');
                    }
                });


                if (!isLoading && scrollTop > document.body.scrollHeight - 2 * windowHeight) {
                    loadMoreClips(function(data) {
                        $scope.clips = $scope.clips.concat(data);

                        var $videos = $('video');

                        if ($scope.clips.length > 60) {
                            var removed = $scope.clips.length - 60;
                            for (var i = 0; i < removed; i++) {
                                $videos[i].pause();
                            }
                            $scope.clips.splice(0, removed);
                            $(window).scrollTop(scrollTop - removed / 2 * vheight);
                        }
                        isLoading = false;
                    });
                    isLoading = true;
                }
            }, 500, {
                trailing: true
            });

            $(window)
                .scroll(checkClipStatus);

            $(document)
                .keydown(function(e) {
                    if (e.keyCode == keymap.space) {
                        e.preventDefault();
                        $('body').animate({
                            scrollTop: $(window).scrollTop() +  $(window).height() / 2.5
                        }, 200)
                    }
                });
}]);


favtubeControllers.controller('favtubePickCtrl',

    ['$scope', '$http', '$routeParams', '$location',
        function ($scope, $http, $routeParams, $location) {

            var idSeq = 0;

            var type = $routeParams.type;
            var page = $routeParams.page ? $routeParams.page : 0;

            angular.element('#page').addClass('subclips');

            $scope.getLargeImageUrl = function (video, subclip) {
                return '/videos/' + video + '/subimages/' + subclip + '.jpg';
            }

            $scope.getClipUrl = function (video, subclip) {
                return '/videos/' + video + '/subclips/' + subclip + '.mp4';
            }

            $http.post('/ajax/subclips', {
                video: $routeParams.video,
                page: page
            })
                .success(function (data) {
                    data.forEach(function(subclip) {
                        subclip.clip = subclip.subclip.substr(0, 4);
                    });

                    $scope.clips = data;

                    setTimeout(function() {
                        checkClipStatus();
                        $(window)
                            .scrollTop(1);
                    }, 200);
                });

            var allClips;
            var checkClipStatus = _.throttle(function() {
                if (!allClips) allClips = $('.clip');
                if (!thisClip) thisClip = allClips.eq(0);


                var processNext = function(clip, direction, step, callback) {
                    if (!step) return;
                    if (direction == 'next') {
                        var next = clip.next();
                    } else {
                        var next = clip.prev();
                    }
                    if (!next.length) return;

                    if (next.is('.clip')) {
                        callback(next);
                        step --;
                    }
                    processNext(next, direction, step, callback);
                }

                var clipsToPlay = [];
                clipsToPlay.push(thisClip.get(0));
                processNext(thisClip, 'next', 1, function(next) {
                    clipsToPlay.push(next.get(0));
                });
                processNext(thisClip, 'prev', 0, function(next) {
                    clipsToPlay.push(next.get(0));
                });

                allClips.each(function() {
                    var v = $(this).find('video').get(0),
                        $v = $(v), $poster = $(this).find('.poster');
                    if (clipsToPlay.indexOf(this) == -1) {
                        $(this)
                            .find('video')
                            .off('canplay.stream')
                            .attr('src', '');

                        $poster.removeClass('hide');
                        if (!v.paused) {
                            v.pause();
                        }
                    } else {
                        if (!$v.attr('src')) {
                            $v.attr('src', $v.attr('ng-src'));
                            v.load();
                        }
                        if (v.paused) v.play();
                        $v.on('canplay.stream', function() {
                            v.play();

                            $poster.addClass('hide');

                            $v.off('timeupdate.stream')
                                .on('timeupdate.stream', _.throttle(function() {
                                var pos = v.currentTime;
                                var dur = v.duration;

                                var delta = pos + 0.5 - v.duration;
                                if (delta > 0) {
                                    if (!$v.data('set-image')) {
                                        console.log('bigger');
                                        $v.data('set-image', true);
                                        $poster.removeClass('hide');
                                    }
                                } else if ($v.data('set-image') !== false) {
                                    $v.data('set-image', false);
                                    $poster.addClass('hide');
                                }
                            }, 20));

                            if (this == thisClip.find('video').get(0)) {
                                console.log('this set to 1 - ', thisClip.data('index'));
                                v.volume = 1;
                            } else {
                                v.volume = 0.1;
                            }
                            $v.off('canplay.stream');
                        });

                    }
                });

            }, 500, {
                trailing: true
            });

            var thisClip = null;

            $(window)
                .scroll(checkClipStatus);

            $(document)
                .on('mouseenter', '.clip', function() {
                    thisClip = $(this);

                    checkClipStatus();
                })
                .on('mouseenter', '.clip', function() {
                    $(this).focus();
                })
                .on('keydown', '.clip', function(e) {
                    var  $t = $(this), idx = $t.data('index');
                    var clip = $scope.clips[idx], prevClip = $scope.clips[idx - 1];

                    switch ('' + e.keyCode) {
                        case keymap.f:
                            clip.info.chosen = true;
                            clip.info.linkNext = !clip.info.linkNext;

                            $http.post('/ajax/writeSubclipInfo', {
                                clip: clip
                            });
                            $scope.$apply();
                            break;
                        case keymap.s:
                            if (prevClip) {
                                prevClip.info.chosen = true;
                                prevClip.info.linkNext = !prevClip.info.linkNext;

                                $http.post('/ajax/writeSubclipInfo', {
                                    clip: prevClip
                                });
                                $scope.$apply();
                            }
                            break;
                        case keymap.d:
                            clip.info.chosen = !clip.info.chosen;

                            $http.post('/ajax/writeSubclipInfo', {
                                clip: clip
                            });
                            $scope.$apply();
                            break;
                    }
                })
                .keydown(function(e) {
                    if (e.keyCode == keymap.space) {
                        e.preventDefault();
                        $('body').animate({
                            scrollTop: $(window).scrollTop() +  $(window).height() / 2.5
                        }, 200)
                    } else if (e.keyCode == keymap.right_arrow || e.keyCode == keymap['2']) {
                        location.hash = '/pick/' + $routeParams.video + '/' + (Number(page) + 1);
                        location.reload();

                    } else if (e.keyCode == keymap.left_arrow || e.keyCode == keymap['1']) {
                        var newPage = Number(page) - 1;
                        newPage = newPage < 0 ? 0 : newPage;
                        location.hash = '/pick/' + $routeParams.video + '/' + newPage;
                        location.reload();
                    }
                });
        }]);

favtubeControllers.controller('favtubeRemoveCtrl',
    ['$scope', '$http', '$routeParams', '$location',
        function ($scope, $http, $routeParams, $location) {

            var idSeq = 0;

            var type = $routeParams.type;
            var page = $routeParams.page ? $routeParams.page : 0;

            angular.element('#page').addClass('remove-clips');

            $scope.getLargeImageUrl = function (video, clip) {
                return '/videos/' + video + '/image/' + clip + '.large.jpg';
            }

            $scope.getClipUrl = function (video, clip) {
                return '/videos/' + video + '/clip/' + clip + '.mp4';
            }

            $http.post('/ajax/story', {
                video: $routeParams.video
            })
                .success(function (data) {
                    data.forEach(function(subclip) {
                        subclip.subclip = subclip.clip = subclip.seq;
                    });

                    $scope.clips = data;

                    setTimeout(function() {
                        checkClipStatus();
                        $(window)
                            .scrollTop(1);
                    }, 200);
                });

            var allClips;
            var checkClipStatus = _.throttle(function() {
                if (!allClips) allClips = $('.clip');
                if (!thisClip) thisClip = allClips.eq(0);


                var processNext = function(clip, direction, step, callback) {
                    if (!step) return;
                    if (direction == 'next') {
                        var next = clip.next();
                    } else {
                        var next = clip.prev();
                    }
                    if (!next.length) return;

                    if (next.is('.clip')) {
                        callback(next);
                        step --;
                    }
                    processNext(next, direction, step, callback);
                }

                var clipsToPlay = [];
                clipsToPlay.push(thisClip.get(0));
                processNext(thisClip, 'next', 0, function(next) {
                    clipsToPlay.push(next.get(0));
                });
                processNext(thisClip, 'prev', 0, function(next) {
                    clipsToPlay.push(next.get(0));
                });

                allClips.each(function() {
                    var v = $(this).find('video').get(0),
                        $v = $(v), $poster = $(this).find('.poster');
                    if (clipsToPlay.indexOf(this) == -1) {
                        $(this)
                            .find('video')
                            .off('canplay.stream')
                            .attr('src', '');

                        $poster.removeClass('hide');
                        if (!v.paused) {
                            v.pause();
                        }
                    } else {
                        if (!$v.attr('src')) {
                            $v.attr('src', $v.attr('ng-src'));
                            v.load();
                        }
                        if (v.paused) v.play();
                        $v.on('canplay.stream', function() {
                            v.play();

                            $poster.addClass('hide');

                            $v.off('timeupdate.stream')
                                .on('timeupdate.stream', _.throttle(function() {
                                    var pos = v.currentTime;
                                    var dur = v.duration;

                                    var delta = pos + 0.5 - v.duration;
                                    if (delta > 0) {
                                        if (!$v.data('set-image')) {
                                            console.log('bigger');
                                            $v.data('set-image', true);
                                            $poster.removeClass('hide');
                                        }
                                    } else if ($v.data('set-image') !== false) {
                                        $v.data('set-image', false);
                                        $poster.addClass('hide');
                                    }
                                }, 20));

                            if (this == thisClip.find('video').get(0)) {
                                console.log('this set to 1 - ', thisClip.data('index'));
                                v.volume = 1;
                            } else {
                                v.volume = 0.1;
                            }
                            $v.off('canplay.stream');
                        });

                    }
                });

            }, 500, {
                trailing: true
            });

            var thisClip = null;

            $(window)
                .scroll(checkClipStatus);


            var $prevSelected = null, $allClips = $('.clip');
            $(document)
                .on('mouseenter', '.clip', function() {
                    thisClip = $(this);

                    checkClipStatus();
                })
                .on('mouseenter', '.clip', function() {
                    $(this).focus();
                })
                .on('keydown', '.clip', function(e) {
                    var  $t = $(this), idx = $t.data('index');
                    var clip = $scope.clips[idx], prevClip = $scope.clips[idx - 1];

                    switch ('' + e.keyCode) {
                        // start selection
                        case keymap.s:
                            _.each($scope.clips, function(clip) {clip.info.linkNext = false;});
                            clip.info.linkNext = true;
                            clip.info.chosen = !clip.info.chosen;
                            $prevSelected = $t;

                            $http.post('/ajax/writeClipRemoveInfo', {
                                clip: clip
                            });
                            $scope.$apply();
                            break;
                        // end selection and toggle all in this selection
                        case keymap.f:
                            if (!$prevSelected) return;
                            if ($allClips.index($prevSelected) <= $allClips.index($t)) {
                                var $curr = $prevSelected;

                                while ($curr.length) {
                                    var currClip = $scope.clips[$curr.data('index')];
                                    currClip.info.chosen = !clip.info.chosen
                                    $http.post('/ajax/writeClipRemoveInfo', {
                                        clip: currClip
                                    });
                                    if ($curr[0] == $t[0]) break;
                                    $curr = $curr.next();
                                }
                                $scope.$apply();
                            }

                            break;
                    }
                })
                .keydown(function(e) {
                    if (e.keyCode == keymap.space) {
                        e.preventDefault();
                        $('body').animate({
                            scrollTop: $(window).scrollTop() +  $(window).height() / 2.5
                        }, 200)
                    } else if (e.keyCode == keymap.right_arrow || e.keyCode == keymap['2']) {
                        location.hash = '/pick/' + $routeParams.video + '/' + (Number(page) + 1);
                        location.reload();

                    } else if (e.keyCode == keymap.left_arrow || e.keyCode == keymap['1']) {
                        var newPage = Number(page) - 1;
                        newPage = newPage < 0 ? 0 : newPage;
                        location.hash = '/pick/' + $routeParams.video + '/' + newPage;
                        location.reload();
                    }
                });
        }]);