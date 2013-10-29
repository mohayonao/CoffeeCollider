define(function(require, exports, module) {
  "use strict";

  exports = function() {
    require("./ugen").exports();
    require("./basic_ops").exports();
    require("./bufio").exports();
    require("./delay").exports();
    require("./line").exports();
    require("./osc").exports();
    require("./pan").exports();
    require("./ui").exports();
  };
  
  module.exports = {
    exports: exports
  };
 
});
