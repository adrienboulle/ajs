const execSync = require('child_process').execSync;
const fs = require('fs');
const domino = require('domino');
const htmlElement = require('domino/lib/htmlelts');

Object.defineProperty(htmlElement.HTMLElement.prototype, 'innerText',
  {
    get: function () {
      let s = '';

      for (let i = 0, n = this.childNodes.length; i < n; i++) {
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

    set: function (value) {
      // Remove any existing children of this node
      while (this.hasChildNodes()) {
        this.removeChild(this.firstChild);
      }

      const txt = this.ownerDocument.createTextNode();
      txt.data = value;
      this.appendChild(txt);
    },
  }
);

require('reflect-metadata');

const ElementRef = require('./lib/api').ElementRef;
const DOCUMENT = require('./lib/api').DOCUMENT;
const BINDING = /\{\{(.*?)\}\}/;

const getArgs = (cls, context) =>
  (Reflect
  .getMetadata('design:paramtypes', cls) || [])
  .map(param => {
    let returned;

    if (context.serviceMap.has(param)) {
      let S = param;

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

  while (path.length && val && val[path[0]]) {
    val = val[path.shift()];
  }

  return val;
};

const compile = context => {
  const componentsMap = context.componentsMap;
  const node = context.node;
  let newInstance;

  switch (node.nodeType) {
    case 1:
      if (componentsMap.has(node.tagName.toLowerCase())) {
        const ClassVal = componentsMap.get(node.tagName.toLowerCase());
        const meta = Reflect.getMetadata('annotations', ClassVal);
        node.innerHTML = meta.template;

        newInstance = new ClassVal(...getArgs(ClassVal, context));

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
          node.innerText = processValue(context.instance, innerText) || innerText;
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

module.exports.__express = (toCompile => {
  if (toCompile && compileTs() === -1) {
    console.log('ERROR IN AJS TS');
  }

  return (filePath, options, callback) => {
    let callbackBack = callback;

    const serviceMap = new Map();
    const componentsMap = new Map();

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

      for (let cmp of app.components) {
        const meta = Reflect.getMetadata('annotations', cmp);
        componentsMap.set(meta.selector, cmp);
      }

      for (let service of app.services) {
        serviceMap.set(service, true);
      }

      serviceMap.set(ElementRef, true);
      serviceMap.set(DOCUMENT, true);

      const window = domino.createWindow(content.toString());
      const document = window.document;
      const root = document.querySelector('app');

      // We run the compilation inside a Zone context in order to wait for all the async task to be finished before
      // invoking the express callback
      Zone.current
      .fork({
        onHasTask(parent, current, target, hasTask) {
          if (!hasTask.macroTask && !hasTask.microTask) {
            callback(null, document.innerHTML);
          }
        },

        onHandleError(parentZoneDelegate, currentZone, targetZone, error) {
          callback(error);
        },
      })
      .run(() => setTimeout(() => compile({ node: root, document, serviceMap, componentsMap })));
    });
  };
})(true);
