define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;

  var cc     = require("./cc");
  var number = require("./number");

  
  function UGen() {
  }
  function UnaryOpUGen(selector, a) {
    assert.instanceOf(a, UGen);
    this.selector = selector;
  }
  
  describe("number.js", function() {
    var ugen;
    before(function() {
      cc.UGen = UGen;
      cc.createUnaryOpUGen = function(selector, a) {
        return new UnaryOpUGen(selector, a);
      };
      ugen = new UGen();
      number.exports();
    });
    it("neg", function() {
      assert.closeTo((+5.2).neg(), -5.2, 1e-6);
      assert.closeTo(( 0.0).neg(),  0.0, 1e-6);
      assert.closeTo((-5.2).neg(), +5.2, 1e-6);
    });
    it("not", function() {
      assert.closeTo((+5.2).not(), 0, 1e-6);
      assert.closeTo(( 0.0).not(), 1, 1e-6);
      assert.closeTo((-5.2).not(), 0, 1e-6);
    });
    it("abs", function() {
      assert.closeTo((+5.2).abs(), 5.2, 1e-6);
      assert.closeTo(( 0.0).abs(), 0.0, 1e-6);
      assert.closeTo((-5.2).abs(), 5.2, 1e-6);
    });
    it("ceil", function() {
      assert.closeTo((+5.2).ceil(),  6, 1e-6);
      assert.closeTo(( 0.0).ceil(),  0, 1e-6);
      assert.closeTo((-5.2).ceil(), -5, 1e-6);
    });
    it("floor", function() {
      assert.closeTo((+5.2).floor(),  5, 1e-6);
      assert.closeTo(( 0.0).floor(),  0, 1e-6);
      assert.closeTo((-5.2).floor(), -6, 1e-6);
    });
    it("frac", function() {
      assert.closeTo((+5.2).frac(), 0.2, 1e-6);
      assert.closeTo(( 0.0).frac(), 0.0, 1e-6);
      assert.closeTo((-5.2).frac(), 0.8, 1e-6);
    });
    it("sign", function() {
      assert.closeTo((+5.2).sign(), +1, 1e-6);
      assert.closeTo(( 0.0).sign(),  0, 1e-6);
      assert.closeTo((-5.2).sign(), -1, 1e-6);
    });
    it("squared", function() {
      assert.closeTo((+2.2).squared(), 4.84, 1e-6);
      assert.closeTo(( 0.0).squared(), 0.00, 1e-6);
      assert.closeTo((-2.2).squared(), 4.84, 1e-6);
    });
    it("cubed", function() {
      assert.closeTo((+2.2).cubed(), +10.648, 1e-6);
      assert.closeTo(( 0.0).cubed(),   0.000, 1e-6);
      assert.closeTo((-2.2).cubed(), -10.648, 1e-6);
    });
    it("sqrt", function() {
      assert.closeTo((+2.2).sqrt(), Math.sqrt(2.2), 1e-6);
      assert.closeTo(( 0.0).sqrt(), Math.sqrt(0.0), 1e-6);
      assert.closeTo((-2.2).sqrt(), Math.sqrt(2.2), 1e-6);
    });
    it("exp", function() {
      assert.closeTo((+2.2).exp(), Math.exp(+2.2), 1e-6);
      assert.closeTo(( 0.0).exp(), Math.exp( 0.0), 1e-6);
      assert.closeTo((-2.2).exp(), Math.exp(-2.2), 1e-6);
    });
    it("reciprocal", function() {
      assert.closeTo((+2.2).reciprocal(), 1/+2.2, 1e-6);
      assert.equal((0).reciprocal(), Infinity);
      assert.closeTo((-2.2).reciprocal(), 1/-2.2, 1e-6);
    });
    it("midicps", function() {
      assert.closeTo((+60).midicps(), 261.6255653006 , 1e-6);
      assert.closeTo((  0).midicps(), 8.1757989156437, 1e-6);
      assert.closeTo((-10).midicps(), 4.5885119987095, 1e-6);
    });
    it("cpsmidi", function() {
      assert.closeTo((880).cpsmidi(), 81, 1e-6);
      assert.equal((0).cpsmidi(), -Infinity);
      assert.closeTo((500).cpsmidi(), 71.213094853649, 1e-6);
    });
    it("midiratio", function() {
      assert.closeTo((+2.2).midiratio(), 1.1355044290703, 1e-6);
      assert.closeTo(( 0.0).midiratio(), 1, 1e-6);
      assert.closeTo((-2.2).midiratio(), 0.8806658735966, 1e-6);
    });
    it("ratiomidi", function() {
      assert.closeTo((+2.2).ratiomidi(), 13.650042284999, 1e-6);
      assert.equal(( 0.0).ratiomidi(), -Infinity);
      assert.closeTo((-2.2).ratiomidi(), 13.650042284999, 1e-6);
    });
    it("dbamp", function() {
      assert.closeTo((+2.2).dbamp(), 1.2882495516931, 1e-6);
      assert.closeTo(( 0.0).dbamp(), 1, 1e-6);
      assert.closeTo((-2.2).dbamp(), 0.77624711662869, 1e-6);
    });
    it("ampdb", function() {
      assert.closeTo((+2.2).ampdb(), 6.8484536164441, 1e-6);
      assert.equal((0).ampdb(), -Infinity);
      assert.closeTo((-2.2).ampdb(), 6.8484536164441, 1e-6);
    });
    it("octcps", function() {
      assert.closeTo((+2.2).octcps(), 75.132214121492, 1e-6);
      assert.closeTo(( 0.0).octcps(), 16.351597831287, 1e-6);
      assert.closeTo((-2.2).octcps(), 3.5587231757047, 1e-6);
    });
    it("cpsoct", function() {
      assert.closeTo((+2.2).cpsoct(), -2.893856189792, 1e-6);
      assert.equal((0.0).cpsoct(), -Infinity);
      assert.closeTo((-2.2).cpsoct(), -2.893856189792, 1e-6);
    });
    it("log", function() {
      assert.closeTo((+2.2).log(), 0.78845736036427, 1e-6);
      assert.equal((0.0).log(), -Infinity);
      assert.closeTo((-2.2).log(), 0.78845736036427, 1e-6);
    });
    it("log2", function() {
      assert.closeTo((+2.2).log2(), 1.1375035237499, 1e-6);
      assert.equal((0.0).log(), -Infinity);
      assert.closeTo((-2.2).log2(), 1.1375035237499, 1e-6);
    });
    it("log10", function() {
      assert.closeTo((+2.2).log10(), 0.34242268082221, 1e-6);
      assert.equal((0.0).log(), -Infinity);
      assert.closeTo((-2.2).log10(), 0.34242268082221, 1e-6);
    });
    it("sin", function() {
      assert.closeTo((+2.2).sin(),  0.80849640381959, 1e-6);
      assert.closeTo(( 0.0).sin(),  0, 1e-6);
      assert.closeTo((-2.2).sin(), -0.80849640381959, 1e-6);
    });
    it("cos", function() {
      assert.closeTo((+2.2).cos(), -0.58850111725535, 1e-6);
      assert.closeTo(( 0.0).cos(),  1, 1e-6);
      assert.closeTo((-2.2).cos(), -0.58850111725535, 1e-6);
    });
    it("tan", function() {
      assert.closeTo((+2.2).tan(), -1.3738230567688, 1e-6);
      assert.closeTo(( 0.0).tan(),  0, 1e-6);
      assert.closeTo((-2.2).tan(),  1.3738230567688, 1e-6);
    });
    it("asin", function() {
      assert.closeTo((+1).asin(),  1.5707963267949, 1e-6);
      assert.closeTo(( 0).asin(),  0, 1e-6);
      assert.closeTo((-1).asin(), -1.5707963267949, 1e-6);
    });
    it("acos", function() {
      assert.closeTo((+1).acos(), 0, 1e-6);
      assert.closeTo(( 0).acos(), 1.5707963267949, 1e-6);
      assert.closeTo((-1).acos(), 3.1415926535898, 1e-6);
    });
    it("atan", function() {
      assert.closeTo((+1).atan(),  0.78539816339745, 1e-6);
      assert.closeTo(( 0).atan(),  0, 1e-6);
      assert.closeTo((-1).atan(), -0.78539816339745, 1e-6);
    });
    it("sinh", function() {
      assert.closeTo((+1).sinh(),  1.1752011936438, 1e-6);
      assert.closeTo(( 0).sinh(),  0, 1e-6);
      assert.closeTo((-1).sinh(), -1.1752011936438, 1e-6);
    });
    it("cosh", function() {
      assert.closeTo((+1).cosh(), 1.5430806348152, 1e-6);
      assert.closeTo(( 0).cosh(), 1, 1e-6);
      assert.closeTo((-1).cosh(), 1.5430806348152, 1e-6);
    });
    it("tanh", function() {
      assert.closeTo((+1).tanh(),  0.76159415595576, 1e-6);
      assert.closeTo(( 0).tanh(),  0, 1e-6);
      assert.closeTo((-1).tanh(), -0.76159415595576, 1e-6);
    });
    it("rand", function() {
      assert.isNumber((1).rand());
    });
    it("rand2", function() {
      assert.isNumber((1).rand2());
    });
    it("linrand", function() {
      assert.isNumber((1).linrand());
    });
    it("bilinrand", function() {
      assert.isNumber((1).bilinrand());
    });
    it("sum3rand", function() {
      assert.isNumber((1).sum3rand());
    });
    it("distort", function() {
      assert.closeTo((+2.2).distort(), +0.6875, 1e-6);
      assert.closeTo(( 0.0).distort(),  0, 1e-6);
      assert.closeTo((-2.2).distort(), -0.6875, 1e-6);
    });
    it("softclip", function() {
      assert.closeTo((+2.2).softclip(), +0.88636363636364, 1e-6);
      assert.closeTo(( 0.0).softclip(),  0, 1e-6);
      assert.closeTo((-2.2).softclip(), -0.88636363636364, 1e-6);
    });
    it("coin", function() {
      assert.isFalse((0).coin());
      assert.isTrue((1).coin());
    });
    it("num", function() {
      assert.closeTo(( 2.2).num(), + 2.2, 1e-6);
      assert.closeTo(( 0.0).num(), + 0.0, 1e-6);
      assert.closeTo((-2.2).num(), +-2.2, 1e-6);
    });
    it("tilde", function() {
      assert.closeTo(( 2.2).tilde(), ~ 2.2, 1e-6);
      assert.closeTo(( 0.0).tilde(), ~ 0.0, 1e-6);
      assert.closeTo((-2.2).tilde(), ~-2.2, 1e-6);
    });
    it("pi", function() {
      assert.closeTo(( 10).pi(),  31.415926535898, 1e-6);
      assert.closeTo((  0).pi(),   0, 1e-6);
      assert.closeTo((-10).pi(), -31.415926535898, 1e-6);
    });

    it("ugen", function() {
      assert.equal(ugen.abs().selector, "abs");
    });
    it("array", function() {
      var actual   = [ -1, -0.5, 0, 0.5, 1 ].abs();
      var expected = [ +1, +0.5, 0, 0.5, 1 ];
      assert.deepEqual(actual, expected);
    });
  });

});
