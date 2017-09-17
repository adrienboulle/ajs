import { bootstrap } from './bootstrap';

import 'zone.js/dist/zone.js';

declare let window: any;

((window: any) => {
  if (window.ajs) {
    return;
  }

  window.ajs = {
    window,
    components: [],
    services: [],
    bootstrap: () => {
      bootstrap(window.ajs)
      .catch(e => console.error(e));
    },
  };

})(window);
