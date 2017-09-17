// tslint:disable:no-require-imports
// tslint:disable:no-var-requires
// tslint:disable:no-invalid-this
// tslint:disable:no-console

const execSync = require('child_process').execSync;
const fs = require('fs');
const domino = require('domino');
const htmlElement = require('domino/lib/htmlelts');

import 'reflect-metadata';

declare let global: any;
declare let Reflect: any;
declare let Zone: any;

Object.defineProperty(htmlElement.HTMLElement.prototype, 'innerText',
  {
    get: function () {
      let s = '';

      for (let i = 0; i < this.childNodes.length; i++) {
        const child = this.childNodes[i];

        switch (child.nodeType) {
          // TEXT_NODE
          case 3:
            s += child.data;

            break;
          default:
            if (child.tagName && child.tagName.toLowerCase() === 'br') {
              s += '\n';

              break;
            }

            const it = child.innerText;

            if (typeof it === 'string') {
              s += it;
            }

            break;
        }
      }

      return s;
    },

    set: function (value: string) {
      // Remove any existing children of this node
      while (this.hasChildNodes()) {
        this.removeChild(this.firstChild);
      }

      const txt = this.ownerDocument.createTextNode();
      txt.data = value;
      this.appendChild(txt);
    },
  },
);

const ElementRef = require('./lib/api').ElementRef;
const DOCUMENT = require('./lib/api').DOCUMENT;
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

  return val.toString();
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
            newInstance[input] = context.instance ? context.instance[input] : null;
          }
        }

        if (meta.outputs && meta.outputs.length) {
          for (let output of meta.outputs) {
            newInstance[output] = val => {
              const instance = context.instance;

              if (instance && context.instance[output]) {
                context.instance[output](val);
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

const compileTs = () => {
  try {
    execSync('./node_modules/.bin/tsc -p ./node_modules/ajs/tsconfig.json', { stdio: [0, 1, 2] });
  } catch (e) {
    return -1;
  }
};

const read = (opts, cb) => {
  if (opts.path) {
    fs.readFile(opts.path, (err, content) => {
      cb(err, content);
    });
  } else if (opts.content) {
    cb(null, opts.content);
  }
};

const bootstrap = app => {
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

  const window = domino.createWindow(app.doc);
  const document = window.document;
  const root = document.querySelector('app');

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

module.exports.__express = (toCompile => {
  if (toCompile && compileTs() === -1) {
    console.log('ERROR IN AJS TS');
  }

  return (filePath, options, callback) => {
    let callbackBack = callback;

    callback = (err, val) => {
      if (callbackBack) {
        if (err && err.toString) {
          err = err.toString();
        }

        callbackBack(err, val);
        callbackBack = null;
      }
    };

    if (!global.Zone) {
      require('zone.js/dist/zone-node.js');
    }

    options = options || {};

    if (!options.content) {
      options.path = filePath;
    }

    read(options, (err, content) => {
      if (err) {
        return callback(err);
      }

      let pathRoot = '.tmp/';

      if (options.subPath) {
        pathRoot += options.subPath + '/';
      }

      let path = pathRoot;

      path += 'app.js';

      let app;

      if (fs.existsSync(path)) {
        app = require(__dirname + '/../../' + path);
      } else {
        app = {
          components: [],
          services: [],
        };

        for (let file of fs.readdirSync(pathRoot)) {
          if (fs.lstatSync(pathRoot + '/' + file).isFile()) {
            let f;

            try {
              f = require(__dirname + '/../../' + pathRoot + file);
            } catch (e) {
              return callback(e);
            }

            for (let c in f) {
              if (f.hasOwnProperty(c)) {
                if (Reflect.getMetadata('service', f[c]) === true) {
                  app.services.push(f[c]);
                } else {
                  app.components.push(f[c]);
                }
              }
            }
          }
        }
      }

      app.doc = content.toString();

      bootstrap(app)
      .then(response => callback(null, response))
      .catch(err => callback(err));
    });
  };
})(true);
