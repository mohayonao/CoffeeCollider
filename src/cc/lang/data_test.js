define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;

  var cc = require("./cc");
  var data = require("./data");

  describe("lang/data.js", function() {
    before(function() {
      cc.DATA = [ "1", "2" ];
    });
    it("read", function() {
      assert.equal(cc.global.DATA.get(0), "1");
      assert.equal(cc.global.DATA.get(1), "2");
      assert.equal(cc.global.DATA.get(2), "");
    });
  });

});
