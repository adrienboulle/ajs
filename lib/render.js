"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var bootstrap_1 = require("./bootstrap");
(function (window) {
    if (window.ajs) {
        return;
    }
    window.ajs = {
        components: [],
        services: [],
        bootstrap: function () {
            bootstrap_1.bootstrap(window.ajs);
        },
    };
})(window);
//# sourceMappingURL=render.js.map