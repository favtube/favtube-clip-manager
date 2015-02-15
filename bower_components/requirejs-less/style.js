/**
 * LESS stylesheet loader plugin for RequireJS.
 *
 * Copyright (c) 2014, David Hall.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 * 
 *     1. Redistributions of source code must retain the above copyright notice, 
 *        this list of conditions and the following disclaimer.
 *     
 *     2. Redistributions in binary form must reproduce the above copyright 
 *        notice, this list of conditions and the following disclaimer in the
 *        documentation and/or other materials provided with the distribution.
 * 
 *     3. Neither the name of David Hall nor the names of its contributors may be
 *        used to endorse or promote products derived from this software without
 *        specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
 * ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

define([
    "module",
    "text"
], function(
    module,
    text
) {

    "use strict";

    var moduleConfig = module.config();
    var lessPath = moduleConfig.path || "../less/";
    var fingerprintUrls = moduleConfig.fingerprintUrls || false;
    var fingerprintFiles = moduleConfig.fingerprintFiles || false;

    var buildMap = {};

    var style = {

        _compile: function(less, url, contents, parseConfig, outputConfig, onError, onSuccess) {
            // Create the parser.
            parseConfig.filename = url;
            var parser = new (less.Parser)(parseConfig);
            // Run the parser.
            parser.parse(contents, function(err, tree) {
                if (err) {
                    onError(new Error("LESS parse error in " + err.filename +  " on line " + err.line + ", column " + err.column + ": " + err.message));
                } else {
                    try {
                        var css = tree.toCSS(outputConfig);
                        onSuccess(css);
                    } catch(ex) {
                        onError(ex);
                    }
                }
            });
        },

        _injectCSS: function(css) {
            var style = document.createElement("style");
            style.appendChild(document.createTextNode(css));
            document.head.appendChild(style);
        },

        _build: function(name, onload) {
            var lessUrl = require.toUrl(lessPath);
            var rootUrl = require.toUrl(moduleConfig.rootPath || lessPath);
            // Perform an optimizing build.
            var less = require.nodeRequire("less");
            var crypto = require.nodeRequire("crypto");
            var fs = require.nodeRequire("fs");
            var urllib = require.nodeRequire("url");
            var pathlib = require.nodeRequire("path");
            // Load the contents.
            var url = pathlib.join(lessUrl, name);
            var contents = fs.readFileSync(url, encoding="utf-8");
            // Compile the LESS.
            style._compile(less, url, contents, {
                syncImport: true,
                env: "production",
                paths: [lessUrl]
            }, {
                compress: true
            }, onload.error, function(css) {
                // Fingerprint URLs.
                css = css.replace(/(url\(['"]?\s*)(.*?)(["']?\))/gi, function(_, start, assetUrl, end) {
                    var originalAssetUrl = assetUrl;
                    // MD5 fingerprint the file.
                    if (moduleConfig.fingerprintUrls) {
                        var pathname = path.join(lessUrl, assetUrl);
                        if (fs.existsSync(pathname)) {
                            var assetContents = fs.readFileSync(pathname);
                            var hash = crypto.createHash("md5");
                            hash.update(assetContents);
                            var hashStr = hash.digest("hex").substring(0, 12);
                            // Create the hashed name.
                            var extension = pathlib.extname(assetUrl);
                            var basename = pathlib.basename(assetUrl, extension);
                            var dirname = pathlib.dirname(assetUrl);
                            assetUrl = pathlib.join(dirname, basename + "." + hashStr + extension);
                            // Save the new file.
                            var hashedPathname = path.join(lessUrl, assetUrl);
                            if (fingerprintFiles && !fs.existsSync(hashedPathname)) {
                                fs.writeFileSync(hashedPathname, assetContents);
                            }
                        }
                    }
                    // Make the path name absolute;
                    var assetPath = urllib.resolve(lessUrl, assetUrl);
                    assetUrl = urllib.resolve(rootUrl, assetUrl);
                    if (assetUrl == assetPath) {
                        throw new Error("Cannot resolve " + originalAssetUrl + ". Please configure rootPath to be an absolute URL.");
                    }
                    // All done!
                    return start + assetUrl + end;
                });
                // Store the generated CSS.
                buildMap[name] = css;
                onload(css);
            });
        },

        _load: function(name, onload) {
            var lessUrl = require.toUrl(lessPath);
            var rootUrl = require.toUrl(moduleConfig.rootPath || lessPath);
            // Perform an in-browser build.
            var url = lessUrl + name;
            require(["less"], function(less, contents) {
                text.get(url, function(contents) {
                    style._compile(less, url, contents, {
                        env: "development",
                        paths: [lessUrl],
                        rootpath: rootUrl
                    }, {}, onload.error, function(css) {
                        style._injectCSS(css);
                        onload(css);
                    });
                });
            });
        },

        load: function(name, parentRequire, onload, config) {
            if (config.isBuild) {
                style._build(name, onload);
            } else {
                style._load(name, onload);
            }
        },

        write: function (pluginName, moduleName, write) {
            if (moduleName in buildMap) {
                write("define('" + pluginName + "!" + moduleName  + "', ['" + pluginName + "'], function (style) { return style._injectCSS('" + text.jsEscape(buildMap[moduleName]) + "');});\n");
            }
        }

    };

    return style;

});
