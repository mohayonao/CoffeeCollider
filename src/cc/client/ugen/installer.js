define(function(require, exports, module) {
  "use strict";
  
  module.exports = {
    use: function() {
      require("./ugen").use();
      require("./uop").use();
      require("./bop").use();
      require("./madd").use();
      require("./inout").use();
    },
    install: function() {
      require("./bufio");
      require("./delay");
      require("./inout");
      require("./line");
      require("./osc");
      require("./pan");
      require("./ui");
    }
  };

});
