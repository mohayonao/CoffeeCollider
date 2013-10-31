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
      
      assert.deepCloseTo = function(actual, expected, delta) {
        expected.forEach(function(x, i) {
          if (isNaN(expected[i])) {
            assert.isTrue(isNaN(x));
          } else if (expected[i] === Infinity) {
            assert.equal(x, Infinity);
          } else if (expected[i] === -Infinity) {
            assert.equal(x, -Infinity);
          } else {
            assert.closeTo(actual[i], x, delta);
          }
        });
      };
    });
    it("pi", function() {
      assert.closeTo((10).pi(), 31.415926535898, 1e-6);
      assert.deepCloseTo(
        [ -10, 0, 20 ].pi(),
        [ -31.415926535898, 0, 62.831853071796 ],
        1e-6
      );
      assert.equal(ugen.pi().selector, "pi");
    });
    it("abs", function() {
      assert.closeTo((-10).abs(), 10, 1e-6);
      assert.deepCloseTo(
        [ -Infinity, -110, 0, 500, -Math.PI ].abs(),
        [ Infinity, 110, 0, 500, Math.PI ],
        1e-6
      );
      assert.equal(ugen.abs().selector, "abs");
    });
    it("midicps", function() {
      assert.closeTo((60).midicps(), 261.6255653006, 1e-6);
      assert.deepCloseTo(
        [ -10, 0, 60, 70 ].midicps(),
        [ 4.5885119987095, 8.1757989156437, 261.6255653006, 466.16376151809 ],
        1e-6
      );
      assert.equal(ugen.midicps().selector, "midicps");
    });
    it("cpsmidi", function() {
      assert.closeTo((880).cpsmidi(), 81, 1e-6);
      assert.deepCloseTo(
        [-110,0,220,500].cpsmidi(),
        [ 45, -Infinity, 57, 71.213094853649 ],
        1e-6
      );
    });
    it("ampdb", function() {
      assert.closeTo((2).ampdb(), 6.0205999132796, 1e-6);
      assert.deepCloseTo(
        [ -2, 0, 2, 3 ].ampdb(),
        [ NaN, -Infinity, 6.0205999132796, 9.5424250943932 ],
        1e-6
      );
    });
    it("dbamp", function() {
      assert.closeTo((3).dbamp(), 1.4125375446228, 1e-6);
      assert.deepCloseTo(
        [ -1,0, 0.5, 2.5 ].dbamp(),
        [ 0.89125093813375, 1, 1.0592537251773, 1.3335214321633 ],
        1e-6
      );
    });
    it("coin", function() {
      assert.isFalse((0).coin());
      assert.isTrue((1).coin());
    });
  });

});
