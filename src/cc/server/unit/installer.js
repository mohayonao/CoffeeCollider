define(function(require, exports, module) {
  "use strict";

  var install = function() {
    require("./unit").install();
    require("./basic_ops").install();
    require("./osc").install();
    require("./ui").install();
  };
  
  module.exports = {
    install: install
  };

});
