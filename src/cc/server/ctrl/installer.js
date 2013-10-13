define(function(require, exports, module) {
  "use strict";

  var install = function(namespace) {
    require("./node").install(namespace);
  };
  
  module.exports = {
    install: install
  };

});
