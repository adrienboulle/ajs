"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var bootstrap_1 = require("./bootstrap");
require("zone.js/dist/zone.js");
(function (window) {
    if (window.ajs) {
        return;
    }
    window.ajs = {
        window: window,
        components: [],
        services: [],
        bootstrap: function () {
            bootstrap_1.bootstrap(window.ajs)
                .catch(function (e) { return console.error(e); });
        },
    };
})(window);
//# sourceMappingURL=render.js.map