import { bootstrap } from './bootstrap';

declare let window: any;

((window: any) => {
  if (window.ajs) {
    return;
  }

  window.ajs = {
    components: [],
    services: [],
    bootstrap: () => {
      bootstrap(window.ajs);
    },
  };

})(window);
