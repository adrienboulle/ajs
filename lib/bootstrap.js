"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
var api_1 = require("./api");
var _ = require("lodash");
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
var bind = function (from, context) {
    var processed;
    var remaining = from;
    var match = remaining.match(BINDING);
    var strBefore;
    while (match) {
        processed = processed || [];
        strBefore = remaining.substring(0, match.index + match[0].length);
        remaining = remaining.substring(match.index + match[0].length);
        processed.push(strBefore.replace(match[0], _.get(context, match[1].trim())));
        match = remaining.match(BINDING);
    }
    return processed ? processed.join() : null;
};
var compile = function (context) {
    var componentsMap = context.componentsMap;
    var node = context.node;
    var newInstance;
    var childs = [];
    for (var _i = 0, _a = node.childNodes; _i < _a.length; _i++) {
        var child = _a[_i];
        childs.push(child);
    }
    switch (node.nodeType) {
        case 1:
            var ajsFor = node.getAttribute('ajs-for');
            if (ajsFor) {
                var vars = ajsFor.trim().replace(/[ ]+/g, ' ').split(' ');
                node.removeAttribute('ajs-for');
                var val = vars[0];
                var iterable = context.instance[vars[2]];
                var last = node;
                for (var _b = 0, iterable_1 = iterable; _b < iterable_1.length; _b++) {
                    var it = iterable_1[_b];
                    var cloned = node.cloneNode(true);
                    node.parentNode.insertBefore(cloned, last.nextSibling);
                    compile(Object.assign({}, context, { node: cloned, instance: Object.assign((_c = {}, _c[val] = it, _c), context.instance) }));
                    last = cloned;
                }
                node.parentNode.removeChild(node);
                return;
            }
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
                    for (var _d = 0, _e = meta.inputs; _d < _e.length; _d++) {
                        var input = _e[_d];
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
                    for (var _f = 0, _g = meta.outputs; _f < _g.length; _f++) {
                        var output = _g[_f];
                        _loop_2(output);
                    }
                }
                if (typeof newInstance.onInit === 'function') {
                    newInstance.onInit();
                }
                node.childNodes.forEach(function (childNode) {
                    compile(Object.assign({}, context, { node: childNode, instance: newInstance }));
                });
                return;
            }
            var innerText_1 = node.getAttribute('ajs-innertext');
            if (innerText_1) {
                var setVal_1 = function () {
                    var val = _.get(context.instance, innerText_1);
                    node.innerText = typeof val === 'string' ? val : innerText_1;
                };
                setVal_1();
                Zone['__onChange'].subscribe(function () {
                    setVal_1();
                });
            }
            var model_1 = node.getAttribute('ajs-model');
            if (model_1 && node.tagName.toLowerCase() === 'input') {
                var setVal_2 = function () {
                    node.value = _.get(context.instance, model_1);
                };
                setVal_2();
                node.addEventListener('input', function () {
                    _.set(context.instance, model_1, node.value);
                    Zone['__onChange'].emit();
                });
                Zone['__onChange'].subscribe(function (target) {
                    if (target !== node) {
                        setVal_2();
                    }
                });
            }
            var click_1 = node.getAttribute('ajs-click');
            if (click_1) {
                node.addEventListener('click', function (event) {
                    var fnc = _.get(context.instance, click_1);
                    if ('function' === typeof fnc) {
                        fnc(event);
                    }
                });
            }
            var _loop_3 = function (i) {
                var attr = node.attributes[i];
                var back_1 = attr.value;
                attr.value = bind(back_1, context.instance) || back_1;
                if (attr.value !== back_1) {
                    Zone['__onChange'].subscribe(function () {
                        attr.value = bind(back_1, context.instance) || back_1;
                    });
                }
            };
            for (var i = 0; i < node.attributes.length; i++) {
                _loop_3(i);
            }
            break;
        case 3:
            var back_2 = node.data;
            node.data = bind(back_2, context.instance) || back_2;
            if (node.data !== back_2) {
                Zone['__onChange'].subscribe(function () {
                    node.data = bind(back_2, context.instance) || back_2;
                });
            }
            break;
    }
    childs.forEach(function (childNode) {
        compile(Object.assign({}, context, { node: childNode }));
    });
    var _c;
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