import 'zone.js/dist/zone.js';
import { bootstrap } from './bootstrap';

import {
  DOCUMENT,
  ElementRef,
  Component,
  Service,
  Input,
  Output,
} from './api';

declare let window: any;

((window: any) => {
  if (window.ajs) {
    return;
  }

  window.ajs = {
    bootstrap,
    DOCUMENT,
    ElementRef,
    Component,
    Service,
    Input,
    Output,
  };
})(window);
