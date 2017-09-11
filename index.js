const express = require('express');
const app = express();

const ajs = require('./ajs_module/index.js');

app.engine('ajs', ajs());

app.set('views', './views');
app.set('view engine', 'ajs');

app.get('/', function (req, res) {
  res.render('index');
});

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});
