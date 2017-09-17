"use strict";
// tslint:disable:no-require-imports
// tslint:disable:no-var-requires
// tslint:disable:no-invalid-this
// tslint:disable:no-console
Object.defineProperty(exports, "__esModule", { value: true });
var execSync = require('child_process').execSync;
var fs = require('fs');
var domino = require('domino');
var htmlElement = require('domino/lib/htmlelts');
var bootstrap_1 = require("./bootstrap");
Object.defineProperty(htmlElement.HTMLElement.prototype, 'innerText', {
    get: function () {
        var s = '';
        for (var i = 0; i < this.childNodes.length; i++) {
            var child = this.childNodes[i];
            switch (child.nodeType) {
                // TEXT_NODE
                case 3:
                    s += child.data;
                    break;
                default:
                    if (child.tagName && child.tagName.toLowerCase() === 'br') {
                        s += '\n';
                        break;
                    }
                    var it = child.innerText;
                    if (typeof it === 'string') {
                        s += it;
                    }
                    break;
            }
        }
        return s;
    },
    set: function (value) {
        // Remove any existing children of this node
        while (this.hasChildNodes()) {
            this.removeChild(this.firstChild);
        }
        var txt = this.ownerDocument.createTextNode();
        txt.data = value;
        this.appendChild(txt);
    },
});
var compileTs = function () {
    try {
        execSync('./node_modules/.bin/tsc -p ./node_modules/ajs/tsconfig.json', { stdio: [0, 1, 2] });
    }
    catch (e) {
        return -1;
    }
};
var read = function (opts, cb) {
    if (opts.path) {
        fs.readFile(opts.path, function (err, content) {
            cb(err, content);
        });
    }
    else if (opts.content) {
        cb(null, opts.content);
    }
};
// tslint:disable-next-line:variable-name
exports.__express = (function (toCompile) {
    if (toCompile && compileTs() === -1) {
        console.log('ERROR IN AJS TS');
    }
    return function (filePath, options, callback) {
        var callbackBack = callback;
        callback = function (err, val) {
            if (callbackBack) {
                if (err && err.toString) {
                    err = err.toString();
                }
                callbackBack(err, val);
                callbackBack = null;
            }
        };
        if (!global.Zone) {
            require('zone.js/dist/zone-node.js');
        }
        options = options || {};
        if (!options.content) {
            options.path = filePath;
        }
        read(options, function (err, content) {
            if (err) {
                return callback(err);
            }
            var pathRoot = '.tmp/';
            if (options.subPath) {
                pathRoot += options.subPath + '/';
            }
            var path = pathRoot;
            path += 'app.js';
            var app;
            if (fs.existsSync(path)) {
                app = require(__dirname + '/../../../' + path);
            }
            else {
                app = {
                    components: [],
                    services: [],
                };
                for (var _i = 0, _a = fs.readdirSync(pathRoot); _i < _a.length; _i++) {
                    var file = _a[_i];
                    if (fs.lstatSync(pathRoot + '/' + file).isFile()) {
                        var f = void 0;
                        try {
                            f = require(__dirname + '/../../../' + pathRoot + file);
                        }
                        catch (e) {
                            return callback(e);
                        }
                        for (var c in f) {
                            if (f.hasOwnProperty(c)) {
                                if (Reflect.getMetadata('service', f[c]) === true) {
                                    app.services.push(f[c]);
                                }
                                else {
                                    app.components.push(f[c]);
                                }
                            }
                        }
                    }
                }
            }
            app.doc = content.toString();
            bootstrap_1.bootstrap(app)
                .then(function (response) { return callback(null, response); })
                .catch(function (err) { return callback(err); });
        });
    };
})(true);
//# sourceMappingURL=ajs.js.map