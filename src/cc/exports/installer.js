define(function(require, exports, module) {
  "use strict";
  
  var CoffeeCollider = require("./coffeecollider").CoffeeCollider;
  
  var install = function() {
    global.CoffeeCollider = CoffeeCollider;
  };
  
  module.exports = {
    install: install
  };

});
