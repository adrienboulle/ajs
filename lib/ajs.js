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
require("reflect-metadata");
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
var ElementRef = require('./lib/api').ElementRef;
var DOCUMENT = require('./lib/api').DOCUMENT;
var BINDING = /\{\{(.*?)\}\}/;
var getArgs = function (cls, context) {
    return (Reflect
        .getMetadata('design:paramtypes', cls) || [])
        .map(function (param) {
        var returned;
        if (context.serviceMap.has(param)) {
            var S = param;
            if (S === ElementRef) {
                returned = new ElementRef(context.node);
            }
            else if (S === DOCUMENT) {
                returned = context.document;
            }
            else if (typeof S === 'function') {
                returned = new (S.bind.apply(S, [void 0].concat(getArgs(S, context))))();
            }
            return returned;
        }
    });
};
var processValue = function (root, path) {
    path = path.split('.');
    var val = root[path.shift()];
    while (path.length && val && (val[path[0]] || typeof val[path[0]] === 'string')) {
        val = val[path.shift()];
    }
    return val.toString();
};
var compile = function (context) {
    var componentsMap = context.componentsMap;
    var node = context.node;
    var newInstance;
    switch (node.nodeType) {
        case 1:
            if (componentsMap.has(node.tagName.toLowerCase())) {
                var classVal = componentsMap.get(node.tagName.toLowerCase());
                var meta = Reflect.getMetadata('annotations', classVal);
                node.innerHTML = meta.template;
                newInstance = new (classVal.bind.apply(classVal, [void 0].concat(getArgs(classVal, context))))();
                if (meta.inputs && meta.inputs.length) {
                    for (var _i = 0, _a = meta.inputs; _i < _a.length; _i++) {
                        var input = _a[_i];
                        newInstance[input] = context.instance ? context.instance[input] : null;
                    }
                }
                if (meta.outputs && meta.outputs.length) {
                    var _loop_1 = function (output) {
                        newInstance[output] = function (val) {
                            var instance = context.instance;
                            if (instance && context.instance[output]) {
                                context.instance[output](val);
                            }
                        };
                    };
                    for (var _b = 0, _c = meta.outputs; _b < _c.length; _b++) {
                        var output = _c[_b];
                        _loop_1(output);
                    }
                }
                if (typeof newInstance.onInit === 'function') {
                    newInstance.onInit();
                }
            }
            else {
                var innerText = node.getAttribute('ajs-innertext');
                if (innerText) {
                    var val = processValue(context.instance, innerText);
                    node.innerText = typeof val === 'string' ? val : innerText;
                }
            }
            break;
        case 3:
            var processed = void 0;
            var remaining = node.data;
            var match = remaining.match(BINDING);
            var strBefore = void 0;
            while (match) {
                processed = processed || [];
                strBefore = remaining.substring(0, match.index + match[0].length);
                remaining = remaining.substring(match.index + match[0].length);
                processed.push(strBefore.replace(match[0], processValue(context.instance, match[1].trim())));
                match = remaining.match(BINDING);
            }
            node.data = processed ? processed.join() : node.data;
            break;
    }
    node.childNodes.forEach(function (childNode) {
        compile(Object.assign({}, context, { node: childNode, instance: newInstance || context.instance }));
    });
};
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
var bootstrap = function (app) {
    var serviceMap = new Map();
    var componentsMap = new Map();
    for (var _i = 0, _a = app.components; _i < _a.length; _i++) {
        var cmp = _a[_i];
        var meta = Reflect.getMetadata('annotations', cmp);
        componentsMap.set(meta.selector, cmp);
    }
    for (var _b = 0, _c = app.services; _b < _c.length; _b++) {
        var service = _c[_b];
        serviceMap.set(service, true);
    }
    serviceMap.set(ElementRef, true);
    serviceMap.set(DOCUMENT, true);
    var window = domino.createWindow(app.doc);
    var document = window.document;
    var root = document.querySelector('app');
    return new Promise(function (resolve, reject) {
        // We run the compilation inside a Zone context in order to wait for all the async task to be finished before
        // invoking the express callback
        Zone.current
            .fork({
            onHasTask: function (parentZoneDelegate, currentZone, targetZone, hasTaskState) {
                if (!hasTaskState.macroTask && !hasTaskState.microTask) {
                    resolve(document.innerHTML);
                }
            },
            onHandleError: function (parentZoneDelegate, currentZone, targetZone, error) {
                reject(error);
            },
        })
            .run(function () { return setTimeout(function () { return compile({ node: root, document: document, serviceMap: serviceMap, componentsMap: componentsMap }); }); });
    });
};
module.exports.__express = (function (toCompile) {
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
                app = require(__dirname + '/../../' + path);
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
                            f = require(__dirname + '/../../' + pathRoot + file);
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
            bootstrap(app)
                .then(function (response) { return callback(null, response); })
                .catch(function (err) { return callback(err); });
        });
    };
})(true);
//# sourceMappingURL=ajs.js.map