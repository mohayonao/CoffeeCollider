define(function(require, exports, module) {
  "use strict";

  var install = function() {
    require("./out").install();
    require("./bop").install();
    require("./control").install();
    require("./sinosc").install();
  };
  
  module.exports = {
    install: install
  };

});
