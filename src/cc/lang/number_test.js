define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var testTools = require("../../testTools");
  
  require("./number");

  var cc     = require("./cc");
  var random = require("../common/random");
  
  describe("lang/number.js", function() {
    var actual, expected;
    testTools.mock("lang");
    testTools.mock("global.console");
    testTools.mock("createMulAdd");
    testTools.mock("instanceOfUGen", function() {
      return false;
    });
    testTools.mock("instanceOfSyncBlock");
    
    describe("class methods", function() {
    });
    
    describe("instance methods", function() {
      beforeEach(function() {
        cc.lang.random = new random.Random(1923);
      });
      it("exists?", function() {
        testTools.shouldBeImplementedMethods().forEach(function(selector) {
          assert.isFunction((1)[selector], selector);
        });
      });
      describe("common", function() {
        it("copy", function() {
          actual   = (10).copy();
          expected = 10;
          assert.equal(actual, expected);
        });
        it("clone", function() {
          actual   = (10).clone();
          expected = 10;
          assert.equal(actual, expected);
        });
        it("dup", function() {
          actual   = (10).dup();
          expected = [ 10, 10 ];
          assert.deepEqual(actual, expected);

          actual   = (10).dup(5);
          expected = [ 10, 10, 10, 10, 10 ];
          assert.deepEqual(actual, expected);
        });
        it("value", function() {
          actual   = (10).value();
          expected = 10;
          assert.equal(actual, expected);
        });
        it("valueArray", function() {
          actual   = (10).valueArray();
          expected = 10;
          assert.equal(actual, expected);
        });
        it("do", function() {
          var x = 0;
          actual   = (10).do(function(a, b) {
            x += a + b * 100;
          });
          expected = 10;
          assert.equal(actual, expected);
          assert.equal(x, (0+1+2+3+4+5+6+7+8+9) + (0+1+2+3+4+5+6+7+8+9)*100);
        });
        it("forBy", function() {
          var x = 0;
          actual   = (1).forBy(11, 2, function(a, b) {
            x += a + b * 100;
          });
          expected = 1;
          assert.equal(actual, expected);
          assert.equal(x, (1+3+5+7+9+11) + (0+1+2+3+4+5)*100);
          
          x = 0;
          actual   = (1).forBy(-11, -2, function(a, b) {
            x += a + b * 100;
          });
          expected = 1;
          assert.equal(actual, expected);
          assert.equal(x, (1+-1+-3+-5+-7+-9+-11) + (0+1+2+3+4+5+6)*100);
          
          x = 0;
          actual   = (1).forBy(11, 0, function(a, b) {
            x += a + b * 100;
          });
          expected = 1;
          assert.equal(actual, expected);
          assert.equal(x, 0);
        });
        it("forSeries", function() {
          var x = 0;
          actual   = (1).forSeries(3, 11, function(a, b) {
            x += a + b * 100;
          });
          expected = 1;
          assert.equal(actual, expected);
          assert.equal(x, (1+3+5+7+9+11) + (0+1+2+3+4+5)*100);
        });
        it("asUGenInput", function() {
          actual   = (1).asUGenInput();
          expected = 1;
          assert.equal(actual, expected);
        });
        it("asString", function() {
          actual   = (1).asString();
          expected = "1";
          assert.equal(actual, expected);
        });
      });
      describe("unary operators", function() {
        it("__plus__", function() {
          assert.equal(( 2.2).__plus__(), + 2.2);
          assert.equal(( 0.0).__plus__(), + 0.0);
          assert.equal((-2.2).__plus__(), +-2.2);
        });
        it("__minus__", function() {
          assert.equal((+5.2).__minus__(), -5.2);
          assert.equal(( 0.0).__minus__(),  0.0);
          assert.equal((-5.2).__minus__(), +5.2);
        });
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
        it("isNil", function() {
          assert.equal((+5.2).isNil(), 0);
          assert.equal(( 0.0).isNil(), 0);
          assert.equal((-5.2).isNil(), 0);
        });
        it("notNil", function() {
          assert.equal((+5.2).notNil(), 1);
          assert.equal(( 0.0).notNil(), 1);
          assert.equal((-5.2).notNil(), 1);
        });
        it("bitNot", function() {
          assert.equal((+5.2).bitNot(), ~(+5.2));
          assert.equal(( 0.0).bitNot(), ~( 0.0));
          assert.equal((-5.2).bitNot(), ~(-5.2));
        });
        it("abs", function() {
          assert.equal((+5.2).abs(), 5.2);
          assert.equal(( 0.0).abs(), 0.0);
          assert.equal((-5.2).abs(), 5.2);
        });
        it("asFloat", function() {
          assert.equal((+5.2).asFloat(), +5.2);
          assert.equal(( 0.0).asFloat(),  0.0);
          assert.equal((-5.2).asFloat(), -5.2);
        });
        it("asInt", function() {
          assert.equal((+5.2).asInt(), +5);
          assert.equal(( 0.0).asInt(),  0);
          assert.equal((-5.2).asInt(), -5);
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
          assert.closeTo((1).rand(), 0.33405005931854, 1e-6);
          assert.closeTo((1).rand(), 0.91484010219574, 1e-6);
          assert.closeTo((1).rand(), 0.69674623012543, 1e-6);
          assert.closeTo((1).rand(), 0.43466353416443, 1e-6);
          assert.closeTo((1).rand(), 0.42384505271912, 1e-6);
        });
        it("rand2", function() {
          assert.closeTo((1).rand2(), -0.33189988136292, 1e-6);
          assert.closeTo((1).rand2(),  0.82968020439148, 1e-6);
          assert.closeTo((1).rand2(),  0.39349246025085, 1e-6);
          assert.closeTo((1).rand2(), -0.13067293167114, 1e-6);
          assert.closeTo((1).rand2(), -0.15230989456177, 1e-6);
        });
        it("linrand", function() {
          assert.closeTo((1).linrand(), 0.33405009494163, 1e-6);
          assert.closeTo((1).linrand(), 0.4346636084374 , 1e-6);
          assert.closeTo((1).linrand(), 0.42384506762028, 1e-6);
          assert.closeTo((1).linrand(), 0.17639025277458, 1e-6);
          assert.closeTo((1).linrand(), 0.35166871570982, 1e-6);
        });
        it("bilinrand", function() {
          assert.closeTo((1).bilinrand(), -0.58079012040980 , 1e-6);
          assert.closeTo((1).bilinrand(),  0.26208262844011 , 1e-6);
          assert.closeTo((1).bilinrand(), -0.069381968583912, 1e-6);
          assert.closeTo((1).bilinrand(), -0.30127787753008 , 1e-6);
          assert.closeTo((1).bilinrand(), -0.11921075358987 , 1e-6);
        });
        it("sum3rand", function() {
          assert.closeTo((1).sum3rand(),  0.2970910315956  , 1e-6);
          assert.closeTo((1).sum3rand(), -0.098842858541508, 1e-6);
          assert.closeTo((1).sum3rand(), -0.32951526763871 , 1e-6);
          assert.closeTo((1).sum3rand(), -0.019507007217475, 1e-6);
          assert.closeTo((1).sum3rand(),  0.28263303760291 , 1e-6);
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
          assert.equal((0.5).coin(), true );
          assert.equal((0.5).coin(), false);
          assert.equal((0.5).coin(), false);
          assert.equal((0.5).coin(), true );
          assert.equal((0.5).coin(), true );
        });
        it.skip("digitvalue", function() {
        });
        it.skip("silence", function() {
        });
        it.skip("thru", function() {
        });
        it.skip("rectWindow", function() {
        });
        it.skip("hanWindow", function() {
        });
        it.skip("welWindow", function() {
        });
        it.skip("triWindow", function() {
        });
        it.skip("ramp", function() {
        });
        it.skip("scurve", function() {
        });
        it.skip("numunaryselectors", function() {
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
        it("to_i", function() {
          assert.equal(( 10.5).to_i(),  10);
          assert.equal((-10.5).to_i(), -10);
        });
        it("half", function() {
          assert.equal((10).half(), 5);
        });
        it("twice", function() {
          assert.equal((10).twice(), 20);
        });
      });
      describe("binary operators", function() {
        it("__add__", function() {
          assert.equal((-2.5).__add__(-3.5), -2.5 + -3.5);
          assert.equal((-2.5).__add__( 0.0), -2.5 +  0.0);
          assert.equal((-2.5).__add__(+3.5), -2.5 + +3.5);
          assert.equal(( 0.0).__add__(-3.5),  0.0 + -3.5);
          assert.equal(( 0.0).__add__( 0.0),  0.0 +  0.0);
          assert.equal(( 0.0).__add__(+3.5),  0.0 + +3.5);
          assert.equal((+2.5).__add__(-3.5),  2.5 + -3.5);
          assert.equal((+2.5).__add__( 0.0),  2.5 +  0.0);
          assert.equal((+2.5).__add__(+3.5),  2.5 + +3.5);
        });
        it("__sub__", function() {
          assert.equal((-2.5).__sub__(-3.5), -2.5 - -3.5);
          assert.equal((-2.5).__sub__( 0.0), -2.5 -  0.0);
          assert.equal((-2.5).__sub__(+3.5), -2.5 - +3.5);
          assert.equal(( 0.0).__sub__(-3.5),  0.0 - -3.5);
          assert.equal(( 0.0).__sub__( 0.0),  0.0 -  0.0);
          assert.equal(( 0.0).__sub__(+3.5),  0.0 - +3.5);
          assert.equal((+2.5).__sub__(-3.5),  2.5 - -3.5);
          assert.equal((+2.5).__sub__( 0.0),  2.5 -  0.0);
          assert.equal((+2.5).__sub__(+3.5),  2.5 - +3.5);
        });
        it("__mul__", function() {
          assert.equal((-2.5).__mul__(-3.5), -2.5 * -3.5);
          assert.equal((-2.5).__mul__( 0.0), -2.5 *  0.0);
          assert.equal((-2.5).__mul__(+3.5), -2.5 * +3.5);
          assert.equal(( 0.0).__mul__(-3.5),  0.0 * -3.5);
          assert.equal(( 0.0).__mul__( 0.0),  0.0 *  0.0);
          assert.equal(( 0.0).__mul__(+3.5),  0.0 * +3.5);
          assert.equal((+2.5).__mul__(-3.5),  2.5 * -3.5);
          assert.equal((+2.5).__mul__( 0.0),  2.5 *  0.0);
          assert.equal((+2.5).__mul__(+3.5),  2.5 * +3.5);
        });
        it("__div__", function() {
          assert.equal((-2.5).__div__(-3.5), -2.5 / -3.5);
          assert.equal((-2.5).__div__( 0.0), -2.5 /  0.0);
          assert.equal((-2.5).__div__(+3.5), -2.5 / +3.5);
          assert.equal(( 0.0).__div__(-3.5),  0.0 / -3.5);
          assert.equal(( 0.0).__div__( 0.0),  0.0); // avoid NaN
          assert.equal(( 0.0).__div__(+3.5),  0.0 / +3.5);
          assert.equal((+2.5).__div__(-3.5),  2.5 / -3.5);
          assert.equal((+2.5).__div__( 0.0),  2.5 /  0.0);
          assert.equal((+2.5).__div__(+3.5),  2.5 / +3.5);
        });
        it("__mod__", function() {
          assert.equal((-2.5).__mod__(-3.5), -2.5 % -3.5);
          assert.equal((-2.5).__mod__( 0.0),  0.0); // avoid NaN
          assert.equal((-2.5).__mod__(+3.5), -2.5 % +3.5);
          assert.equal(( 0.0).__mod__(-3.5),  0.0 % -3.5);
          assert.equal(( 0.0).__mod__( 0.0),  0.0); // avoid NaN
          assert.equal(( 0.0).__mod__(+3.5),  0.0 % +3.5);
          assert.equal((+2.5).__mod__(-3.5),  2.5 % -3.5);
          assert.equal((+2.5).__mod__( 0.0),  0.0); // avoid NaN
          assert.equal((+2.5).__mod__(+3.5),  2.5 % +3.5);
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
          assert.equal((  0).lcm(  0),   0); // avoid NaN
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
          assert.closeTo((-31.4).round( 0.0), -31.4, 1e-6); // avoid NaN
          assert.closeTo((-31.4).round(+1.5), -31.5, 1e-6);
          assert.closeTo((  0.0).round(-1.5), - 0.0, 1e-6);
          assert.closeTo((  0.0).round( 0.0),   0.0, 1e-6); // avoid NaN
          assert.closeTo((  0.0).round(+1.5),   0.0, 1e-6);
          assert.closeTo((+31.4).round(-1.5),  31.5, 1e-6);
          assert.closeTo((+31.4).round( 0.0),  31.4, 1e-6); // avoid NaN
          assert.closeTo((+31.4).round(+1.5),  31.5, 1e-6);
        });
        it("roundUp", function() {
          assert.closeTo((-31.4).roundUp(-1.5), -31.5, 1e-6);
          assert.closeTo((-31.4).roundUp( 0.0), -31.4, 1e-6); // avoid NaN
          assert.closeTo((-31.4).roundUp(+1.5), -30.0, 1e-6);
          assert.closeTo((  0.0).roundUp(-1.5),   0.0, 1e-6);
          assert.closeTo((  0.0).roundUp( 0.0),   0.0, 1e-6); // avoid NaN
          assert.closeTo((  0.0).roundUp(+1.5),   0.0, 1e-6);
          assert.closeTo((+31.4).roundUp(-1.5),  30.0, 1e-6);
          assert.closeTo((+31.4).roundUp( 0.0),  31.4, 1e-6); // avoid NaN
          assert.closeTo((+31.4).roundUp(+1.5),  31.5, 1e-6);
        });
        it("roundDown", function() {
          assert.closeTo((-31.4).roundDown(-1.5), -30.0, 1e-6);
          assert.closeTo((-31.4).roundDown( 0.0), -31.4, 1e-6); // avoid NaN
          assert.closeTo((-31.4).roundDown(+1.5), -31.5, 1e-6);
          assert.closeTo((  0.0).roundDown(-1.5),   0.0, 1e-6);
          assert.closeTo((  0.0).roundDown( 0.0),   0.0, 1e-6); // avoid NaN
          assert.closeTo((  0.0).roundDown(+1.5),   0.0, 1e-6);
          assert.closeTo((+31.4).roundDown(-1.5),  31.5, 1e-6);
          assert.closeTo((+31.4).roundDown( 0.0),  31.4, 1e-6); // avoid NaN
          assert.closeTo((+31.4).roundDown(+1.5),  30.0, 1e-6);
        });
        it("trunc", function() {
          assert.closeTo((-31.4).trunc(-1.5), -30.0, 1e-6);
          assert.closeTo((-31.4).trunc( 0.0), -31.4, 1e-6); // avoid NaN
          assert.closeTo((-31.4).trunc(+1.5), -31.5, 1e-6);
          assert.closeTo((  0.0).trunc(-1.5),   0.0, 1e-6);
          assert.closeTo((  0.0).trunc( 0.0),   0.0, 1e-6); // avoid NaN
          assert.closeTo((  0.0).trunc(+1.5),   0.0, 1e-6);
          assert.closeTo((+31.4).trunc(-1.5),  31.5, 1e-6);
          assert.closeTo((+31.4).trunc( 0.0),  31.4, 1e-6); // avoid NaN
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
        it.skip("fill", function() {
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
        it("sqrsum", function() {
          assert.closeTo((-31.4).sqrsum(-1.5), 1082.41, 1e-6);
          assert.closeTo((-31.4).sqrsum( 0.0),  985.96, 1e-6);
          assert.closeTo((-31.4).sqrsum(+1.5),  894.01, 1e-6);
          assert.closeTo((  0.0).sqrsum(-1.5),    2.25, 1e-6);
          assert.closeTo((  0.0).sqrsum( 0.0),    0.00, 1e-6);
          assert.closeTo((  0.0).sqrsum(+1.5),    2.25, 1e-6);
          assert.closeTo((+31.4).sqrsum(-1.5),  894.01, 1e-6);
          assert.closeTo((+31.4).sqrsum( 0.0),  985.96, 1e-6);
          assert.closeTo((+31.4).sqrsum(+1.5), 1082.41, 1e-6);
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
          assert.closeTo(( -2.0).fold2( 1.0),  0.0, 1e-6);
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
          assert.closeTo((  2.0).wrap2( 1.0),  0.0, 1e-6);
          assert.closeTo(( -2.0).wrap2( 1.0),  0.0, 1e-6);
        });
        it.skip("firstarg", function() {
        });
        it.skip("randrange", function() {
        });
        it.skip("exprandrange", function() {
        });
        it.skip("numbinaryselectors", function() {
        });
      });
      
      describe("arity operators", function() {
        it("madd", function() {
          assert.equal((5).madd(2, 3), 5 * 2 + 3);
        });
        it("range", function() {
          assert.equal((-1).range(0, 100), 0);
          assert.equal(( 0).range(0, 100), 0);
          assert.equal((0.2).range(0, 100), 20);
          assert.equal((0.5).range(0, 100), 50);
          assert.equal((1).range(0, 100), 100);
          assert.equal((2).range(0, 100), 100);
        });
        it("exprange", function() {
          assert.equal((-1).exprange(0.01, 100), 0.01);
          assert.equal(( 0).exprange(0.01, 100), 0.01);
          assert.closeTo((0.2).exprange(0.01, 100), 0.063095734448019, 1e-6);
          assert.equal((0.5).exprange(0.01, 100), 1);
          assert.equal((1).exprange(0.01, 100), 100);
          assert.equal((2).exprange(0.01, 100), 100);
        });
        it.skip("curverange", function() {
          
        });
        it("unipolar", function() {
          assert.equal((0.5).unipolar(10), 5);
        });
        it("bipolar", function() {
          assert.equal((0.5).bipolar(10), 0);
        });
        it("clip", function() {
          assert.equal((-1.0).clip(-0.8, 0.8), -0.8);
          assert.equal((-0.2).clip(-0.8, 0.8), -0.2);
          assert.equal((+0.2).clip(-0.8, 0.8), +0.2);
          assert.equal((+1.0).clip(-0.8, 0.8), +0.8);
        });
        it("fold", function() {
          assert.closeTo((-1.0).fold(-0.8, 0.8), -0.6, 1e-6);
          assert.closeTo((-0.2).fold(-0.8, 0.8), -0.2, 1e-6);
          assert.closeTo((+0.2).fold(-0.8, 0.8), +0.2, 1e-6);
          assert.closeTo((+1.0).fold(-0.8, 0.8), +0.6, 1e-6);
        });
        it("wrap", function() {
          assert.closeTo((-1.0).wrap(-0.8, 0.8), +0.6, 1e-6);
          assert.closeTo((-0.2).wrap(-0.8, 0.8), -0.2, 1e-6);
          assert.closeTo((+0.2).wrap(-0.8, 0.8), +0.2, 1e-6);
          assert.closeTo((+1.0).wrap(-0.8, 0.8), -0.6, 1e-6);
        });
        it("blend", function() {
          assert.closeTo((-1.0).blend(2, 0.8), 1.4 , 1e-6);
          assert.closeTo((-0.2).blend(2, 0.8), 1.56, 1e-6);
          assert.closeTo((+0.2).blend(2, 0.8), 1.64, 1e-6);
          assert.closeTo((+1.0).blend(2, 0.8), 1.8 , 1e-6);
          assert.closeTo((-1.0).blend(2, -0.8), -3.4 , 1e-6);
          assert.closeTo((-0.2).blend(2, -0.8), -1.96, 1e-6);
          assert.closeTo((+0.2).blend(2, -0.8), -1.24, 1e-6);
          assert.closeTo((+1.0).blend(2, -0.8),  0.2 , 1e-6);
        });
        it("lag", function() {
          assert.equal((0.5).lag(), 0.5);
        });
        it("lag2", function() {
          assert.equal((0.5).lag2(), 0.5);
        });
        it("lag3", function() {
          assert.equal((0.5).lag3(), 0.5);
        });
        it("lagud", function() {
          assert.equal((0.5).lagud(), 0.5);
        });
        it("lag2ud", function() {
          assert.equal((0.5).lag2ud(), 0.5);
        });
        it("lag3ud", function() {
          assert.equal((0.5).lag3ud(), 0.5);
        });
        it("varlag", function() {
          assert.equal((0.5).varlag(), 0.5);
        });
        it("slew", function() {
          assert.equal((0.5).slew(), 0.5);
        });
        it("linlin", function() {
          assert.closeTo((1).linlin(0, 10, 100, 1000), 190, 1e-6);
          assert.closeTo((1).linlin(0, 10, 100, 1000, "min"), 190, 1e-6);
          assert.closeTo((1).linlin(0, 10, 100, 1000, "max"), 190, 1e-6);

          assert.closeTo((5).linlin(6, 10, 100, 1000),  100, 1e-6);
          assert.closeTo((5).linlin(0,  4, 100, 1000), 1000, 1e-6);
          assert.closeTo((5).linlin(6, 10, 100, 1000, "min"),  100, 1e-6);
          assert.closeTo((5).linlin(0,  4, 100, 1000, "max"), 1000, 1e-6);
        });
        it("linexp", function() {
          assert.closeTo((1).linexp(0, 10, 100, 1000), 125.89254117942, 1e-6);
          assert.closeTo((1).linexp(0, 10, 100, 1000, "min"), 125.89254117942, 1e-6);
          assert.closeTo((1).linexp(0, 10, 100, 1000, "max"), 125.89254117942, 1e-6);

          assert.closeTo((5).linexp(6, 10, 100, 1000),  100, 1e-6);
          assert.closeTo((5).linexp(0,  4, 100, 1000), 1000, 1e-6);
          assert.closeTo((5).linexp(6, 10, 100, 1000, "min"),  100, 1e-6);
          assert.closeTo((5).linexp(0,  4, 100, 1000, "max"), 1000, 1e-6);
        });
        it("explin", function() {
          assert.closeTo((1).explin(0.001, 10, 100, 1000), 775, 1e-6);
          assert.closeTo((1).explin(0.001, 10, 100, 1000, "min"), 775, 1e-6);
          assert.closeTo((1).explin(0.001, 10, 100, 1000, "max"), 775, 1e-6);

          assert.closeTo((5).explin(    6, 10, 100, 1000),  100, 1e-6);
          assert.closeTo((5).explin(0.001,  4, 100, 1000), 1000, 1e-6);
          assert.closeTo((5).explin(    6, 10, 100, 1000, "min"),  100, 1e-6);
          assert.closeTo((5).explin(0.001,  4, 100, 1000, "max"), 1000, 1e-6);
        });
        it("expexp", function() {
          assert.closeTo((1).expexp(0.001, 10, 100, 1000), 562.34132519035, 1e-6);
          assert.closeTo((1).expexp(0.001, 10, 100, 1000, "min"), 562.34132519035, 1e-6);
          assert.closeTo((1).expexp(0.001, 10, 100, 1000, "max"), 562.34132519035, 1e-6);

          assert.closeTo((5).expexp(    6, 10, 100, 1000),  100, 1e-6);
          assert.closeTo((5).expexp(0.001,  4, 100, 1000), 1000, 1e-6);
          assert.closeTo((5).expexp(    6, 10, 100, 1000, "min"),  100, 1e-6);
          assert.closeTo((5).expexp(0.001,  4, 100, 1000, "max"), 1000, 1e-6);
        });
        it("lincurve", function() {
          assert.closeTo((-1.0).lincurve(-1, 1, 1, 100, -4), 1, 1e-6);
          assert.closeTo((-0.2).lincurve(-1, 1, 1, 100, -4), 81.486404641393, 1e-6);
          assert.closeTo((+0.2).lincurve(-1, 1, 1, 100, -4), 92.698438103309, 1e-6);
          assert.closeTo((+1.0).lincurve(-1, 1, 1, 100, -4), 100, 1e-6);
        });
        it("curvelin", function() {
          assert.closeTo((-1.0).curvelin(-1, 1, 1, 100, -4), 1, 1e-6);
          assert.closeTo((-0.2).curvelin(-1, 1, 1, 100, -4), -0.0014829932986402, 1e-6);
          assert.closeTo((+0.2).curvelin(-1, 1, 1, 100, -4), -0.00098963900683673, 1e-6);
          assert.closeTo((+1.0).curvelin(-1, 1, 1, 100, -4), 100, 1e-6);
        });
        it("bilin", function() {
          assert.closeTo((-1.0).bilin(0.1, -1, 1, 25, 1, 100, -4), 1, 1e-6);
          assert.closeTo((-0.2).bilin(0.1, -1, 1, 25, 1, 100, -4), 18.454545454545, 1e-6);
          assert.closeTo((+0.2).bilin(0.1, -1, 1, 25, 1, 100, -4), 33.333333333333, 1e-6);
          assert.closeTo((+1.0).bilin(0.1, -1, 1, 25, 1, 100, -4), 100, 1e-6);
        });
        it("rrand", function() {
          assert.closeTo((10).rrand(100), 40.064505338669, 1e-6);
          assert.closeTo((10).rrand(100), 92.335609197617, 1e-6);
          assert.closeTo((10).rrand(100), 72.707160711288, 1e-6);
          assert.closeTo((10).rrand(100), 49.119718074799, 1e-6);
          assert.closeTo((10).rrand(100), 48.14605474472 , 1e-6);
        });
        it("exprand", function() {
          assert.closeTo((10).exprand(100), 21.579933147204, 1e-4);
          assert.closeTo((10).exprand(100), 82.194018792543, 1e-4);
          assert.closeTo((10).exprand(100), 49.744633658604, 1e-4);
          assert.closeTo((10).exprand(100), 27.205932013319, 1e-4);
          assert.closeTo((10).exprand(100), 26.53658713648 , 1e-4);
          assert.closeTo(( 0).exprand(100), 0, 1e-4);
        });
        
      });
      describe("chord", function() {
        it("default", function() {
          actual   = (60).midichord();
          expected = [ 60, 64, 67 ]; // C
          assert.deepEqual(actual, expected);
        });
        it("minor", function() {
          actual   = (60).midichord("m");
          expected = [ 60, 63, 67 ]; // Cm
          assert.deepEqual(actual, expected);
        });
        it("inversion", function() {
          actual   = (60).midichord("m", 1);
          expected = [ 63, 67, 72 ]; // Cm
          assert.deepEqual(actual, expected);

          actual   = (60).midichord("m", -1);
          expected = [ 55, 60, 63 ]; // Cm
          assert.deepEqual(actual, expected);
        });
        it("length", function() {
          actual   = (60).midichord("M7", {length:-1});
          expected = [ 60, 64, 67, 71 ]; // CM7
          assert.deepEqual(actual, expected);

          actual   = (60).midichord("M7", {length:0});
          expected = []; // CM7
          assert.deepEqual(actual, expected);

          actual   = (60).midichord("M", {length:4});
          expected = [ 60, 64, 67, 72 ]; // CM
          assert.deepEqual(actual, expected);
        });
        it("cpschord", function() {
          actual   = (261.6255653006).cpschord("m");
          expected = [ 261.6255653006, 311.12698372208, 391.99543598175 ];
          assert.deepCloseTo(expected, expected, 1e-6);
        });
        it("ratiochord", function() {
          actual   = (12).ratiochord("m7");
          expected = [ 1 * 2, 1.1892071150019 * 2, 1.4983070768743 * 2,  1.7817974362766 * 2 ];
          assert.deepCloseTo(expected, expected, 1e-6);
        });
        describe("deprecate", function() {
          it("chord", function() {
            actual   = (60).chord();
            expected = [ 60, 64, 67 ]; // C
            assert.deepEqual(actual, expected);
            assert.isString(cc.global.console.log.result[0]);
          });
          it("chordcps", function() {
            actual   = (261.6255653006).chordcps("m");
            expected = [ 261.6255653006, 311.12698372208, 391.99543598175 ];
            assert.deepCloseTo(expected, expected, 1e-6);
            assert.isString(cc.global.console.log.result[0]);
          });
          it("chordratio", function() {
            actual   = (12).chordratio("m7");
            expected = [ 261.6255653006, 311.12698372208, 391.99543598175 ];
            assert.deepCloseTo(expected, expected, 1e-6);
            assert.isString(cc.global.console.log.result[0]);
          });
        });
      });
      describe("global", function() {
        it("global.NoteNumber", function() {
          assert.equal(cc.global.A4, 69);
          assert.equal(cc.global.C0, 12);
          assert.equal(cc.global.D1, 26);
          assert.equal(cc.global.E2, 40);
          assert.equal(cc.global.F3, 53);
          assert.equal(cc.global.G4, 67);
          assert.equal(cc.global.A5, 81);
          assert.equal(cc.global.B6, 95);
        });
      });
    });
  });

});
