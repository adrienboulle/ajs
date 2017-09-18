"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("zone.js/dist/zone.js");
var bootstrap_1 = require("./bootstrap");
var api_1 = require("./api");
(function (window) {
    if (window.ajs) {
        return;
    }
    window.ajs = {
        bootstrap: bootstrap_1.bootstrap,
        DOCUMENT: api_1.DOCUMENT,
        ElementRef: api_1.ElementRef,
        Component: api_1.Component,
        Service: api_1.Service,
        Input: api_1.Input,
        Output: api_1.Output,
    };
})(window);
//# sourceMappingURL=render.js.map