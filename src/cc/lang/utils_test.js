define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;
  var testTools = require("../../testTools");
  
  var utils = require("./utils");

  describe("lang/utils.js", function() {
    var actual, expected;

    testTools.mock("instanceOfUGen", function(obj) {
      return obj.klassName === "UGen";
    });
    
    it("isDict", function() {
      var __ = new (function() {})();
      assert.equal(true , utils.isDict({}), "{} is a dict");
      assert.equal(false, utils.isDict([]), "[] is NOT a dict");
      assert.equal(false, utils.isDict(__), "function is NOT a dict");
      assert.equal(false, utils.isDict(null), "null is NOT a dict");
    });
    it("asRate", function() {
      actual   = utils.asRate(null);
      expected = C.SCALAR;
      assert.equal(actual, expected, "null");
      
      actual   = utils.asRate(100);
      expected = C.SCALAR;
      assert.equal(actual, expected, "number");
      
      actual   = utils.asRate({rate:C.DEMAND});
      expected = C.DEMAND;
      assert.equal(actual, expected, "object");

      actual   = utils.asRate([
        { rate:C.SCALAR  },
        { rate:C.CONTROL },
        { rate:C.AUDIO   },
      ]);
      expected = C.AUDIO;
      assert.equal(actual, expected, "list");
    });
    it("asRateString", function() {
      actual   = utils.asRateString(C.SCALAR);
      expected = "scalar";
      assert.equal(actual, expected);

      actual   = utils.asRateString(C.CONTROL);
      expected = "control";
      assert.equal(actual, expected);

      actual   = utils.asRateString(C.AUDIO);
      expected = "audio";
      assert.equal(actual, expected);

      actual   = utils.asRateString(C.DEMAND);
      expected = "demand";
      assert.equal(actual, expected);

      actual   = utils.asRateString(null);
      expected = "unknown";
      assert.equal(actual, expected);
    });
    it("asNumber", function() {
      actual   = utils.asNumber(100);
      expected = 100;
      assert.equal(actual, expected);
      
      actual   = utils.asNumber(NaN);
      expected = 0;
      assert.equal(actual, expected);
      
      actual   = utils.asNumber({});
      expected = 0;
      assert.equal(actual, expected);
    });
    it("asString", function() {
      actual   = utils.asString(null);
      expected = "null";
      assert.equal(actual, expected);
      
      actual   = utils.asString(undefined);
      expected = "undefined";
      assert.equal(actual, expected);
      
      actual   = utils.asString({
        asString: function() {
          return "string";
        }
      });
      expected = "string";
      assert.equal(actual, expected);
      
      actual   = utils.asString(100);
      expected = "100";
      assert.equal(actual, expected);
    });
    it("asArray", function() {
      actual   = utils.asArray(null);
      expected = [];
      assert.deepEqual(actual, expected);
      
      actual   = utils.asArray(undefined);
      expected = [];
      assert.deepEqual(actual, expected);

      actual   = utils.asArray(0);
      expected = [ 0 ];
      assert.deepEqual(actual, expected);

      var list = [ 1, 2, 3 ];
      actual   = utils.asArray(list);
      expected = list;
      assert.equal(actual, expected);
    });
    it("asUGenInput", function() {
      actual   = utils.asUGenInput(null);
      expected = 0;
      assert.equal(actual, expected);

      actual   = utils.asUGenInput(undefined);
      expected = 0;
      assert.equal(actual, expected);

      actual   = utils.asUGenInput({
        asUGenInput: function() {
          return 1;
        }
      });
      expected = 1;
      assert.equal(actual, expected);
      
      actual   = utils.asUGenInput(2);
      expected = 2;
      assert.equal(actual, expected);
      
      actual   = utils.asUGenInput({});
      expected = 0;
      assert.equal(actual, expected);

      actual   = utils.asUGenInput([ 1, 2, 3 ]);
      expected = [ 1, 2, 3 ];
      assert.deepEqual(actual, expected);

      actual   = utils.asUGenInput({ klassName:"UGen" });
      expected = { klassName:"UGen" };
      assert.deepEqual(actual, expected);
    });
    it("flop", function() {
      var list = [
        [ "moe", "larry", "curly" ],
        [    30,      40,      50 ],
           true,
      ];
      actual = utils.flop(list);
      expected = [
        [ "moe"  , 30, true ],
        [ "larry", 40, true ],
        [ "curly", 50, true ],
      ];
      assert.deepEqual(actual, expected);
      
      assert.deepEqual(utils.flop([]), []);
    });
    it("flatten", function() {
      var list = [ 1, [2, [3]], [4, [5, [6]]] ];
      actual   = utils.flatten(list);
      expected = [ 1, 2, 3, 4, 5, 6 ];
      assert.deepEqual(actual, expected);
    });
    it("clump", function() {
      var list = [ 1, 2, 3, 4, 5, 6, 7, 8 ];
      actual = utils.clump(list, 3);
      expected = [ [ 1, 2, 3 ], [ 4, 5, 6 ], [ 7, 8 ] ];
      assert.deepEqual(actual, expected);
      assert.deepEqual(utils.clump([], 2), []);
    });
    it("lace", function() {
      var list =  [ [ 1, 2, 3 ], [ 6 ] ];
      actual   = utils.lace(list, 12);
      expected = [ 1, 6, 2, 6, 3, 6, 1, 6, 2, 6, 3, 6 ];
      assert.deepEqual(actual, expected);
    });
    it("bubble", function() {
      var list = [ [1, 2], [3, 4, [ 5, 6, 7, 8 ] ] ];
      actual   = utils.bubble(list, 0, 0);
      expected = [ [ [1, 2], [3, 4, [ 5, 6, 7, 8 ] ] ] ];
      assert.deepEqual(actual, expected);

      actual   = utils.bubble(list, 2, 0);
      expected = [ [ [ 1 ], [ 2 ] ], [ [ 3 ], [ 4 ], [ [ 5, 6, 7, 8 ] ] ] ];
      assert.deepEqual(actual, expected);

      actual   = utils.bubble(list, 2, 2);
      expected = [ [ [ [ 1 ] ], [ [ 2 ] ] ], [ [ [ 3 ] ], [ [ 4 ] ], [ [ [ 5, 6, 7, 8 ] ] ] ] ];
      assert.deepEqual(actual, expected);
    });
    it("unbubble", function() {
      var list = [ [1, 2], [3, 4, [ 5, 6, 7, 8 ] ] ];
      actual   = utils.unbubble(list, 0, 0);
      expected = [ [ 1, 2 ], [ 3, 4, [ 5, 6, 7, 8 ] ] ];
      assert.deepEqual(actual, expected);
      
      actual   = utils.unbubble(list, 2, 0);
      expected = [ [ 1, 2 ], [ 3, 4, [ 5, 6, 7, 8 ] ] ];
      assert.deepEqual(actual, expected);
      
      actual   = utils.unbubble([], 0, 0);
      expected = [];
      assert.deepEqual(actual, expected);
      
      actual   = utils.unbubble([], 0, 2);
      expected = undefined;
      assert.deepEqual(actual, expected);
    });
    it("maxSizeAtDepth", function() {
      actual   = utils.maxSizeAtDepth([], 0);
      expected = 0;
      assert.equal(actual, expected, "empty-list: rank(0)");
      
      actual   = utils.maxSizeAtDepth([], 1);
      expected = 0;
      assert.equal(actual, expected, "empty-list: rank(1)");

      var list = [ [1, 2], [3, 4, [ 5, 6, 7, 8 ] ] ];
      actual   = utils.maxSizeAtDepth(list, 0);
      expected = 2;
      assert.equal(actual, expected, "rank(0)");
      
      actual   = utils.maxSizeAtDepth(list, 1);
      expected = 3;
      assert.equal(actual, expected, "rank(1)");

      actual   = utils.maxSizeAtDepth(list, 2);
      expected = 4;
      assert.equal(actual, expected, "rank(2)");

      actual   = utils.maxSizeAtDepth(list, 3);
      expected = 1;
      assert.equal(actual, expected, "rank(3)");

      actual   = utils.maxSizeAtDepth(list, 4);
      expected = 1;
      assert.equal(actual, expected, "rank(4)");
    });
    it("wrapExtend", function() {
      var list = [ 1, 2, 3, 4, 5 ];
      actual   = utils.wrapExtend(list, 2);
      expected = [ 1, 2 ];
      assert.deepEqual(actual, expected);

      actual   = utils.wrapExtend(list, 12);
      expected = [ 1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 1, 2 ];
      assert.deepEqual(actual, expected);
    });
  });

});
