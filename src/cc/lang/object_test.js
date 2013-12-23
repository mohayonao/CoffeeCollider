define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var testTools = require("../../testTools");
  
  require("./object");
  
  var cc = require("../cc");
  
  describe("lang/object.js", function() {
    var o, actual, expected;
    
    testTools.mock("instanceOfSyncBlock");
    
    beforeEach(function() {
      o = new cc.Object();
      o.klassName = "CCObject";
    });
    it("clone", function() {
      actual   = o.clone();
      expected = o;
      assert.equal(actual, expected);
    });
    it("dup", function() {
      actual   = o.dup();
      expected = [ o, o ];
      assert.deepEqual(actual, expected);

      actual   = o.dup(5);
      expected = [ o, o, o, o, o ];
      assert.deepEqual(actual, expected);
    });
    it("value", function() {
      actual   = o.value();
      expected = o;
      assert.equal(actual, expected);
    });
    it("valueArray", function() {
      actual   = o.valueArray();
      expected = o;
      assert.equal(actual, expected);
    });
    it("do", function() {
      var x = null;
      actual   = o.do(function(a, i) {
        x = a;
      });
      expected = o;
      assert.equal(actual, expected);
      assert.equal(x, o);
    });
    it("asUGenInput", function() {
      assert.throws(function() {
        o.asUGenInput();
      }, "CCObject can't cast to a UGen.");
    });
    it("asString", function() {
      actual   = o.asString();
      expected = "CCObject";
      assert.equal(actual, expected);
    });
  });

});
