import { bootstrap, App } from './bootstrap';

import 'zone.js/dist/zone.js';

declare let window: any;

((window: any) => {
  if (window.ajsBootstrap) {
    return;
  }

  window.ajsBootstrap = app => {
    return bootstrap(app)
    .catch(e => console.error(e));
  };
})(window);
