var favtubeApp = angular.module('favtubeApp', [
    'ngRoute',
    'favtubeControllers'
]);

favtubeApp.config(['$routeProvider', function ($routerProvider, $location) {
    $routerProvider
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