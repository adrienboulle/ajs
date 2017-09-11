const execSync = require('child_process').execSync;
const fs = require('fs');
const domino = require('domino');
const htmlElement = require('domino/lib/htmlelts');

Object.defineProperty(htmlElement.HTMLElement.prototype, 'innerText',
  {
    get: function () {
      return this.serialize();
    },

    set: function (value) {
      const txtnd = this.ownerDocument.createTextNode();
      txtnd.data = value;
      this.appendChild(txtnd);
    },
  }
);

require('zone.js/dist/zone-node.js');
require('reflect-metadata');

const ElementRef = require('./lib/api').ElementRef;
const DOCUMENT = require('./lib/api').DOCUMENT;
const BINDING = /\{\{(.*?)\}\}/;

const getArgs = (cls, context) =>
  Reflect
  .getMetadata('design:paramtypes', cls)
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
        const innerText = node.getAttribute('ab-innertext');

        if (innerText) {
          node.innerText = context.instance[innerText] || innerText;
        }
      }

      break;
    case 3:
      let match = node.data.match(BINDING);

      while (match) {
        const path = match[1].trim().split('.');
        let val = context.instance[path.shift()];

        while (path.length && val && val[path[0]]) {
          val = val[path.shift()];
        }

        node.data = node.data.replace(match[0], val);
        match = node.data.match(BINDING);
      }

      break;
  }

  node.childNodes.forEach(childNode => {
    compile(Object.assign({}, context, { node: childNode, instance: newInstance || context.instance }));
  });
};

module.exports = () => {
  execSync('./node_modules/.bin/tsc -p ajs_module/tsconfig.json', { stdio: [0, 1, 2] });

  const serviceMap = require('./lib/api').serviceMap;
  const componentsMap = new Map();

  return (filePath, options, callback) => {
    fs.readFile(filePath, (err, content) => {
      if (err) {
        return callback(new Error(err));
      }

      const app = require('../.tmp/app');

      for (let cmp of app.components) {
        const meta = Reflect.getMetadata('annotations', cmp);
        componentsMap.set(meta.selector, cmp);
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
      })
      .run(() => setTimeout(() => compile({ node: root, document, serviceMap, componentsMap })));
    });
  };
};
