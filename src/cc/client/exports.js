define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");

  var use = function() {
    cc.client_exports = function() {
      exports();
    };
  };
  exports = function() {
    require("./object").exports();
    require("./bop").exports();
    require("./uop").exports();
    require("./buffer").exports();
    require("./node").exports();
    require("./sched").exports();
    require("./scale").exports();
    require("./ugen/exports").exports();
  };
  
  module.exports = {
    use:use, exports:exports
  };

});
