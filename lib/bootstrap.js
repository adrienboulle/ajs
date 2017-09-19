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
                    var _loop_1 = function (input) {
                        var splited = input.split(':');
                        var from = splited[0];
                        var to = splited[1];
                        newInstance[to] = context.instance ? context.instance[from] : null;
                        Zone['__onChange'].subscribe(function () {
                            newInstance[to] = context.instance ? context.instance[from] : null;
                        });
                    };
                    for (var _i = 0, _a = meta.inputs; _i < _a.length; _i++) {
                        var input = _a[_i];
                        _loop_1(input);
                    }
                }
                if (meta.outputs && meta.outputs.length) {
                    var _loop_2 = function (output) {
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
                        _loop_2(output);
                    }
                }
                if (typeof newInstance.onInit === 'function') {
                    newInstance.onInit();
                }
            }
            else {
                var innerText_1 = node.getAttribute('ajs-innertext');
                if (innerText_1) {
                    var val_1 = processValue(context.instance, innerText_1);
                    node.innerText = typeof val_1 === 'string' ? val_1 : innerText_1;
                    Zone['__onChange'].subscribe(function () {
                        node.innerText = typeof val_1 === 'string' ? val_1 : innerText_1;
                    });
                    return;
                }
                var model_1 = node.getAttribute('ajs-model');
                if (model_1 && node.tagName.toLowerCase() === 'input') {
                    node.value = context.instance[model_1];
                    node.addEventListener('input', function () {
                        context.instance[model_1] = node.value;
                        Zone['__onChange'].emit();
                    });
                    Zone['__onChange'].subscribe(function (target) {
                        if (target !== node) {
                            node.value = context.instance[model_1];
                        }
                    });
                    return;
                }
            }
            break;
        case 3:
            var bind_1 = function () {
                var processed;
                if (!node['__ajs-data']) {
                    node['__ajs-data'] = node.data;
                }
                var remaining = node['__ajs-data'];
                var match = remaining.match(BINDING);
                var strBefore;
                while (match) {
                    processed = processed || [];
                    strBefore = remaining.substring(0, match.index + match[0].length);
                    remaining = remaining.substring(match.index + match[0].length);
                    processed.push(strBefore.replace(match[0], processValue(context.instance, match[1].trim())));
                    match = remaining.match(BINDING);
                }
                node.data = processed ? processed.join() : node.data;
            };
            bind_1();
            Zone['__onChange'].subscribe(function () {
                bind_1();
            });
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
        var OnChange = /** @class */ (function () {
            function OnChange() {
                this._subscribers = [];
            }
            OnChange.prototype.subscribe = function (fnc) {
                this._subscribers.push(fnc);
            };
            OnChange.prototype.emit = function () {
                for (var _i = 0, _a = this._subscribers; _i < _a.length; _i++) {
                    var s = _a[_i];
                    s();
                }
            };
            return OnChange;
        }());
        Zone['__onChange'] = new OnChange();
        Zone.current
            .fork({
            onInvokeTask: function (delegate, current, target, task, applyThis, applyArgs) {
                delegate.invokeTask(target, task, applyThis, applyArgs);
                Zone['__onChange'].emit(target);
            },
            onHandleError: function (parentZoneDelegate, currentZone, targetZone, error) {
                if (typeof reject === 'function') {
                    reject(error);
                }
            },
            onHasTask: function (parentZoneDelegate, currentZone, targetZone, hasTaskState) {
                if (!hasTaskState.macroTask && !hasTaskState.microTask) {
                    if (typeof resolve === 'function') {
                        resolve();
                    }
                }
            },
        })
            .run(function () {
            compile({ node: root, document: document, serviceMap: serviceMap, componentsMap: componentsMap });
        });
    });
};
//# sourceMappingURL=bootstrap.js.map