define(function(require, exports, module) {
  "use strict";
  
  var install = function() {
    require("./server").install();
    require("./unit/installer").install();
  };
  
  module.exports = {
    install : install
  };

});
