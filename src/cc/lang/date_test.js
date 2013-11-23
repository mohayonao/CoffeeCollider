define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;

  require("./date");
  
  var cc = require("./cc");
  
  describe("lang/date.js", function() {
    var d, actual, expected;
    var _instanceOfUGen, _createTaskWaitLogic;
    before(function() {
      d = new Date();
      
      _instanceOfUGen = cc.instanceOfUGen;
      _createTaskWaitLogic = cc.createTaskWaitLogic;
      
      cc.instanceOfUGen = function() {
        return false;
      };
      cc.createTaskWaitLogic = function(logic, list) {
        return [logic].concat(list);
      };
    });
    after(function() {
      cc.instanceOfUGen = _instanceOfUGen;
      cc.createTaskWaitLogic = _createTaskWaitLogic;
    });
    describe("uop", function() {
      it("__plus__", function() {
        assert.equal(d.__plus__(), +d);
      });
      it("__minus__", function() {
        assert.equal(d.__minus__(), -d);
      });
    });
    describe("bop", function() {
      before(function() {
      });
      it("__add__", function() {
        assert.equal(d.__add__(2), d + 2);
        assert.equal(d.__add__("str"), d + "str");
      });
      it("__sub__", function() {
        assert.equal(d.__sub__(2), d - 2);
        assert.equal(d.__sub__("str"), 0); // avoid NaN
      });
      it("__mul__", function() {
        assert.equal(d.__mul__(2), d * 2);
        assert.equal(d.__mul__("str"), 0); // avoid NaN
      });
      it("__div__", function() {
        assert.equal(d.__div__(2), d / 2);
        assert.equal(d.__div__("str"), 0); // avoid NaN
      });
      it("__mod__", function() {
        assert.equal(d.__mod__(2), d % 2);
        assert.equal(d.__mod__("str"), 0); // avoid NaN
      });
      it("__and__", function() {
        assert.deepEqual(d.__and__(d), ["and", d, d]);
      });
      it("__or__", function() {
        assert.deepEqual(d.__or__(d), ["or", d, d]);
      });
      it("dup", function() {
        actual   = d.dup();
        expected = [d, d];
        assert.deepEqual(actual, expected);
      });
    });
  });

});
