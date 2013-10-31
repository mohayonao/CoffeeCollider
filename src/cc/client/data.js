define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  
  
  module.exports = {
    exports: function() {
      global.DATA = {
        get: function(n) {
          return cc.DATA[n] || "";
        }
      };
    }
  };

});
