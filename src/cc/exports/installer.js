define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");
  
  var install = function() {
    require("./coffeecollider").install();
    global.CoffeeCollider = function(opts) {
      return cc.createCoffeeCollider(opts);
    };
  };
  
  module.exports = {
    install: install
  };

});
