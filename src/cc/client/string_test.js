define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;

  var cc = require("./cc");

  describe("string.js", function() {
    before(function() {
      require("./string");
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
      it("__plus__", function() {
        assert.equal("-10".__plus__(), -10);
        assert.equal("str".__plus__(),   0); // avoid NaN
      });
      it("__minus__", function() {
        assert.equal("-10".__minus__(), +10);
        assert.equal("str".__minus__(),   0); // avoid NaN
      });
    });
    describe("bop", function() {
      it("__add__", function() {
        assert.equal("+10".__add__(1), "+101");
      });
      it("__sub__", function() {
        assert.equal("+10".__sub__(1), 9);
        assert.equal("str".__sub__(1), 0); // avoid NaN
      });
      it("__mul__", function() {
        assert.equal("+10".__mul__(0), "");
        assert.equal("+10".__mul__(2), "+10+10");
        assert.equal("str".__mul__("str"), 0); // avoid NaN
        assert.throw(function() {
          assert.equal("+10".__mul__(Infinity), "");
        }, RangeError);
      });
      it("__div__", function() {
        assert.deepEqual("+10".__div__(0), ["+10"]);
        assert.deepEqual("+10".__div__(1), ["+10"]);
        assert.deepEqual("+10".__div__(2), ["+1", "0"]);
        assert.deepEqual("+10".__div__(3), ["+", "1", "0"]);
        assert.deepEqual("+10".__div__(4), ["+", "1", "0"]);
        assert.deepEqual("+10".__div__(""), 0);
      });
      it("__mod__", function() {
        assert.deepEqual("+10".__mod__(0), ["+", "1", "0"]);
        assert.deepEqual("+10".__mod__(1), ["+", "1", "0"]);
        assert.deepEqual("+10".__mod__(2), ["+1", "0"]);
        assert.deepEqual("+10".__mod__(3), ["+10"]);
        assert.deepEqual("+10".__mod__(4), ["+10"]);
        assert.deepEqual("+10".__mod__(""), 0);
      });
    });
  });

});
