define(function(require, exports, module) {
  "use strict";

  exports = function() {
    require("./ugen").exports();
    require("./madd").exports();
    require("./uop").exports();
    require("./bop").exports();
    require("./bufio").exports();
    require("./delay").exports();
    require("./line").exports();
    require("./osc").exports();
    require("./pan").exports();
    require("./ui").exports();
  };

  var use = function() {
    require("./ugen").use();
    require("./madd").use();
    require("./uop").use();
    require("./bop").use();
    require("./bufio").use();
    require("./delay").use();
    require("./line").use();
    require("./osc").use();
    require("./pan").use();
    require("./ui").use();
  };
  
  module.exports = {
    use:use, exports: exports
  };

});
