define(function(require, exports, module) {
  "use strict";
  
  module.exports = {
    install: function() {
      require("./unit");
      require("./madd");
      require("./uop");
      require("./bop");
      require("./bufio");
      require("./delay");
      require("./line");
      require("./osc");
      require("./pan");
      require("./ui");
    }
  };

});
