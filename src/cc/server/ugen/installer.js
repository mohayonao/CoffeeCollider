define(function(require, exports, module) {
  "use strict";

  var install = function(register) {
    require("./ugen").install(register);
    require("./basic_ops").install(register);
    require("./osc").install(register);
    require("./line").install(register);
    require("./ui").install(register);
  };

  module.exports = {
    install: install
  };
 
});
