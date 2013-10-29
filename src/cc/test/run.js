require("amd-loader");

var fs = require("fs");
var path = require("path");

var Mocha = require("mocha");
var mocha = new Mocha();

global.require = require;
global.C = JSON.parse(fs.readFileSync(__dirname + "/../../const.json"));

var reporter = "spec";

var walk = (function() {
  var _walk = function(dir, list) {
    fs.readdirSync(dir).forEach(function(name) {
      var filepath = dir + "/" + name;
      if (fs.statSync(filepath).isDirectory()) {
        _walk(filepath, list);
      } else {
        if (/_test\.js$/.test(filepath)) {
          list.push(filepath);
        }
      }
    });
    return list;
  };
  return function(dir) {
    return _walk(dir, []);
  };
})();

walk(path.normalize(__dirname + "/..")).forEach(function(file) {
  mocha.addFile(file);
});

mocha.reporter(reporter).run(function(failures) {
  process.exit(failures);
});
