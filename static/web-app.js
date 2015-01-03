var favtubeApp = angular.module('favtubeApp', [
    'ngRoute',
    'favtubeControllers'
]);

favtubeApp.config(['$routeProvider', function ($routerProvider, $location) {
    $routerProvider
        .when('/v/:video', {
            controller: 'favtubePlayerCtrl',
            templateUrl: '/static/template/player.html'
        })
        .otherwise({
            controller: 'favtubePlayerCtrl',
            templateUrl: '/static/template/player.html'
        });
}]);