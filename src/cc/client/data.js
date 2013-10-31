define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  
  exports = function() {
    global.DATA = {
      get: function(n) {
        return cc.DATA[n] || "";
      }
    };
  };
  
  module.exports = {
    exports:exports
  };

});
