define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;

  var cc = require("./cc");
  var nop = function() {};
  
  describe("function.js", function() {
    before(function() {
      require("./function");
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
      before(function() {
        cc.instanceOfUGen = function() {
          return false;
        };
        cc.createTaskWaitLogic = function(logic, list) {
          return [logic].concat(list);
        };
      });
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
    });
  });

});
