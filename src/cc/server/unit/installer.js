define(function(require, exports, module) {
  "use strict";
  
  module.exports = {
    install: function() {
      require("./unit");
      require("./bop");
      require("./bufio");
      require("./delay");
      require("./filter");
      require("./inout");
      require("./line");
      require("./madd");
      require("./osc");
      require("./pan");
      require("./ui");
      require("./uop");
    }
  };

});
