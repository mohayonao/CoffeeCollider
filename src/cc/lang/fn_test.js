define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  
  var cc = require("./cc");
  var fn = require("./fn");
  var ops = require("../common/ops");

  describe("lang/fn.js", function() {
    var actual, expected;
    var _instanceOfUGen, _createBinaryOpUGen, _DC;
    before(function() {
      _instanceOfUGen = cc.instanceOfUGen;
      _createBinaryOpUGen = cc.createBinaryOpUGen;
      _DC = cc.global.DC;
      
      cc.createBinaryOpUGen = function(ugenSelector, a, b) {
        return [ ugenSelector, a, b ];
      };
      cc.global.DC = function(rate, input) {
        return 1;
      };
    });
    after(function() {
      cc.instanceOfUGen = _instanceOfUGen;
      cc.createBinaryOpUGen = _createBinaryOpUGen;
      cc.global.DC = _DC;
    });
    
    describe("Fn", function() {
      it("none", function() {
        var calc = fn(function(val, mul, add) {
          return val * mul + add;
        }).build();
        
        actual   = calc(1, 2, 3);
        expected = 5;
        assert.equal(actual, expected);
        
        actual   = calc();
        assert.isTrue(isNaN(actual));
      });
      it("defaults", function() {
        var calc = fn(function(val, mul, add) {
          return val * mul + add;
        }).defaults("val=0,mul=1,add=0,opts").build();
        
        actual   = calc(10);
        expected = 10;
        assert.equal(actual, expected);

        actual   = calc(10, 2);
        expected = 20;
        assert.equal(actual, expected);

        actual   = calc(10, 2, 5);
        expected = 25;
        assert.equal(actual, expected);
      });
      it("defaults with dict", function() {
        var calc = fn(function(val, mul, add, opts) {
          return val * mul + add - opts.sub;
        }).defaults("val=0,mul=1,add=0,opts={}").build();
        
        actual   = calc(10, {add:20, sub:5});
        expected = 25; // 10 * 1 + 20 - 5
        assert.equal(actual, expected);
      });
      it("defaults with dict (not declared)", function() {
        var calc = fn(function(val, mul, add, opts) {
          assert.isUndefined(opts, "opts should be undefined, because not declared");
          return val * mul + add;
        }).defaults("val=0,mul=1,add=0").build();
        
        actual   = calc(10, {add:20, sub:5});
        expected = 30; // 10 * 1 + 20 - 10
        assert.equal(actual, expected);
      });
      it("multiCall", function() {
        var calc = fn(function(val, mul, add) {
          return val * mul + add;
        }).multiCall().build();

        actual   = calc([1,2], [10,50], [1,2,3,4]);
        expected = [
          1 * 10 + 1,
          2 * 50 + 2,
          1 * 10 + 3,
          2 * 50 + 4,
        ];
        assert.deepEqual(actual, expected);
        
        actual   = calc([[1,2], [3,4]], [10,50], [1,2,3,4]);
        expected = [
          [
            1 * 10 + 1,
            2 * 10 + 1,
          ],
          [
            3 * 50 + 2,
            4 * 50 + 2,
          ],
          [
            1 * 10 + 3,
            2 * 10 + 3,
          ],
          [
            3 * 50 + 4,
            4 * 50 + 4,
          ],
        ];
        assert.deepEqual(actual, expected);
      });
      it("multiCall * defaults", function() {
        var calc = fn(function(val, mul, add) {
          return val * mul + add;
        }).defaults("val=0,mul=1,add=0").multiCall().build();

        actual   = calc([1,2], {mul:[10,50]});
        expected = [
          1 * 10 + 0,
          2 * 50 + 0,
        ];
        assert.deepEqual(actual, expected);
      });
      it("multiCall(2)", function() {
        var calc = fn(function(val, mul, add) {
          return add.map(function(add) {
            return val * mul + add;
          });
        }).multiCall(2).build();
        
        actual   = calc([1,2], [10,50], [1,2,3,4]);
        expected = [
          [
            1 * 10 + 1,
            1 * 10 + 2,
            1 * 10 + 3,
            1 * 10 + 4,
          ],
          [
            2 * 50 + 1,
            2 * 50 + 2,
            2 * 50 + 3,
            2 * 50 + 4,
          ]
        ];
        assert.deepEqual(actual, expected);
      });
      it("multiCall(2) * defaults", function() {
        var calc = fn(function(val, mul, add) {
          return add.map(function(add) {
            return val * mul + add;
          });
        }).defaults("val=0,mul=1,add=0").multiCall(2).build();
        
        actual   = calc([1,2], {add:[1,2,3,4]});
        expected = [
          [
            1 * 1 + 1,
            1 * 1 + 2,
            1 * 1 + 3,
            1 * 1 + 4,
          ],
          [
            2 * 1 + 1,
            2 * 1 + 2,
            2 * 1 + 3,
            2 * 1 + 4,
          ]
        ];
        assert.deepEqual(actual, expected);
      });
      it("multiCall(-2)", function() {
        var calc = fn(function(val, mul, add) {
          return val.map(function(val) {
            return val * mul + add;
          });
        }).multiCall(-2).build();
        
        actual   = calc([1,2], [10,50], [1,2,3,4]);
        expected = [
          [
            1 * 10 + 1,
            2 * 10 + 1,
          ],
          [
            1 * 50 + 2,
            2 * 50 + 2,
          ],
          [
            1 * 10 + 3,
            2 * 10 + 3,
          ],
          [
            1 * 50 + 4,
            2 * 50 + 4,
          ]
        ];
        assert.deepEqual(actual, expected);
      });
      it("multiCall(-2) * defaults", function() {
        var calc = fn(function(val, mul, add) {
          return val.map(function(val) {
            return val * mul + add;
          });
        }).defaults("val=0,mul=1,add=0").multiCall(-2).build();
        
        actual   = calc([1,2], {add:[1,2,3,4]});
        expected = [
          [
            1 * 1 + 1,
            2 * 1 + 1,
          ],
          [
            1 * 1 + 2,
            2 * 1 + 2,
          ],
          [
            1 * 1 + 3,
            2 * 1 + 3,
          ],
          [
            1 * 1 + 4,
            2 * 1 + 4,
          ]
        ];
        assert.deepEqual(actual, expected);
      });
    });
    it("defineProperty", function() {
      fn.defineProperty(Array.prototype, "fn_test", function() {
        return "fn_test";
      });
      assert.equal([10].fn_test(), "fn_test");
    });
    it("defineBinaryProperty", function() {
      fn.defineBinaryProperty(Number.prototype, "fn_test", function(b) {
        return this + b;
      });
      cc.instanceOfUGen = function() {
        return false;
      };
      assert.equal((10).fn_test(5), 15);
      
      cc.instanceOfUGen = function() {
        return true;
      };
      assert.deepEqual((10).fn_test(5), ["fn_test", 10, 5]);
    });
    it("defineArityProperty", function() {
      fn.defineArityProperty(Number.prototype, "fn_test", function(a, b) {
        return this * a + b;
      });
      cc.instanceOfUGen = function() {
        return false;
      };
      assert.equal((10).fn_test(5, 3), 53);
      
      cc.instanceOfUGen = function() {
        return true;
      };
      assert.equal((10).fn_test(5, 3), 8);
    });
  });

});
