define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  
  var cc = require("./cc");
  require("./number");
  
  describe("number.js", function() {
    describe("uop", function() {
      it("neg", function() {
        assert.equal((+5.2).neg(), -5.2);
        assert.equal(( 0.0).neg(),  0.0);
        assert.equal((-5.2).neg(), +5.2);
      });
      it("not", function() {
        assert.equal((+5.2).not(), 0);
        assert.equal(( 0.0).not(), 1);
        assert.equal((-5.2).not(), 0);
      });
      it("abs", function() {
        assert.equal((+5.2).abs(), 5.2);
        assert.equal(( 0.0).abs(), 0.0);
        assert.equal((-5.2).abs(), 5.2);
      });
      it("ceil", function() {
        assert.equal((+5.2).ceil(),  6);
        assert.equal(( 0.0).ceil(),  0);
        assert.equal((-5.2).ceil(), -5);
      });
      it("floor", function() {
        assert.equal((+5.2).floor(),  5);
        assert.equal(( 0.0).floor(),  0);
        assert.equal((-5.2).floor(), -6);
      });
      it("frac", function() {
        assert.closeTo((+5.2).frac(), 0.2, 1e-6);
        assert.closeTo(( 0.0).frac(), 0.0, 1e-6);
        assert.closeTo((-5.2).frac(), 0.8, 1e-6);
      });
      it("sign", function() {
        assert.equal((+5.2).sign(), +1);
        assert.equal(( 0.0).sign(),  0);
        assert.equal((-5.2).sign(), -1);
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
        assert.equal(( 2.2).num(), + 2.2);
        assert.equal(( 0.0).num(), + 0.0);
        assert.equal((-2.2).num(), +-2.2);
      });
      it("tilde", function() {
        assert.equal(( 2.2).tilde(), ~ 2.2);
        assert.equal(( 0.0).tilde(), ~ 0.0);
        assert.equal((-2.2).tilde(), ~-2.2);
      });
      it("pi", function() {
        assert.closeTo(( 10).pi(),  31.415926535898, 1e-6);
        assert.closeTo((  0).pi(),   0, 1e-6);
        assert.closeTo((-10).pi(), -31.415926535898, 1e-6);
      });
    });
    describe("bop", function() {
      before(function() {
        cc.instanceOfUGen = function() {
          return false;
        };
      });
      it("eq", function() {
        assert.equal((-2.5).eq(-3.5), 0);
        assert.equal((-2.5).eq( 0.0), 0);
        assert.equal((-2.5).eq(+3.5), 0);
        assert.equal(( 0.0).eq(-3.5), 0);
        assert.equal(( 0.0).eq( 0.0), 1);
        assert.equal(( 0.0).eq(+3.5), 0);
        assert.equal((+2.5).eq(-3.5), 0);
        assert.equal((+2.5).eq( 0.0), 0);
        assert.equal((+2.5).eq(+3.5), 0);
      });
      it("ne", function() {
        assert.equal((-2.5).ne(-3.5), 1);
        assert.equal((-2.5).ne( 0.0), 1);
        assert.equal((-2.5).ne(+3.5), 1);
        assert.equal(( 0.0).ne(-3.5), 1);
        assert.equal(( 0.0).ne( 0.0), 0);
        assert.equal(( 0.0).ne(+3.5), 1);
        assert.equal((+2.5).ne(-3.5), 1);
        assert.equal((+2.5).ne( 0.0), 1);
        assert.equal((+2.5).ne(+3.5), 1);
      });
      it("lt", function() {
        assert.equal((-2.5).lt(-3.5), 0);
        assert.equal((-2.5).lt( 0.0), 1);
        assert.equal((-2.5).lt(+3.5), 1);
        assert.equal(( 0.0).lt(-3.5), 0);
        assert.equal(( 0.0).lt( 0.0), 0);
        assert.equal(( 0.0).lt(+3.5), 1);
        assert.equal((+2.5).lt(-3.5), 0);
        assert.equal((+2.5).lt( 0.0), 0);
        assert.equal((+2.5).lt(+3.5), 1);
      });
      it("gt", function() {
        assert.equal((-2.5).gt(-3.5), 1);
        assert.equal((-2.5).gt( 0.0), 0);
        assert.equal((-2.5).gt(+3.5), 0);
        assert.equal(( 0.0).gt(-3.5), 1);
        assert.equal(( 0.0).gt( 0.0), 0);
        assert.equal(( 0.0).gt(+3.5), 0);
        assert.equal((+2.5).gt(-3.5), 1);
        assert.equal((+2.5).gt( 0.0), 1);
        assert.equal((+2.5).gt(+3.5), 0);
      });
      it("le", function() {
        assert.equal((-2.5).le(-3.5), 0);
        assert.equal((-2.5).le( 0.0), 1);
        assert.equal((-2.5).le(+3.5), 1);
        assert.equal(( 0.0).le(-3.5), 0);
        assert.equal(( 0.0).le( 0.0), 1);
        assert.equal(( 0.0).le(+3.5), 1);
        assert.equal((+2.5).le(-3.5), 0);
        assert.equal((+2.5).le( 0.0), 0);
        assert.equal((+2.5).le(+3.5), 1);
      });
      it("ge", function() {
        assert.equal((-2.5).ge(-3.5), 1);
        assert.equal((-2.5).ge( 0.0), 0);
        assert.equal((-2.5).ge(+3.5), 0);
        assert.equal(( 0.0).ge(-3.5), 1);
        assert.equal(( 0.0).ge( 0.0), 1);
        assert.equal(( 0.0).ge(+3.5), 0);
        assert.equal((+2.5).ge(-3.5), 1);
        assert.equal((+2.5).ge( 0.0), 1);
        assert.equal((+2.5).ge(+3.5), 0);
      });
      it("bitAnd", function() {
        assert.equal((-2.5).bitAnd(-3.5), -4);
        assert.equal((-2.5).bitAnd( 0.0),  0);
        assert.equal((-2.5).bitAnd(+3.5),  2);
        assert.equal(( 0.0).bitAnd(-3.5),  0);
        assert.equal(( 0.0).bitAnd( 0.0),  0);
        assert.equal(( 0.0).bitAnd(+3.5),  0);
        assert.equal((+2.5).bitAnd(-3.5),  0);
        assert.equal((+2.5).bitAnd( 0.0),  0);
        assert.equal((+2.5).bitAnd(+3.5),  2);
      });
      it("bitOr", function() {
        assert.equal((-2.5).bitOr(-3.5), -1);
        assert.equal((-2.5).bitOr( 0.0), -2);
        assert.equal((-2.5).bitOr(+3.5), -1);
        assert.equal(( 0.0).bitOr(-3.5), -3);
        assert.equal(( 0.0).bitOr( 0.0),  0);
        assert.equal(( 0.0).bitOr(+3.5),  3);
        assert.equal((+2.5).bitOr(-3.5), -1);
        assert.equal((+2.5).bitOr( 0.0),  2);
        assert.equal((+2.5).bitOr(+3.5),  3);
      });
      it("bitXor", function() {
        assert.equal((-2.5).bitXor(-3.5),  3);
        assert.equal((-2.5).bitXor( 0.0), -2);
        assert.equal((-2.5).bitXor(+3.5), -3);
        assert.equal(( 0.0).bitXor(-3.5), -3);
        assert.equal(( 0.0).bitXor( 0.0),  0);
        assert.equal(( 0.0).bitXor(+3.5),  3);
        assert.equal((+2.5).bitXor(-3.5), -1);
        assert.equal((+2.5).bitXor( 0.0),  2);
        assert.equal((+2.5).bitXor(+3.5),  1);
      });
      it("min", function() {
        assert.equal((-2.5).min(-3.5), -3.5);
        assert.equal((-2.5).min( 0.0), -2.5);
        assert.equal((-2.5).min(+3.5), -2.5);
        assert.equal(( 0.0).min(-3.5), -3.5);
        assert.equal(( 0.0).min( 0.0),  0.0);
        assert.equal(( 0.0).min(+3.5),  0.0);
        assert.equal((+2.5).min(-3.5), -3.5);
        assert.equal((+2.5).min( 0.0),  0.0);
        assert.equal((+2.5).min(+3.5), +2.5);
      });
      it("max", function() {
        assert.equal((-2.5).max(-3.5), -2.5);
        assert.equal((-2.5).max( 0.0),  0.0);
        assert.equal((-2.5).max(+3.5), +3.5);
        assert.equal(( 0.0).max(-3.5),  0.0);
        assert.equal(( 0.0).max( 0.0),  0.0);
        assert.equal(( 0.0).max(+3.5), +3.5);
        assert.equal((+2.5).max(-3.5), +2.5);
        assert.equal((+2.5).max( 0.0), +2.5);
        assert.equal((+2.5).max(+3.5), +3.5);
      });
      it("lcm", function() {
        assert.equal((-42).lcm(-24), 168);
        assert.equal((-42).lcm(  0),   0);
        assert.equal((-42).lcm(+24), 168);
        assert.equal((  0).lcm(-24),   0);
        assert.equal((  0).lcm(  0),   0);
        assert.equal((  0).lcm(+24),   0);
        assert.equal((+42).lcm(-24), 168);
        assert.equal((+42).lcm(  0),   0);
        assert.equal((+42).lcm(+24), 168);
      });
      it("gcd", function() {
        assert.equal((-42).gcd(-24),  6);
        assert.equal((-42).gcd(  0), 42);
        assert.equal((-42).gcd(+24),  6);
        assert.equal((  0).gcd(-24), 24);
        assert.equal((  0).gcd(  0),  0);
        assert.equal((  0).gcd(+24), 24);
        assert.equal((+42).gcd(-24),  6);
        assert.equal((+42).gcd(  0), 42);
        assert.equal((+42).gcd(+24),  6);
      });
      it("round", function() {
        assert.closeTo((-31.4).round(-1.5), -31.5, 1e-6);
        assert.closeTo((-31.4).round( 0.0), -31.4, 1e-6);
        assert.closeTo((-31.4).round(+1.5), -31.5, 1e-6);
        assert.closeTo((  0.0).round(-1.5), - 0.0, 1e-6);
        assert.closeTo((  0.0).round( 0.0),   0.0, 1e-6);
        assert.closeTo((  0.0).round(+1.5),   0.0, 1e-6);
        assert.closeTo((+31.4).round(-1.5),  31.5, 1e-6);
        assert.closeTo((+31.4).round( 0.0),  31.4, 1e-6);
        assert.closeTo((+31.4).round(+1.5),  31.5, 1e-6);
      });
      it("roundUp", function() {
        assert.closeTo((-31.4).roundUp(-1.5), -31.5, 1e-6);
        assert.closeTo((-31.4).roundUp( 0.0), -31.4, 1e-6);
        assert.closeTo((-31.4).roundUp(+1.5), -30.0, 1e-6);
        assert.closeTo((  0.0).roundUp(-1.5),   0.0, 1e-6);
        assert.closeTo((  0.0).roundUp( 0.0),   0.0, 1e-6);
        assert.closeTo((  0.0).roundUp(+1.5),   0.0, 1e-6);
        assert.closeTo((+31.4).roundUp(-1.5),  30.0, 1e-6);
        assert.closeTo((+31.4).roundUp( 0.0),  31.4, 1e-6);
        assert.closeTo((+31.4).roundUp(+1.5),  31.5, 1e-6);
      });
      it("roundDown", function() {
        assert.closeTo((-31.4).roundDown(-1.5), -30.0, 1e-6);
        assert.closeTo((-31.4).roundDown( 0.0), -31.4, 1e-6);
        assert.closeTo((-31.4).roundDown(+1.5), -31.5, 1e-6);
        assert.closeTo((  0.0).roundDown(-1.5),   0.0, 1e-6);
        assert.closeTo((  0.0).roundDown( 0.0),   0.0, 1e-6);
        assert.closeTo((  0.0).roundDown(+1.5),   0.0, 1e-6);
        assert.closeTo((+31.4).roundDown(-1.5),  31.5, 1e-6);
        assert.closeTo((+31.4).roundDown( 0.0),  31.4, 1e-6);
        assert.closeTo((+31.4).roundDown(+1.5),  30.0, 1e-6);
      });
      it("trunc", function() {
        assert.closeTo((-31.4).trunc(-1.5), -30.0, 1e-6);
        assert.closeTo((-31.4).trunc( 0.0), -31.4, 1e-6);
        assert.closeTo((-31.4).trunc(+1.5), -31.5, 1e-6);
        assert.closeTo((  0.0).trunc(-1.5),   0.0, 1e-6);
        assert.closeTo((  0.0).trunc( 0.0),   0.0, 1e-6);
        assert.closeTo((  0.0).trunc(+1.5),   0.0, 1e-6);
        assert.closeTo((+31.4).trunc(-1.5),  31.5, 1e-6);
        assert.closeTo((+31.4).trunc( 0.0),  31.4, 1e-6);
        assert.closeTo((+31.4).trunc(+1.5),  30.0, 1e-6);
      });
      it("atan2", function() {
        assert.closeTo((-31.4).atan2(-1.5), -1.618530738892  , 1e-6);
        assert.closeTo((-31.4).atan2( 0.0), -1.5707963267949 , 1e-6);
        assert.closeTo((-31.4).atan2(+1.5), -1.5230619146978 , 1e-6);
        assert.closeTo((  0.0).atan2(-1.5),   3.1415926535898, 1e-6);
        assert.closeTo((  0.0).atan2( 0.0),   0.0, 1e-6);
        assert.closeTo((  0.0).atan2(+1.5),   0.0, 1e-6);
        assert.closeTo((+31.4).atan2(-1.5),  1.618530738892 , 1e-6);
        assert.closeTo((+31.4).atan2( 0.0),  1.5707963267949, 1e-6);
        assert.closeTo((+31.4).atan2(+1.5),  1.5230619146978, 1e-6);
      });
      it("hypot", function() {
        assert.closeTo((-31.4).hypot(-1.5), 31.435807608522, 1e-6);
        assert.closeTo((-31.4).hypot( 0.0), 31.4           , 1e-6);
        assert.closeTo((-31.4).hypot(+1.5), 31.435807608522, 1e-6);
        assert.closeTo((  0.0).hypot(-1.5),  1.5, 1e-6);
        assert.closeTo((  0.0).hypot( 0.0),  0.0, 1e-6);
        assert.closeTo((  0.0).hypot(+1.5),  1.5, 1e-6);
        assert.closeTo((+31.4).hypot(-1.5), 31.435807608522, 1e-6);
        assert.closeTo((+31.4).hypot( 0.0), 31.4           , 1e-6);
        assert.closeTo((+31.4).hypot(+1.5), 31.435807608522, 1e-6);
      });
      it("hypotApx", function() {
        assert.closeTo((-31.4).hypotApx(-1.5), 32.278679648042, 1e-6);
        assert.closeTo((-31.4).hypotApx( 0.0), 31.4           , 1e-6);
        assert.closeTo((-31.4).hypotApx(+1.5), 32.278679648042, 1e-6);
        assert.closeTo((  0.0).hypotApx(-1.5),  1.5, 1e-6);
        assert.closeTo((  0.0).hypotApx( 0.0),  0.0, 1e-6);
        assert.closeTo((  0.0).hypotApx(+1.5),  1.5, 1e-6);
        assert.closeTo((+31.4).hypotApx(-1.5), 32.278679648042, 1e-6);
        assert.closeTo((+31.4).hypotApx( 0.0), 31.4           , 1e-6);
        assert.closeTo((+31.4).hypotApx(+1.5), 32.278679648042, 1e-6);
      });
      it("pow", function() {
        assert.closeTo((-31.4).pow(-1.5),   0.0056833647312759, 1e-6);
        assert.closeTo((-31.4).pow( 0.0),   1                 , 1e-6);
        assert.closeTo((-31.4).pow(+1.5), 175.95210712009     , 1e-6);
        assert.equal  ((  0.0).pow(-1.5), Infinity);
        assert.closeTo((  0.0).pow( 0.0),   1.0, 1e-6);
        assert.closeTo((  0.0).pow(+1.5),   0.0, 1e-6);
        assert.closeTo((+31.4).pow(-1.5),   0.0056833647312759, 1e-6);
        assert.closeTo((+31.4).pow( 0.0),   1                 , 1e-6);
        assert.closeTo((+31.4).pow(+1.5), 175.95210712009     , 1e-6);
      });
      it("leftShift", function() {
        assert.equal((-31.4).leftShift(-1.5), -16);
        assert.equal((-31.4).leftShift( 0.0), -31);
        assert.equal((-31.4).leftShift(+1.5), -62);
        assert.equal((  0.0).leftShift(-1.5),   0);
        assert.equal((  0.0).leftShift( 0.0),   0);
        assert.equal((  0.0).leftShift(+1.5),   0);
        assert.equal((+31.4).leftShift(-1.5),  15);
        assert.equal((+31.4).leftShift( 0.0),  31);
        assert.equal((+31.4).leftShift(+1.5),  62);
      });
      it("rightShift", function() {
        assert.equal((-31.4).rightShift(-1.5), -62);
        assert.equal((-31.4).rightShift( 0.0), -31);
        assert.equal((-31.4).rightShift(+1.5), -16);
        assert.equal((  0.0).rightShift(-1.5),   0);
        assert.equal((  0.0).rightShift( 0.0),   0);
        assert.equal((  0.0).rightShift(+1.5),   0);
        assert.equal((+31.4).rightShift(-1.5),  62);
        assert.equal((+31.4).rightShift( 0.0),  31);
        assert.equal((+31.4).rightShift(+1.5),  15);
      });
      it("unsignedRightShift", function() {
        assert.equal((-31.4).unsignedRightShift(-1.5), -62);
        assert.equal((-31.4).unsignedRightShift( 0.0), -31);
        assert.equal((-31.4).unsignedRightShift(+1.5), -16);
        assert.equal((  0.0).unsignedRightShift(-1.5),   0);
        assert.equal((  0.0).unsignedRightShift( 0.0),   0);
        assert.equal((  0.0).unsignedRightShift(+1.5),   0);
        assert.equal((+31.4).unsignedRightShift(-1.5),  62);
        assert.equal((+31.4).unsignedRightShift( 0.0),  31);
        assert.equal((+31.4).unsignedRightShift(+1.5),  15);
      });
      it("ring1", function() {
        assert.closeTo((-31.4).ring1(-1.5),  15.7, 1e-6);
        assert.closeTo((-31.4).ring1( 0.0), -31.4, 1e-6);
        assert.closeTo((-31.4).ring1(+1.5), -78.5, 1e-6);
        assert.closeTo((  0.0).ring1(-1.5),   0.0, 1e-6);
        assert.closeTo((  0.0).ring1( 0.0),   0.0, 1e-6);
        assert.closeTo((  0.0).ring1(+1.5),   0.0, 1e-6);
        assert.closeTo((+31.4).ring1(-1.5), -15.7, 1e-6);
        assert.closeTo((+31.4).ring1( 0.0),  31.4, 1e-6);
        assert.closeTo((+31.4).ring1(+1.5),  78.5, 1e-6);
      });
      it("ring2", function() {
        assert.closeTo((-31.4).ring2(-1.5),  14.2, 1e-6);
        assert.closeTo((-31.4).ring2( 0.0), -31.4, 1e-6);
        assert.closeTo((-31.4).ring2(+1.5), -77.0, 1e-6);
        assert.closeTo((  0.0).ring2(-1.5),  -1.5, 1e-6);
        assert.closeTo((  0.0).ring2( 0.0),   0.0, 1e-6);
        assert.closeTo((  0.0).ring2(+1.5),   1.5, 1e-6);
        assert.closeTo((+31.4).ring2(-1.5), -17.2, 1e-6);
        assert.closeTo((+31.4).ring2( 0.0),  31.4, 1e-6);
        assert.closeTo((+31.4).ring2(+1.5),  80.0, 1e-6);
      });
      it("ring3", function() {
        assert.closeTo((-31.4).ring3(-1.5), -1478.94, 1e-6);
        assert.closeTo((-31.4).ring3( 0.0),     0.00, 1e-6);
        assert.closeTo((-31.4).ring3(+1.5),  1478.94, 1e-6);
        assert.closeTo((  0.0).ring3(-1.5),     -0.0, 1e-6);
        assert.closeTo((  0.0).ring3( 0.0),      0.0, 1e-6);
        assert.closeTo((  0.0).ring3(+1.5),      0.0, 1e-6);
        assert.closeTo((+31.4).ring3(-1.5), -1478.94, 1e-6);
        assert.closeTo((+31.4).ring3( 0.0),      0.0, 1e-6);
        assert.closeTo((+31.4).ring3(+1.5),  1478.94, 1e-6);
      });
      it("ring4", function() {
        assert.closeTo((-31.4).ring4(-1.5), -1408.29, 1e-6);
        assert.closeTo((-31.4).ring4( 0.0),     0.00, 1e-6);
        assert.closeTo((-31.4).ring4(+1.5),  1549.59, 1e-6);
        assert.closeTo((  0.0).ring4(-1.5),     -0.0, 1e-6);
        assert.closeTo((  0.0).ring4( 0.0),      0.0, 1e-6);
        assert.closeTo((  0.0).ring4(+1.5),      0.0, 1e-6);
        assert.closeTo((+31.4).ring4(-1.5), -1549.59, 1e-6);
        assert.closeTo((+31.4).ring4( 0.0),      0.0, 1e-6);
        assert.closeTo((+31.4).ring4(+1.5),  1408.29, 1e-6);
      });
      it("difsqr", function() {
        assert.closeTo((-31.4).difsqr(-1.5), 983.71, 1e-6);
        assert.closeTo((-31.4).difsqr( 0.0), 985.96, 1e-6);
        assert.closeTo((-31.4).difsqr(+1.5), 983.71, 1e-6);
        assert.closeTo((  0.0).difsqr(-1.5),  -2.25, 1e-6);
        assert.closeTo((  0.0).difsqr( 0.0),   0.00, 1e-6);
        assert.closeTo((  0.0).difsqr(+1.5),  -2.25, 1e-6);
        assert.closeTo((+31.4).difsqr(-1.5), 983.71, 1e-6);
        assert.closeTo((+31.4).difsqr( 0.0), 985.96, 1e-6);
        assert.closeTo((+31.4).difsqr(+1.5), 983.71, 1e-6);
      });
      it("sumsqr", function() {
        assert.closeTo((-31.4).sumsqr(-1.5), 988.21, 1e-6);
        assert.closeTo((-31.4).sumsqr( 0.0), 985.96, 1e-6);
        assert.closeTo((-31.4).sumsqr(+1.5), 988.21, 1e-6);
        assert.closeTo((  0.0).sumsqr(-1.5),   2.25, 1e-6);
        assert.closeTo((  0.0).sumsqr( 0.0),   0.00, 1e-6);
        assert.closeTo((  0.0).sumsqr(+1.5),   2.25, 1e-6);
        assert.closeTo((+31.4).sumsqr(-1.5), 988.21, 1e-6);
        assert.closeTo((+31.4).sumsqr( 0.0), 985.96, 1e-6);
        assert.closeTo((+31.4).sumsqr(+1.5), 988.21, 1e-6);
      });
      it("sqrdif", function() {
        assert.closeTo((-31.4).sqrdif(-1.5),  894.01, 1e-6);
        assert.closeTo((-31.4).sqrdif( 0.0),  985.96, 1e-6);
        assert.closeTo((-31.4).sqrdif(+1.5), 1082.41, 1e-6);
        assert.closeTo((  0.0).sqrdif(-1.5),    2.25, 1e-6);
        assert.closeTo((  0.0).sqrdif( 0.0),    0.00, 1e-6);
        assert.closeTo((  0.0).sqrdif(+1.5),    2.25, 1e-6);
        assert.closeTo((+31.4).sqrdif(-1.5), 1082.41, 1e-6);
        assert.closeTo((+31.4).sqrdif( 0.0),  985.96, 1e-6);
        assert.closeTo((+31.4).sqrdif(+1.5),  894.01, 1e-6);
      });
      it("absdif", function() {
        assert.closeTo((-31.4).absdif(-1.5), 29.9, 1e-6);
        assert.closeTo((-31.4).absdif( 0.0), 31.4, 1e-6);
        assert.closeTo((-31.4).absdif(+1.5), 32.9, 1e-6);
        assert.closeTo((  0.0).absdif(-1.5),  1.5, 1e-6);
        assert.closeTo((  0.0).absdif( 0.0),  0.0, 1e-6);
        assert.closeTo((  0.0).absdif(+1.5),  1.5, 1e-6);
        assert.closeTo((+31.4).absdif(-1.5), 32.9, 1e-6);
        assert.closeTo((+31.4).absdif( 0.0), 31.4, 1e-6);
        assert.closeTo((+31.4).absdif(+1.5), 29.9, 1e-6);
      });
      it("thresh", function() {
        assert.closeTo((-31.4).thresh(-1.5),  0.0, 1e-6);
        assert.closeTo((-31.4).thresh( 0.0),  0.0, 1e-6);
        assert.closeTo((-31.4).thresh(+1.5),  0.0, 1e-6);
        assert.closeTo((  0.0).thresh(-1.5),  0.0, 1e-6);
        assert.closeTo((  0.0).thresh( 0.0),  0.0, 1e-6);
        assert.closeTo((  0.0).thresh(+1.5),  0.0, 1e-6);
        assert.closeTo((+31.4).thresh(-1.5), 31.4, 1e-6);
        assert.closeTo((+31.4).thresh( 0.0), 31.4, 1e-6);
        assert.closeTo((+31.4).thresh(+1.5), 31.4, 1e-6);
      });
      it("amclip", function() {
        assert.closeTo((-31.4).amclip(-1.5), - 0.0, 1e-6);
        assert.closeTo((-31.4).amclip( 0.0), - 0.0, 1e-6);
        assert.closeTo((-31.4).amclip(+1.5), -47.1, 1e-6);
        assert.closeTo((  0.0).amclip(-1.5),   0.0, 1e-6);
        assert.closeTo((  0.0).amclip( 0.0),   0.0, 1e-6);
        assert.closeTo((  0.0).amclip(+1.5),   0.0, 1e-6);
        assert.closeTo((+31.4).amclip(-1.5),   0.0, 1e-6);
        assert.closeTo((+31.4).amclip( 0.0),   0.0, 1e-6);
        assert.closeTo((+31.4).amclip(+1.5),  47.1, 1e-6);
      });
      it("scaleneg", function() {
        assert.closeTo((-31.4).scaleneg(-1.5), -47.1, 1e-6);
        assert.closeTo((-31.4).scaleneg( 0.0),   0.0, 1e-6);
        assert.closeTo((-31.4).scaleneg(+1.5),  47.1, 1e-6);
        assert.closeTo((  0.0).scaleneg(-1.5),   0.0, 1e-6);
        assert.closeTo((  0.0).scaleneg( 0.0),   0.0, 1e-6);
        assert.closeTo((  0.0).scaleneg(+1.5),   0.0, 1e-6);
        assert.closeTo((+31.4).scaleneg(-1.5),  31.4, 1e-6);
        assert.closeTo((+31.4).scaleneg( 0.0),  31.4, 1e-6);
        assert.closeTo((+31.4).scaleneg(+1.5),  31.4, 1e-6);
      });
      it("clip2", function() {
        assert.closeTo((-31.4).clip2(-1.5),  1.5, 1e-6);
        assert.closeTo((-31.4).clip2( 0.0), -0.0, 1e-6);
        assert.closeTo((-31.4).clip2(+1.5), -1.5, 1e-6);
        assert.closeTo((  0.0).clip2(-1.5),  1.5, 1e-6);
        assert.closeTo((  0.0).clip2( 0.0),  0.0, 1e-6);
        assert.closeTo((  0.0).clip2(+1.5),  0.0, 1e-6);
        assert.closeTo((+31.4).clip2(-1.5),  1.5, 1e-6);
        assert.closeTo((+31.4).clip2( 0.0),  0.0, 1e-6);
        assert.closeTo((+31.4).clip2(+1.5),  1.5, 1e-6);
      });
      it("excess", function() {
        assert.closeTo((-31.4).excess(-1.5), -32.9, 1e-6);
        assert.closeTo((-31.4).excess( 0.0), -31.4, 1e-6);
        assert.closeTo((-31.4).excess(+1.5), -29.9, 1e-6);
        assert.closeTo((  0.0).excess(-1.5), - 1.5, 1e-6);
        assert.closeTo((  0.0).excess( 0.0),   0.0, 1e-6);
        assert.closeTo((  0.0).excess(+1.5),   0.0, 1e-6);
        assert.closeTo((+31.4).excess(-1.5),  29.9, 1e-6);
        assert.closeTo((+31.4).excess( 0.0),  31.4, 1e-6);
        assert.closeTo((+31.4).excess(+1.5),  29.9, 1e-6);
      });
      it("fold2", function() {
        assert.closeTo((-31.4).fold2(-1.5), -1.6, 1e-6);
        assert.closeTo((-31.4).fold2( 0.0), -0.0, 1e-6);
        assert.closeTo((-31.4).fold2(+1.5), -1.4, 1e-6);
        assert.closeTo((  0.0).fold2(-1.5), -3.0, 1e-6);
        assert.closeTo((  0.0).fold2( 0.0),  0.0, 1e-6);
        assert.closeTo((  0.0).fold2(+1.5),  0.0, 1e-6);
        assert.closeTo((+31.4).fold2(-1.5), -4.4, 1e-6);
        assert.closeTo((+31.4).fold2( 0.0), -0.0, 1e-6);
        assert.closeTo((+31.4).fold2(+1.5),  1.4, 1e-6);
      });
      it("wrap2", function() {
        assert.closeTo((-31.4).wrap2(-1.5), -1.4, 1e-6);
        assert.closeTo((-31.4).wrap2( 0.0), -0.0, 1e-6);
        assert.closeTo((-31.4).wrap2(+1.5), -1.4, 1e-6);
        assert.closeTo((  0.0).wrap2(-1.5),  0.0, 1e-6);
        assert.closeTo((  0.0).wrap2( 0.0),  0.0, 1e-6);
        assert.closeTo((  0.0).wrap2(+1.5),  0.0, 1e-6);
        assert.closeTo((+31.4).wrap2(-1.5),  1.4, 1e-6);
        assert.closeTo((+31.4).wrap2( 0.0), -0.0, 1e-6);
        assert.closeTo((+31.4).wrap2(+1.5),  1.4, 1e-6);
      });
    });
    describe("others", function() {
      before(function() {
        cc.createMulAdd = function(a, mul, add) {
          return a * mul + add;
        };
      });
      it("madd", function() {
        assert.equal((5).madd(2, 3), 5 * 2 + 3);
      });
    });
  });

});
