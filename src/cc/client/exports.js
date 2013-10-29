define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  
  var install = function() {
    cc.exports = function() {
      require("./object").exports();
      require("./bop").exports();
      require("./uop").exports();
      require("./buffer").exports();
      require("./node").exports();
      require("./sched").exports();
      require("./scale").exports();
      require("./ugen/installer").exports();
    };
  };
  
  module.exports = {
    install: install
  };

});
