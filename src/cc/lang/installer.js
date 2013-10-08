define(function(require, exports, module) {
  "use strict";

  var install = function() {
    require("./lang-server").install();
    require("./bop").install();
  };

  module.exports = {
    install: install
  };

});
