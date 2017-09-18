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
            const splited = input.split[':'];
            const from = splited[0];
            const to = splited[1];

            newInstance[to] = context.instance ? context.instance[from] : null;
          }
        }

        if (meta.outputs && meta.outputs.length) {
          for (let output of meta.outputs) {
            const splited = output.split[':'];
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
        }
      }

      break;
    case 3:
      let processed;
      let remaining = node.data;
      let match = remaining.match(BINDING);
      let strBefore;

      while (match) {
        processed = processed || [];
        strBefore = remaining.substring(0, match.index + match[0].length);
        remaining = remaining.substring(match.index + match[0].length);

        processed.push(strBefore.replace(match[0], processValue(context.instance, match[1].trim())));
        match = remaining.match(BINDING);
      }

      node.data = processed ? processed.join() : node.data;

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
    // We run the compilation inside a Zone context in order to wait for all the async task to be finished before
    // invoking the express callback
    Zone.current
    .fork({
      onHasTask: (parentZoneDelegate: any, currentZone: any, targetZone: any, hasTaskState: any) => {
        if (!hasTaskState.macroTask && !hasTaskState.microTask) {
          resolve(document.innerHTML);
        }
      },

      onHandleError(parentZoneDelegate: any, currentZone: any, targetZone: any, error: any) {
        reject(error);
      },
    })
    .run(() => setTimeout(() => compile({ node: root, document, serviceMap, componentsMap })));
  });
};
