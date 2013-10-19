define(function(require, exports, module) {
  "use strict";

  var install = function() {
    require("./ugen").install();
    require("./basic_ops").install();
    require("./osc").install();
    require("./line").install();
    require("./ui").install();
  };

  module.exports = {
    install: install
  };
 
});
