# requirejs-less

LESS stylesheet loader plugin for RequireJS.


## Features

* Load LESS stylesheets using RequireJS.
* Inline compiled LESS stylesheets during r.js optimization (NodeJS only).
* MD5-fingerprint CSS assets referenced in your LESS stylesheets (NodeJS only).


## Installation

Copy the `style.js` script into your RequireJS `baseURL`. You can also install requirejs-less using [bower](http://bower.io/):

``` bash
$ bower install requirejs-less
```


## Usage

LESS stylesheets should be stored in a directory named `less`, at a relative path of `../less` to your `baseURL`.
A recommended directory structure is as follows:

```
www
 |-- js
 |   |-- less.js
 |   |-- style.js
 |   +-- main.js
 |
 +-- less
     +-- main.less
```

Load LESS stylesheets in your RequireJS modules:

``` js
define([
    // Load a named LESS stylesheet.
    "style!main.less"
], function() {
    
    // Do something!

});
```


## Configuration

Configure requirejs-less using the RequireJS config options:

``` js
require.config({
    config: {
        style: {
            path: "../less/",
            rootPath: "../less/",
            fingerprintUrls: false,
            fingerprintFiles: true
        }
    }
})
```

* **path** - The relative path to LESS stylesheets on the filesystem. This should be relative to `baseURL`.
* **rootPath** - The path to where LESS stylesheets are stored on the server. If relative, it will be taken relative to `baseURL`.
* **fingerprintUrls** - Set to `true` to append MD5 fingerprints to the URLs of static asset urls in your LESS stylesheets (Default `false`).
* **fingerprintWrite** - Set to `true` to write a copy of fingerprinted files to their hashed name to the filesystem. (Default `true`, set to false if your build system already writes MD5-hashed files.)

**Important** - If your LESS files contain relative urls, you must set `rootPath` to an absolute URL
in your build profile order to run r.js. Otherwise, r.js will be unable to resolve relative URLS during the build.
For example:

``` js
({
    appDir: "./static/js/",
    baseUrl: "./",
    config: {
        style: {
            rootPath: "/static/css/"
        }
    }
})
```


## How it works

The `style.js` loader plugin uses LESS to compile stylesheets in the browser, injecting the
compiled CSS as &lt;style&gt; tags in the head of your document.

When the r.js optimizer is run, LESS stylesheets loaded in your RequireJS modules are compiled
and inlined into the built file, avoiding additional network requests in production.


## Support and announcements

The requirejs-less project was developed by Dave Hall. You can get the code
from the [requirejs-less project site](http://github.com/etianen/requirejs-less).


## More information
    
Dave Hall is a web developer, based in Cambridge, UK. You can usually
find him on the Internet in a number of different places:

*   [Website](http://www.etianen.com/ "Dave Hall's homepage")
*   [Twitter](http://twitter.com/etianen "Dave Hall on Twitter")
*   [Google Profile](http://www.google.com/profiles/david.etianen "Dave Hall's Google profile")
