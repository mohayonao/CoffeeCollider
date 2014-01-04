define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;

  var cc  = require("./cc");
  var ref = require("./ref");
  
  describe("lang/ref.js", function() {
    var actual, expected;
    it("create", function() {
      var value = [ 1, 2, 3 ];
      actual = cc.global.$(value);
      assert.instanceOf(actual, ref.Ref);
      assert.isTrue(cc.instanceOfRef(actual));
    });
    it("#value", function() {
      var value = [ 1, 2, 3 ];
      actual   = cc.global.$(value).value();
      expected = value;
      assert.equal(actual, expected);
    });
  });

});
