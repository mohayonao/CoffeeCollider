define(function(require, exports, module) {
  "use strict";
  
  var install = function() {
    require("./client").install();
  };
  
  module.exports = {
    install: install,
    exports: exports
  };

});
