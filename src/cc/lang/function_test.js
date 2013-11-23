define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  
  require("./function");
  
  var cc = require("./cc");
  var nop = function() {};
  
  describe("lang/function.js", function() {
    var actual, expected;
    var _instanceOfUGen, _createTaskWaitLogic;
    before(function() {
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
        assert.equal(nop.__plus__(), 0); // avoid NaN
      });
      it("__minus__", function() {
        assert.equal(nop.__minus__(), 0); // avoid NaN
      });
    });
    describe("bop", function() {
      it("__add__", function() {
        assert.equal(nop.__add__("str"), nop.toString() + "str");
      });
      it("__sub__", function() {
        assert.equal(nop.__sub__(0), 0);
      });
      it("__mul__", function() {
        assert.equal(nop.__mul__(0), 0);
        var func2 = function(x) {
          return x * 100;
        }.__mul__(function(x) {
          return x + 1;
        });
        assert.equal(func2(0), 100);
      });
      it("__div__", function() {
        assert.equal(nop.__div__(0), 0);
      });
      it("__mod__", function() {
        assert.equal(nop.__mod__(0), 0);
      });
      it("__and__", function() {
        assert.deepEqual(nop.__and__(nop), ["and", nop, nop]);
      });
      it("__or__", function() {
        assert.deepEqual(nop.__or__(nop), ["or", nop, nop]);
      });
      it("dup", function() {
        actual   = function(i) {
          return i;
        }.dup();
        expected = [0, 1];
        assert.deepEqual(actual, expected);
      });
    });
  });

});
