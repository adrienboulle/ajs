import 'reflect-metadata';
import { ElementRef, DOCUMENT } from './api';

declare let Reflect: any;
declare let Zone: any;

const BINDING = /\{\{(.*?)\}\}/;

const getArgs = (cls, context) =>
  (Reflect
  .getMetadata('design:paramtypes', cls) || [])
  .map(param => {
    let returned;

    if (context.serviceMap.has(param)) {
      let S: any = param;

      if (S === ElementRef) {
        returned = new ElementRef(context.node);
      } else if (S === DOCUMENT) {
        returned = context.document;
      } else if (typeof S === 'function') {
        returned = new S(...getArgs(S, context));
      }

      return returned;
    }
  });

const processValue = (root, path) => {
  path = path.split('.');
  let val = root[path.shift()];

  while (path.length && val && (val[path[0]] || typeof val[path[0]] === 'string')) {
    val = val[path.shift()];
  }

  return val ? val.toString() : '';
};

const bind = (from: string, context: any) => {
  let processed;
  let remaining = from;
  let match = remaining.match(BINDING);
  let strBefore;

  while (match) {
    processed = processed || [];
    strBefore = remaining.substring(0, match.index + match[0].length);
    remaining = remaining.substring(match.index + match[0].length);

    processed.push(strBefore.replace(match[0], processValue(context, match[1].trim())));
    match = remaining.match(BINDING);
  }

  return processed ? processed.join() : null;
};

const compile = context => {
  const componentsMap = context.componentsMap;
  const node = context.node;
  let newInstance;

  switch (node.nodeType) {
    case 1:
      if (componentsMap.has(node.tagName.toLowerCase())) {
        const classVal: any = componentsMap.get(node.tagName.toLowerCase());
        const meta = Reflect.getMetadata('annotations', classVal);
        node.innerHTML = meta.template;

        newInstance = new classVal(...getArgs(classVal, context));

        if (meta.inputs && meta.inputs.length) {
          for (let input of meta.inputs) {
            const splited = input.split(':');
            const from = splited[0];
            const to = splited[1];

            newInstance[to] = context.instance ? context.instance[from] : null;
            Zone['__onChange'].subscribe(() => {
              newInstance[to] = context.instance ? context.instance[from] : null;
            });
          }
        }

        if (meta.outputs && meta.outputs.length) {
          for (let output of meta.outputs) {
            const splited = output.split(':');
            const from = splited[0];
            const to = splited[1];

            newInstance[to] = val => {
              const instance = context.instance;

              if (instance && context.instance[from]) {
                context.instance[from](val);
              }
            };
          }
        }

        if (typeof newInstance.onInit === 'function') {
          newInstance.onInit();
        }
      } else {
        const innerText = node.getAttribute('ajs-innertext');

        if (innerText) {
          const val = processValue(context.instance, innerText);

          node.innerText = typeof val === 'string' ? val : innerText;
          Zone['__onChange'].subscribe(() => {
            node.innerText = typeof val === 'string' ? val : innerText;
          });
        }

        const model = node.getAttribute('ajs-model');

        if (model && node.tagName.toLowerCase() === 'input') {
          node.value = context.instance[model];
          node.addEventListener('input', () => {
            context.instance[model] = node.value;
            Zone['__onChange'].emit();
          });
          Zone['__onChange'].subscribe(target => {
            if (target !== node) {
              node.value = context.instance[model];
            }
          });
        }

        const click = node.getAttribute('ajs-click');

        if (click) {
          node.addEventListener('click', (event: Event) => {
            if ('function' === typeof context.instance[click]) {
              context.instance[click](event);
            }
          });
        }

        for (let i = 0; i < node.attributes.length; i++) {
          const attr = node.attributes[i];
          attr['__ajs-data'] = attr.value;

          attr.value = bind(attr['__ajs-data'], context.instance) || attr['__ajs-data'];

          if (attr.value !== attr['__ajs-data']) {
            Zone['__onChange'].subscribe(() => {
              attr.value = bind(attr['__ajs-data'], context.instance) || attr['__ajs-data'];
            });
          }
        }
      }

      break;
    case 3:
      node['__ajs-data'] = node.data;

      node.data = bind(node['__ajs-data'], context.instance) || node['__ajs-data'];

      if (node.data !== node['__ajs-data']) {
        Zone['__onChange'].subscribe(() => {
          node.data = bind(node['__ajs-data'], context.instance) || node['__ajs-data'];
        });
      }

      break;
  }

  node.childNodes.forEach(childNode => {
    compile(Object.assign({}, context, { node: childNode, instance: newInstance || context.instance }));
  });
};

export const bootstrap = app => {
  const serviceMap = new Map();
  const componentsMap = new Map();

  for (let cmp of app.components) {
    const meta = Reflect.getMetadata('annotations', cmp);
    componentsMap.set(meta.selector, cmp);
  }

  for (let service of app.services) {
    serviceMap.set(service, true);
  }

  serviceMap.set(ElementRef, true);
  serviceMap.set(DOCUMENT, true);

  const window = app.window;
  const document = window.document;
  const root = document.querySelector('app');

  if (app.clear) {
    while (root.hasChildNodes()) {
      root.removeChild(root.firstChild);
    }
  }

  return new Promise((resolve, reject) => {
    class OnChange {
      private _subscribers: Function[] = [];
      public subscribe(fnc: Function) {
        this._subscribers.push(fnc);
      }
      public emit() {
        for (let s of this._subscribers) {
          s();
        }
      }
    }

    Zone['__onChange'] = new OnChange();

    Zone.current
    .fork({
      onInvokeTask(delegate: ZoneDelegate, current: Zone, target: Zone, task: Task, applyThis: any, applyArgs: any) {
        delegate.invokeTask(target, task, applyThis, applyArgs);
        Zone['__onChange'].emit(target);
      },

      onHandleError(parentZoneDelegate: any, currentZone: any, targetZone: any, error: any) {
        if (typeof reject === 'function') {
          reject(error);
        }
      },

      onHasTask: (parentZoneDelegate: any, currentZone: any, targetZone: any, hasTaskState: any) => {
        if (!hasTaskState.macroTask && !hasTaskState.microTask) {
          if (typeof resolve === 'function') {
            resolve();
          }
        }
      },
    })
    .run(() => {
      compile({ node: root, document, serviceMap, componentsMap });
    });
  });
};
