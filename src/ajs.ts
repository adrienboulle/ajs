// tslint:disable:no-require-imports
// tslint:disable:no-var-requires
// tslint:disable:no-invalid-this
// tslint:disable:no-console

const execSync = require('child_process').execSync;
const fs = require('fs');
const domino = require('domino');
const htmlElement = require('domino/lib/htmlelts');

declare let global: any;
declare let Reflect: any;

import { bootstrap } from './bootstrap';

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

// tslint:disable-next-line:variable-name
export const __express = (toCompile => {
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
        app = require(__dirname + '/../../../' + path);
      } else {
        app = {
          components: [],
          services: [],
        };

        for (let file of fs.readdirSync(pathRoot)) {
          if (fs.lstatSync(pathRoot + '/' + file).isFile()) {
            let f;

            try {
              f = require(__dirname + '/../../../' + pathRoot + file);
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

      app.window = domino.createWindow(content);

      bootstrap(app)
      .then(response => callback(null, response))
      .catch(err => callback(err));
    });
  };
})(true);
