"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function Component(opts) {
    return function (target) {
        var annotations = {};
        if (!Reflect.hasMetadata('annotations', target)) {
            Reflect.defineMetadata('annotations', annotations, target);
        }
        else {
            annotations = Reflect.getMetadata('annotations', target);
        }
        opts.inputs = (annotations.inputs || []).concat(opts.inputs || []);
        opts.outputs = (annotations.outputs || []).concat(opts.outputs || []);
        Object.assign(annotations, opts);
    };
}
exports.Component = Component;
function Service() {
    return function (target) {
        Reflect.defineMetadata('service', true, target);
    };
}
exports.Service = Service;
function Input(val) {
    return function (target, propertyKey) {
        var annotations = {};
        if (!Reflect.hasMetadata('annotations', target.constructor)) {
            Reflect.defineMetadata('annotations', annotations, target.constructor);
        }
        else {
            annotations = Reflect.getMetadata('annotations', target.constructor);
        }
        annotations.inputs = annotations.inputs || [];
        annotations.inputs.push(val || propertyKey);
    };
}
exports.Input = Input;
function Output(val) {
    return function (target, propertyKey) {
        var annotations = {};
        if (!Reflect.hasMetadata('annotations', target.constructor)) {
            Reflect.defineMetadata('annotations', annotations, target.constructor);
        }
        else {
            annotations = Reflect.getMetadata('annotations', target.constructor);
        }
        annotations.outputs = annotations.outputs || [];
        annotations.outputs.push(val || propertyKey);
    };
}
exports.Output = Output;
var ElementRef = /** @class */ (function () {
    function ElementRef(nativeElement) {
        this.nativeElement = nativeElement;
    }
    return ElementRef;
}());
exports.ElementRef = ElementRef;
var DOCUMENT = /** @class */ (function () {
    function DOCUMENT() {
    }
    return DOCUMENT;
}());
exports.DOCUMENT = DOCUMENT;
//# sourceMappingURL=api.js.map