define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var C = require("./const");
  var UGen = require("./ugen").UGen;
  var basic_ops = require("./basic_ops");
  var BinaryOpUGen = basic_ops.BinaryOpUGen;
  var MulAdd = basic_ops.MulAdd;
  var Sum3 = basic_ops.Sum3;
  var Sum4 = basic_ops.Sum4;

  describe("basic_ops", function() {
    describe("BinaryOpUGen", function() {
      it("UGen + UGen", function() {
        var a = UGen.new1(C.AUDIO);
        var b = UGen.new1(C.AUDIO);
        var x = BinaryOpUGen.new1(null, "+", a, b);
        assert.instanceOf(x, BinaryOpUGen);
        assert.equal(x.inputs[0], a);
        assert.equal(x.inputs[1], b);
        assert.equal(x.op, "+");
      });
      it("1 + 2", function() {
        var a = 1;
        var b = 2;
        var x = BinaryOpUGen.new1(null, "+", 1, 2);
        assert.equal(x, 3);
      });
      it("1 * 2", function() {
        var a = 1;
        var b = 2;
        var x = BinaryOpUGen.new1(null, "*", 1, 2);
        assert.equal(x, 2);
      });
      it("UGen + 0", function() {
        var a = UGen.new1(C.AUDIO);
        var b = 0;
        var x = BinaryOpUGen.new1(null, "+", a, b);
        assert.equal(x, a);
      });
      it("UGen * 1", function() {
        var a = UGen.new1(C.AUDIO);
        var b = 1;
        var x = BinaryOpUGen.new1(null, "*", a, b);
        assert.equal(x, a);
      });
      it("UGen / 1", function() {
        var a = UGen.new1(C.AUDIO);
        var b = 1;
        var x = BinaryOpUGen.new1(null, "/", a, b);
        assert.equal(x, a);
      });
      it("UGen * 0", function() {
        var a = UGen.new1(C.AUDIO);
        var b = 0;
        var x = BinaryOpUGen.new1(null, "*", a, b);
        assert.equal(x, 0);
      });
    });
    describe("Sum3", function() {
      it("create", function() {
        var a = UGen.new1(C.AUDIO);
        var b = UGen.new1(C.AUDIO);
        var c = UGen.new1(C.AUDIO);
        var x = Sum3.new1(null, a, b, c);
        assert.instanceOf(x, Sum3);
        assert.equal(x.inputs[0], a);
        assert.equal(x.inputs[1], b);
        assert.equal(x.inputs[2], c);
      });
    });
    describe("Sum4", function() {
      it("create", function() {
        var a = UGen.new1(C.AUDIO);
        var b = UGen.new1(C.AUDIO);
        var c = UGen.new1(C.AUDIO);
        var d = UGen.new1(C.AUDIO);
        var x = Sum4.new1(null, a, b, c, d);
        assert.instanceOf(x, Sum4);
        assert.equal(x.inputs[0], a);
        assert.equal(x.inputs[1], b);
        assert.equal(x.inputs[2], c);
        assert.equal(x.inputs[3], d);
      });
    });
  });

});
