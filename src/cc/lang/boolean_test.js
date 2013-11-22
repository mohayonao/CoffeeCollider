define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;

  var cc = require("./cc");

  describe("labg/boolean.js", function() {
    var actual, expected;
    before(function() {
      require("./boolean");
    });
    describe("uop", function() {
      it("__plus__", function() {
        assert.equal(true .__plus__(), 1);
        assert.equal(false.__plus__(), 0);
      });
      it("__minus__", function() {
        assert.equal(true .__minus__(), -1);
        assert.equal(false.__minus__(),  0);
      });
    });
    describe("bop", function() {
      before(function() {
        cc.instanceOfUGen = function() {
          return false;
        };
        cc.createTaskWaitLogic = function(logic, list) {
          return [logic].concat(list);
        };
      });
      it("__add__", function() {
        assert.equal(true .__add__(2), 3);
        assert.equal(true .__add__("str"), "truestr");
      });
      it("__sub__", function() {
        assert.equal(true .__sub__(2), -1);
        assert.equal(true .__sub__("str"), 0); // avoid NaN
      });
      it("__mul__", function() {
        assert.equal(true .__mul__(2),  2);
        assert.equal(true .__mul__("str"), 0); // avoid NaN
      });
      it("__div__", function() {
        assert.equal(true .__div__(2), 0.5);
        assert.equal(true .__div__("str"), 0); // avoid NaN
      });
      it("__mod__", function() {
        assert.equal(true .__mod__(2), 1);
        assert.equal(true .__mod__("str"), 0); // avoid NaN
      });
      it("__and__", function() {
        assert.deepEqual(true.__and__(false), ["and", true, false]);
      });
      it("__or__", function() {
        assert.deepEqual(true.__or__(false), ["or", true, false]);
      });
      it("dup", function() {
        actual   = true.dup();
        expected = [true, true];
        assert.deepEqual(actual, expected);
      });
    });
  });

});
