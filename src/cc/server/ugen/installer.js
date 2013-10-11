define(function(require, exports, module) {
  "use strict";

  var install = function(namespace) {
    require("./ugen").install(namespace);
    require("./basic_ops").install(namespace);
    require("./osc").install(namespace);
  };

  module.exports = {
    install: install
  };
 
});
