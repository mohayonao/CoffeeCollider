define(function(require, exports, module) {

  var assert = require("chai").assert;
  var testTools = require("../../testTools");
  
  var pattern = require("./pattern");
  var cc = require("./cc");
  
  describe("lang/pattern.js", function() {
    var p, actual, expected;
    beforeEach(function() {
      Math.random = testTools.Random();
    });
    after(function() {
      Math.random = testTools.revertRandom();
    });
    describe("Pgeom", function() {
      it("create", function() {
        p = cc.global.Pgeom();
        assert.instanceOf(p, pattern.Pgeom);
      });
      it("next", function() {
        p = cc.global.Pgeom(1, 2, 8);
        actual   = p.nextN(10);
        expected = [ 1, 2, 4, 8, 16, 32, 64, 128, null, null ];
        assert.deepEqual(actual, expected);
      });
      it("reset", function() {
        p = cc.global.Pgeom(1, 2, 8);
        
        p.nextN(2);
        p.reset();
        
        actual   = p.nextN(10);
        expected = [ 1, 2, 4, 8, 16, 32, 64, 128, null, null ];
        assert.deepEqual(actual, expected);
      });
    });
    describe("Pseries", function() {
      it("create", function() {
        p = cc.global.Pseries();
        assert.instanceOf(p, pattern.Pseries);
      });
      it("next", function() {
        p = cc.global.Pseries(1, 2, 8);
        actual   = p.nextN(10);
        expected = [ 1, 3, 5, 7, 9, 11, 13, 15, null, null ];
        assert.deepEqual(actual, expected);
      });
      it("reset", function() {
        p = cc.global.Pseries(1, 2, 8);
        
        p.nextN(2);
        p.reset();
        
        actual   = p.nextN(10);
        expected = [ 1, 3, 5, 7, 9, 11, 13, 15, null, null ];
        assert.deepEqual(actual, expected);
      });
    });
    describe("Pwhite", function() {
      it("create", function() {
        p = cc.global.Pwhite();
        assert.instanceOf(p, pattern.Pwhite);
      });
      it("next", function() {
        p = cc.global.Pwhite(0, 100, 8);
        actual   = p.nextN(10);
        expected = [
          62.86850986070931,
          5.4066546726971865,
          57.551223575137556,
          51.6898141708225,
          54.08958641346544,
          28.54668409563601,
          56.6714808344841,
          69.03475404251367,
          null,
          null,
        ];
        assert.deepEqual(actual, expected);
      });
    });
    describe("Pser", function() {
      it("create", function() {
        p = cc.global.Pser();
        assert.instanceOf(p, pattern.Pser);
      });
      it("next", function() {
        p = cc.global.Pser([1, 2, 3], 5);
        actual   = p.nextN(10);
        expected = [ 1, 2, 3, 1, 2, null, null, null, null, null ];
        assert.deepEqual(actual, expected);
      });
      it("reset", function() {
        p = cc.global.Pser([1, 2, 3], 5);
        
        p.nextN(2);
        p.reset();
        
        actual   = p.nextN(10);
        expected = [ 1, 2, 3, 1, 2, null, null, null, null, null ];
        assert.deepEqual(actual, expected);
      });
    });
    describe("Pseq", function() {
      it("create", function() {
        p = cc.global.Pseq();
        assert.instanceOf(p, pattern.Pseq);
      });
      it("next", function() {
        p = cc.global.Pseq([1, 2, 3], 2);
        actual   = p.nextN(10);
        expected = [ 1, 2, 3, 1, 2, 3, null, null, null, null ];
        assert.deepEqual(actual, expected);
      });
      it("reset", function() {
        p = cc.global.Pseq([1, 2, 3], 2);
        
        p.nextN(2);
        p.reset();
        
        actual   = p.nextN(10);
        expected = [ 1, 2, 3, 1, 2, 3, null, null, null, null ];
        assert.deepEqual(actual, expected);
      });
    });
    describe("Pshuf", function() {
      it("create", function() {
        p = cc.global.Pshuf();
        assert.instanceOf(p, pattern.Pshuf);
      });
      it("next", function() {
        p = cc.global.Pshuf([1, 2, 3], 2);
        actual   = p.nextN(10);
        expected = [ 2, 1, 3, 2, 1, 3, null, null, null, null ];
        assert.deepEqual(actual, expected);
      });
      it("reset", function() {
        p = cc.global.Pshuf([1, 2, 3], 2);
        
        p.nextN(2);
        p.reset();
        
        actual   = p.nextN(10);
        expected = [ 2, 1, 3, 2, 1, 3, null, null, null, null ];
        assert.deepEqual(actual, expected);
      });
    });
    describe("Prand", function() {
      it("create", function() {
        p = cc.global.Prand();
        assert.instanceOf(p, pattern.Prand);
      });
      it("next", function() {
        p = cc.global.Prand([1, 2, 3], 5);
        actual   = p.nextN(10);
        expected = [ 2, 1, 2, 2, 2, null, null, null, null, null ];
        assert.deepEqual(actual, expected);
      });
    });
    
    describe("Puop", function() {
      it("midicps", function() {
        testTools.replaceTempNumberPrototype("midicps", function() {
          return 440 * Math.pow(2, (this - 69) * 1/12);
        }, function() {
          p = cc.global.Pseq([60, 62, 64], 3, 0).midicps();
          actual   = p.nextN(11);
          expected = [ 261.6255653006, 293.66476791741, 329.62755691287,
                       261.6255653006, 293.66476791741, 329.62755691287,
                       261.6255653006, 293.66476791741, 329.62755691287, null, null ];
          assert.deepCloseTo(actual, expected, 1e-6);
        });
      });
    });
    describe("Pbop", function() {
      it("max", function() {
        testTools.replaceTempNumberPrototype("max", function(b) {
          return Math.max(this, b);
        }, function() {
          p = cc.global.Pseq([60, 62, 64], 3, 0).max(63);
          actual   = p.nextN(11);
          expected = [ 63, 63, 64,
                       63, 63, 64,
                       63, 63, 64, null, null ];
          assert.deepCloseTo(actual, expected, 1e-6);
        });
      });
    });
    it("nesting", function() {
      var p1 = cc.global.Pseq([1, 2, 3], 2);
      var p2 = cc.global.Pseq([0, p1, 4], 2);
      actual = p2.nextN(20);
      expected = [
        0, 1, 2, 3, 1, 2, 3, 4,
        0, 1, 2, 3, 1, 2, 3, 4,
        null, null, null, null
      ];
      assert.deepEqual(actual, expected);

      p2.reset();
      actual = p2.nextN(20);
      expected = [
        0, 1, 2, 3, 1, 2, 3, 4,
        0, 1, 2, 3, 1, 2, 3, 4,
        null, null, null, null
      ];
      assert.deepEqual(actual, expected);
    });
    it("concat", function() {
      p = cc.global.Pser([1, 2, 3], 5);
      p = p.concat(p);
      actual = p.nextN(15);
      expected = [
        1, 2, 3, 1, 2,
        1, 2, 3, 1, 2,
        null, null, null, null, null
      ];
      assert.deepEqual(actual, expected);
    });
  });

});
