define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;

  var cc = require("./cc");
  var slice = [].slice;
  
  var UGen = (function() {
    function UGen(rate) {
      this.rate = rate;
      this.inputs = [];
    }
    UGen.prototype.init = function(rate) {
      this.rate = rate;
      this.inputs = slice.call(arguments, 1);
      return this;
    };
    return UGen;
  })();
  
  var MultiOutUGen = (function() {
    function MultiOutUGen() {
    }
    return MultiOutUGen;
  })();
  
  describe("lang/basic_ugen.js", function() {
    var actual, expected;
    var basic_ugen;
    var _UGen, _MultiOutUGen, _instanceOfUGen, _instanceOfBuffer;
    var u1, u2, u3, u4;
    before(function() {
      _UGen = cc.UGen;
      _MultiOutUGen = cc.MultiOutUGen;
      _instanceOfUGen = cc.instanceOfUGen;
      _instanceOfBuffer = cc.instanceOfBuffer;

      cc.UGen = UGen;
      cc.MultiOutUGen = MultiOutUGen;
      cc.instanceOfUGen = function(obj) {
        return obj instanceof UGen;
      };
      cc.instanceOfBuffer = function() {
        return false;
      };
      
      basic_ugen = require("./basic_ugen")
      u1 = new UGen(C.SCALAR);
      u2 = new UGen(C.CONTROL);
      u3 = new UGen(C.AUDIO);
      u4 = new UGen(C.AUDIO);
    });
    after(function() {
      cc.UGen = _UGen;
      cc.MultiOutUGen = _MultiOutUGen;
      cc.instanceOfUGen = _instanceOfUGen;
      cc.instanceOfBuffer = _instanceOfBuffer;
    });
    describe("UnaryOpUGen", function() {
      it("create", function() {
        actual = cc.createUnaryOpUGen("-", u1);
        assert.instanceOf(actual, basic_ugen.UnaryOpUGen);
        assert.deepEqual(actual.inputs, [u1]);
        
        assert.throws(function() {
          cc.createUnaryOpUGen("dummy", u1);
        }, "UnaryOpUGen: unknown operator 'dummy'");
      });
    });
    describe("BinaryOpUGen", function() {
      it("create", function() {
        actual = cc.createBinaryOpUGen("*", u1, u2);
        assert.instanceOf(actual, basic_ugen.BinaryOpUGen);
        assert.deepEqual(actual.inputs, [u1, u2]);
        
        assert.throws(function() {
          cc.createBinaryOpUGen("dummy", u1, u2);
        }, "BinaryOpUGen: unknown operator 'dummy'");
      });
    });
    describe("MulAdd", function() {
      it("create", function() {
        actual = cc.createMulAdd(u1, u2, u3);
        assert.instanceOf(actual, basic_ugen.MulAdd);
        assert.deepEqual(actual.inputs, [u2, u1, u3]);
        
        actual = cc.createMulAdd(u1, u2, 0);
        assert.instanceOf(actual, basic_ugen.BinaryOpUGen);
        assert.deepEqual(actual.inputs, [u2, u1]);
        assert.equal(actual.selector, "*");

        actual = cc.createMulAdd(u1, 1, u3);
        assert.instanceOf(actual, basic_ugen.BinaryOpUGen);
        assert.deepEqual(actual.inputs, [u1, u3]);
        assert.equal(actual.selector, "+");

        actual = cc.createMulAdd(u1, 1, 0);
        assert.equal(actual, u1);

        actual = cc.createMulAdd(u1, -1, 0);
        assert.instanceOf(actual, basic_ugen.BinaryOpUGen);
        assert.deepEqual(actual.inputs, [u1, -1]);
        assert.equal(actual.selector, "*");
        
        actual = cc.createMulAdd(u1, -1, u2);
        assert.instanceOf(actual, basic_ugen.BinaryOpUGen);
        assert.deepEqual(actual.inputs, [u2, u1]);
        assert.equal(actual.selector, "-");

        actual = cc.createMulAdd(2, 3, u2);
        assert.instanceOf(actual, basic_ugen.BinaryOpUGen);
        assert.deepEqual(actual.inputs, [u2, 6]);
        assert.equal(actual.selector, "+");
        
        actual = cc.createMulAdd(u1, 0, u3);
        assert.equal(actual, u3);

        actual = cc.createMulAdd(2, 3, 4);
        assert.equal(actual, 2 * 3 + 4);
      });
    });
    describe("Sum3", function() {
      it("create", function() {
        actual = cc.createSum3(u1, u2, u3);
        assert.instanceOf(actual, basic_ugen.Sum3);
        assert.deepEqual(actual.inputs, [u3, u2, u1]);
        
        actual = cc.createSum3(u1, u2, 0);
        assert.instanceOf(actual, basic_ugen.BinaryOpUGen);
        assert.deepEqual(actual.inputs, [u1, u2]);
        assert.equal(actual.selector, "+");

        actual = cc.createSum3(u1, 0, u3);
        assert.instanceOf(actual, basic_ugen.BinaryOpUGen);
        assert.deepEqual(actual.inputs, [u1, u3]);
        assert.equal(actual.selector, "+");

        actual = cc.createSum3(0, u2, u3);
        assert.instanceOf(actual, basic_ugen.BinaryOpUGen);
        assert.deepEqual(actual.inputs, [u2, u3]);
        assert.equal(actual.selector, "+");
      });
    });
    describe("Sum4", function() {
      it("create", function() {
        actual = cc.createSum4(u1, u2, u3, u4);
        assert.instanceOf(actual, basic_ugen.Sum4);
        assert.deepEqual(actual.inputs, [u3, u4, u2, u1]);
        
        actual = cc.createSum4(u1, u2, u3, 0);
        assert.instanceOf(actual, basic_ugen.Sum3);
        assert.deepEqual(actual.inputs, [u3, u2, u1]);

        actual = cc.createSum4(u1, u2, 0, u4);
        assert.instanceOf(actual, basic_ugen.Sum3);
        assert.deepEqual(actual.inputs, [u4, u2, u1]);

        actual = cc.createSum4(u1, 0, u3, u4);
        assert.instanceOf(actual, basic_ugen.Sum3);
        assert.deepEqual(actual.inputs, [u4, u3, u1]);

        actual = cc.createSum4(0, u2, u3, u4);
        assert.instanceOf(actual, basic_ugen.Sum3);
        assert.deepEqual(actual.inputs, [u4, u3, u2]);
      });
    });
  });
  
  module.exports = {};

});
