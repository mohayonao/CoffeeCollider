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
      it("UGen + UGen", function() {
        var a = UGen.new1(C.AUDIO);
        var b = UGen.new1(C.AUDIO);
        var x = BinaryOpUGen.new1(null, "+", a, b);
        assert.instanceOf(x, BinaryOpUGen);
        assert.equal(x.inputs[0], a);
        assert.equal(x.inputs[1], b);
        assert.equal(x.op, "+");
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
      it("BinaryOpUGen(+) -> Sum3", function() {
        var a = UGen.new1(C.AUDIO);
        var b = UGen.new1(C.AUDIO);
        var c = UGen.new1(C.AUDIO);
        var x = BinaryOpUGen.new1(null, "+", a, b);
        var y = BinaryOpUGen.new1(null, "+", x, c);
        assert.instanceOf(y, Sum3);
        assert.equal(y.inputs[0], a);
        assert.equal(y.inputs[1], b);
        assert.equal(y.inputs[2], c);
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
      it("Sum3 -> BinaryOpUGen(+)", function() {
        [ 6, 5, 3 ].forEach(function(i) {
          var a = (i & 0x04) ? UGen.new1(C.AUDIO) : 0;
          var b = (i & 0x02) ? UGen.new1(C.AUDIO) : 0;
          var c = (i & 0x01) ? UGen.new1(C.AUDIO) : 0;
          var x = Sum3.new1(null, a, b, c);
          assert.instanceOf(x, BinaryOpUGen);
          assert.equal(x.op, "+");
        });
      });
      it("Sum3 -> BinaryOpUGen(+)", function() {
        [ 4, 2, 1 ].forEach(function(i) {
          var a = (i & 0x04) ? UGen.new1(C.AUDIO) : 0;
          var b = (i & 0x02) ? UGen.new1(C.AUDIO) : 0;
          var c = (i & 0x01) ? UGen.new1(C.AUDIO) : 0;
          var x = Sum3.new1(null, a, b, c);
          assert.include([a, b, c], x);
        });
        it("Sum3 -> Sum4", function() {
          var a = UGen.new1(C.AUDIO);
          var b = UGen.new1(C.AUDIO);
          var c = UGen.new1(C.AUDIO);
          var d = UGen.new1(C.AUDIO);
          var x = Sum3.new1(null, a, b, c);
          var y = BinaryOpUGen.new1(null, x, d);
          assert.instanceOf(y, Sum4);
          assert.equal(y.inputs[0], a);
          assert.equal(y.inputs[1], b);
          assert.equal(y.inputs[2], c);
          assert.equal(y.inputs[3], d);
        });
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
      it("Sum4 -> Sum3", function() {
        [ 7, 11, 13, 14 ].forEach(function(i) {
          var a = (i & 0x08) ? UGen.new1(C.AUDIO) : 0;
          var b = (i & 0x04) ? UGen.new1(C.AUDIO) : 0;
          var c = (i & 0x02) ? UGen.new1(C.AUDIO) : 0;
          var d = (i & 0x01) ? UGen.new1(C.AUDIO) : 0;
          var x = Sum4.new1(null, a, b, c, d);
          assert.instanceOf(x, Sum3);
        });
      });
      it("Sum4 -> BinaryOpUGen(+)", function() {
        [ 12, 10, 9, 6, 5, 3 ].forEach(function(i) {
          var a = (i & 0x08) ? UGen.new1(C.AUDIO) : 0;
          var b = (i & 0x04) ? UGen.new1(C.AUDIO) : 0;
          var c = (i & 0x02) ? UGen.new1(C.AUDIO) : 0;
          var d = (i & 0x01) ? UGen.new1(C.AUDIO) : 0;
          var x = Sum4.new1(null, a, b, c, d);
          assert.instanceOf(x, BinaryOpUGen);
          assert.equal(x.op, "+");
        });
      });
      it("Sum4 -> UGen", function() {
        [ 8, 4, 2, 1 ].forEach(function(i) {
          var a = (i & 0x08) ? UGen.new1(C.AUDIO) : 0;
          var b = (i & 0x04) ? UGen.new1(C.AUDIO) : 0;
          var c = (i & 0x02) ? UGen.new1(C.AUDIO) : 0;
          var d = (i & 0x01) ? UGen.new1(C.AUDIO) : 0;
          var x = Sum4.new1(null, a, b, c, d);
          assert.include([a, b, c, d], x);
        });
      });
    });
  });

});
