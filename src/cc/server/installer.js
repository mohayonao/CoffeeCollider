define(function(require, exports, module) {
  "use strict";
  
  var install = function() {
    require("./server").install();
    require("./bop").install();
    require("./uop").install();
    require("./buffer").install();
    require("./node").install();
    require("./sched").install();
    require("./ugen/installer").install();
    require("./unit/installer").install();
  };
  
  module.exports = {
    install : install
    };

});
