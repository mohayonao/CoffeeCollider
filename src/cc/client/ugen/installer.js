define(function(require, exports, module) {
  "use strict";

  var install = function() {
    require("./ugen").install();
    require("./basic_ops").install();
    require("./bufio").install();
    require("./delay").install();
    require("./line").install();
    require("./osc").install();
    require("./pan").install();
    require("./ui").install();
  };
  
  module.exports = {
    install: install
  };
 
});
