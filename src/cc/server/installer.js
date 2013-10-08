define(function(require, exports, module) {
  "use strict";

  var install = function(global) {
    require("./server").install(global);
    require("./bop").install(global);
  };

  module.exports = {
    install: install
  };

});
