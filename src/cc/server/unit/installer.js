define(function(require, exports, module) {
  "use strict";

  var install = function() {
    require("./basic_ops").install();
    require("./osc").install();
  };
  
  module.exports = {
    install: install
  };

});
