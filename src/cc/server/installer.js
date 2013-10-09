define(function(require, exports, module) {
  "use strict";

  var install = function(namespace) {
    require("./server").install(namespace);
    require("./bop").install(namespace);
    require("./uop").install(namespace);
  };

  module.exports = {
    install: install
  };

});
