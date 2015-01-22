var favtubeApp = angular.module('favtubeApp', [
    'ngRoute',
    'favtubeControllers'
]);

favtubeApp.config(['$routeProvider', function ($routerProvider, $location) {
    $routerProvider
        .when('/stream/random', {
            controller: 'favtubeStreamCtrl',
            templateUrl: '/static/template/stream.html'
        })
        .when('/stream/random/:type', {
            controller: 'favtubeStreamCtrl',
            templateUrl: '/static/template/stream.html'
        })
        .when('/link/:video/:seq', {
            controller: 'favtubePlayerCtrl',
            templateUrl: '/static/template/player.html'
        })
        .when('/link/:video', {
            controller: 'favtubePlayerCtrl',
            templateUrl: '/static/template/player.html'
        })
        .when('/:video', {
            controller: 'favtubePlayerCtrl',
            templateUrl: '/static/template/player.html'
        })
        .otherwise({
            controller: 'favtubePlayerCtrl',
            templateUrl: '/static/template/player.html'
        });
}]);