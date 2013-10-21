define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var register = require("./installer").register;
  var uop = require("./uop");

  describe("uop.js", function() {
    before(function() {
      uop.install();
    });
  });  

});
