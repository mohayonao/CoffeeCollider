define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;

  var cc = require("./cc");
  var data = require("./data");

  describe("data.js", function() {
    before(function() {
      data.exports();
      cc.DATA = [ "1", "2" ];
    });
    it("read", function() {
      assert.equal(DATA.get(0), "1");
      assert.equal(DATA.get(1), "2");
      assert.equal(DATA.get(2), "");
    });
  });

});
