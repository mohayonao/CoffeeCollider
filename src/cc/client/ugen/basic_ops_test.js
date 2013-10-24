define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var UGen = require("./ugen").UGen;
  var basic_ops = require("./basic_ops");
  var BinaryOpUGen = basic_ops.BinaryOpUGen;
  var MulAdd = basic_ops.MulAdd;
  var Sum3 = basic_ops.Sum3;
  var Sum4 = basic_ops.Sum4;

  describe("basic_ops.js", function() {
    describe("BinaryOpUGen", function() {
      it("create", function() {
        var a = new UGen().init(C.AUDIO);
        var b = new UGen().init(C.AUDIO);
        var x = new BinaryOpUGen().init("+", a, b);
        assert.instanceOf(x, BinaryOpUGen);
        assert.equal(x.inputs[0], a);
        assert.equal(x.inputs[1], b);
        assert.equal(x.op, "+");
      });
      it("UGen + 0 -> UGen", function() {
        var a = new UGen().init(C.AUDIO);
        var b = 0;
        var x = new BinaryOpUGen().init("+", a, b);
        assert.equal(x, a);
      });
      it("UGen * 1 -> UGen", function() {
        var a = new UGen().init(C.AUDIO);
        var b = 1;
        var x = new BinaryOpUGen().init("*", a, b);
        assert.equal(x, a);
      });
      it("UGen / 1 -> UGen", function() {
        var a = new UGen().init(C.AUDIO);
        var b = 1;
        var x = new BinaryOpUGen().init("/", a, b);
        assert.equal(x, a);
      });
      it("UGen * 0 -> 0", function() {
        var a = new UGen().init(C.AUDIO);
        var b = 0;
        var x = new BinaryOpUGen().init("*", a, b);
        assert.equal(x, 0);
      });
      it("BinaryOpUGen(+) -> Sum3", function() {
        var a = new UGen().init(C.AUDIO);
        var b = new UGen().init(C.AUDIO);
        var c = new UGen().init(C.AUDIO);
        var x = new BinaryOpUGen().init("+", a, b);
        var y = new BinaryOpUGen().init("+", x, c);
        assert.instanceOf(y, Sum3);
        assert.equal(y.inputs[0], a);
        assert.equal(y.inputs[1], b);
        assert.equal(y.inputs[2], c);
      });
      it("BinaryOpUGen(*) -> MulAdd", function() {
        var a = new UGen().init(C.AUDIO);
        var b = new UGen().init(C.AUDIO);
        var c = new UGen().init(C.AUDIO);
        var x = new BinaryOpUGen().init("*", a, b);
        var y = new BinaryOpUGen().init("+", x, c);
        assert.instanceOf(y, MulAdd);
        assert.equal(y.inputs[0], a);
        assert.equal(y.inputs[1], b);
        assert.equal(y.inputs[2], c);
      });
    });
    describe("MulAdd", function() {
      it("create", function() {
        var a = new UGen().init(C.AUDIO);
        var x = a.madd(2, 3);
        assert.instanceOf(x, MulAdd);
        assert.equal(x.inputs[0], a);
        assert.equal(x.inputs[1], 2);
        assert.equal(x.inputs[2], 3);
      });
      it("MulAdd -> BinaryOpUGen(*)", function() {
        var a = new UGen().init(C.AUDIO);
        var x = a.madd(2);
        assert.instanceOf(x, BinaryOpUGen);
        assert.equal(x.inputs[0], a);
        assert.equal(x.inputs[1], 2);
        assert.equal(x.op, "*");
      });
      it("MulAdd -> BinaryOpUGen(+)", function() {
        var a = new UGen().init(C.AUDIO);
        var x = a.madd(1, 3);
        assert.instanceOf(x, BinaryOpUGen);
        assert.equal(x.inputs[0], a);
        assert.equal(x.inputs[1], 3);
        assert.equal(x.op, "+");
      });
      it("MulAdd + Number -> MulAdd", function() {
        var a = new UGen().init(C.AUDIO).madd(2, 3);
        var x = new BinaryOpUGen().init("+", a, 2);
        assert.equal(x, a);
        assert.equal(x.inputs[2], 5);
      });
      it("MulAdd + Number -> BinaryOpUGen(*)", function() {
        var a = new UGen().init(C.AUDIO).madd(2, 3);
        var x = new BinaryOpUGen().init("+", a, -3);
        assert.instanceOf(x, BinaryOpUGen);
        assert.equal(x.op, "*");
      });
    });
    describe("Sum3", function() {
      it("create", function() {
        var a = new UGen().init(C.AUDIO);
        var b = new UGen().init(C.AUDIO);
        var c = new UGen().init(C.AUDIO);
        var x = new Sum3().init(a, b, c);
        assert.instanceOf(x, Sum3);
        assert.equal(x.inputs[0], a);
        assert.equal(x.inputs[1], b);
        assert.equal(x.inputs[2], c);
      });
      it("Sum3 -> BinaryOpUGen(+)", function() {
        [ 6, 5, 3 ].forEach(function(i) {
          var a = (i & 0x04) ? new UGen().init(C.AUDIO) : 0;
          var b = (i & 0x02) ? new UGen().init(C.AUDIO) : 0;
          var c = (i & 0x01) ? new UGen().init(C.AUDIO) : 0;
          var x = new Sum3().init(a, b, c);
          assert.instanceOf(x, BinaryOpUGen);
          assert.equal(x.op, "+");
        });
      });
      it("Sum3 -> Sum4", function() {
        var a = new UGen().init(C.AUDIO);
        var b = new UGen().init(C.AUDIO);
        var c = new UGen().init(C.AUDIO);
        var d = new UGen().init(C.AUDIO);
        var x = new Sum3().init(a, b, c);
        var y = new BinaryOpUGen().init("+", x, d);
        assert.instanceOf(y, Sum4);
        assert.equal(y.inputs[0], a);
        assert.equal(y.inputs[1], b);
        assert.equal(y.inputs[2], c);
        assert.equal(y.inputs[3], d);
      });
      it("Sum3 + Number -> Sum3", function() {
        var a = new UGen().init(C.AUDIO);
        var b = new UGen().init(C.AUDIO);
        var c = 3;
        var d = 7;
        var x = new Sum3().init(a, b, c);
        var y = new BinaryOpUGen().init("+", x, d);
        assert.instanceOf(y, Sum3);
        assert.equal(y.inputs[0], a);
        assert.equal(y.inputs[1], b);
        assert.equal(y.inputs[2], c + d);
      });
      it("Sum3 + Number -> BinaryOpUGen(+)", function() {
        var a = new UGen().init(C.AUDIO);
        var b = new UGen().init(C.AUDIO);
        var c = +3;
        var d = -3;
        var x = new Sum3().init(a, b, c);
        var y = new BinaryOpUGen().init("+", x, d);
        assert.instanceOf(y, BinaryOpUGen);
        assert.equal(y.inputs[0], a);
        assert.equal(y.inputs[1], b);
        assert.equal(y.op, "+");
      });
    });
    describe("Sum4", function() {
      it("create", function() {
        var a = new UGen().init(C.AUDIO);
        var b = new UGen().init(C.AUDIO);
        var c = new UGen().init(C.AUDIO);
        var d = new UGen().init(C.AUDIO);
        var x = new Sum4().init(a, b, c, d);
        assert.instanceOf(x, Sum4);
        assert.equal(x.inputs[0], a);
        assert.equal(x.inputs[1], b);
        assert.equal(x.inputs[2], c);
        assert.equal(x.inputs[3], d);
      });
      it("Sum4 -> Sum3", function() {
        [ 7, 11, 13, 14 ].forEach(function(i) {
          var a = (i & 0x08) ? new UGen().init(C.AUDIO) : 0;
          var b = (i & 0x04) ? new UGen().init(C.AUDIO) : 0;
          var c = (i & 0x02) ? new UGen().init(C.AUDIO) : 0;
          var d = (i & 0x01) ? new UGen().init(C.AUDIO) : 0;
          var x = new Sum4().init(a, b, c, d);
          assert.instanceOf(x, Sum3);
        });
      });
      it("Sum4 -> BinaryOpUGen(+)", function() {
        [ 12, 10, 9, 6, 5, 3 ].forEach(function(i) {
          var a = (i & 0x08) ? new UGen().init(C.AUDIO) : 0;
          var b = (i & 0x04) ? new UGen().init(C.AUDIO) : 0;
          var c = (i & 0x02) ? new UGen().init(C.AUDIO) : 0;
          var d = (i & 0x01) ? new UGen().init(C.AUDIO) : 0;
          var x = new Sum4().init(a, b, c, d);
          assert.instanceOf(x, BinaryOpUGen);
          assert.equal(x.op, "+");
        });
      });
      it("Sum4 + Number -> Sum4", function() {
        var a = new UGen().init(C.AUDIO);
        var b = new UGen().init(C.AUDIO);
        var c = new UGen().init(C.AUDIO);
        var d = 3;
        var e = 7;
        var x = new Sum4().init(a, b, c, d);
        var y = new BinaryOpUGen().init("+", x, e);
        assert.instanceOf(y, Sum4);
        assert.equal(y.inputs[0], a);
        assert.equal(y.inputs[1], b);
        assert.equal(y.inputs[2], c);
        assert.equal(y.inputs[3], d + e);
      });
      it("Sum4 + Number -> Sum3", function() {
        var a = new UGen().init(C.AUDIO);
        var b = new UGen().init(C.AUDIO);
        var c = new UGen().init(C.AUDIO);
        var d = +3;
        var e = -3;
        var x = new Sum4().init(a, b, c, d);
        var y = new BinaryOpUGen().init("+", x, e);
        assert.instanceOf(y, Sum3);
        assert.equal(y.inputs[0], a);
        assert.equal(y.inputs[1], b);
        assert.equal(y.inputs[2], c);
      });
    });
  });

});
