define(function(require, exports, module) {
  "use strict";

  exports = function() {
    require("./ugen").exports();
    require("./bufio").exports();
    require("./line").exports();
    require("./osc").exports();
    require("./pan").exports();
    require("./delay").exports();
    require("./ui").exports();
  };

  var use = function() {
    require("./ugen").use();
    require("./uop").use();
    require("./bop").use();
    require("./madd").use();
  };
  
  module.exports = {
    use:use, exports: exports
  };

});
