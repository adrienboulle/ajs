"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
var api_1 = require("./api");
var BINDING = /\{\{(.*?)\}\}/;
var getArgs = function (cls, context) {
    return (Reflect
        .getMetadata('design:paramtypes', cls) || [])
        .map(function (param) {
        var returned;
        if (context.serviceMap.has(param)) {
            var S = param;
            if (S === api_1.ElementRef) {
                returned = new api_1.ElementRef(context.node);
            }
            else if (S === api_1.DOCUMENT) {
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
    return val ? val.toString() : '';
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
                        var splited = input.split(':');
                        var from = splited[0];
                        var to = splited[1];
                        newInstance[to] = context.instance ? context.instance[from] : null;
                    }
                }
                if (meta.outputs && meta.outputs.length) {
                    var _loop_1 = function (output) {
                        var splited = output.split(':');
                        var from = splited[0];
                        var to = splited[1];
                        newInstance[to] = function (val) {
                            var instance = context.instance;
                            if (instance && context.instance[from]) {
                                context.instance[from](val);
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
exports.bootstrap = function (app) {
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
    serviceMap.set(api_1.ElementRef, true);
    serviceMap.set(api_1.DOCUMENT, true);
    var window = app.window;
    var document = window.document;
    var root = document.querySelector('app');
    if (app.clear) {
        while (root.hasChildNodes()) {
            root.removeChild(root.firstChild);
        }
    }
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
//# sourceMappingURL=bootstrap.js.map