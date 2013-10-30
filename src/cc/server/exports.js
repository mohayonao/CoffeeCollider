define(function(require, exports, module) {
  "use strict";
  
  var cc = require("./cc");
  
  var use = function() {
    cc.unit_install = function() {
      exports();
    };
    
  };
  exports = function() {
    require("./unit/installer").install();
  };
  
  module.exports = {
    use:use
  };

});
