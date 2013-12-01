define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  
  var cc = require("./cc");
  var seg  = require("./seg");
  
  describe("lang/seg.js", function() {
    var f, passed;
    beforeEach(function() {
      passed = [];
    });
    describe("SegmentedFunction", function() {
      it("create", function() {
        f = cc.global.SegmentedFunction();
        assert.instanceOf(f, seg.SegmentedFunction);
        assert.isFalse(f.performWaitState());
        assert.isTrue(cc.instanceOfSegmentedFunction(f));
      });
      it("clone", function() {
        f = cc.global.SegmentedFunction();
        var cloned = f.clone();
        assert.instanceOf(cloned, seg.SegmentedFunction);
        assert.notEqual(f, cloned);
      });
      it("perform", function() {
        f = cc.global.SegmentedFunction(function() {
          var i = 0;
          return [
            function() { passed.push(i++); },
            function() { passed.push(i++); },
          ];
        });
        assert.isTrue(f.performWaitState());
        
        f.perform();
        assert.deepEqual(passed, [ 0, 1 ]);
        assert.isFalse(f.performWaitState());
        
        f.perform();
        assert.deepEqual(passed, [ 0, 1 ]);
        assert.isFalse(f.performWaitState());
      });
      it("pause", function() {
        f = cc.global.SegmentedFunction(function() {
          var i = 0;
          return [
            function() { passed.push(i++); },
            function() { cc.pauseSegmentedFunction(); },
            function() { passed.push(i++); },
            function() { cc.pauseSegmentedFunction(); },
            function() { passed.push(i++); },
            function() { cc.pauseSegmentedFunction(); },
          ];
        });
        assert.isTrue(f.performWaitState());

        f.perform();
        assert.deepEqual(passed, [ 0 ]);
        assert.isTrue(f.performWaitState());

        f.perform();
        assert.deepEqual(passed, [ 0, 1 ]);
        assert.isTrue(f.performWaitState());
        
        f.perform();
        assert.deepEqual(passed, [ 0, 1, 2 ]);
        assert.isTrue(f.performWaitState());

        f.perform();
        assert.deepEqual(passed, [ 0, 1, 2 ]);
        assert.isFalse(f.performWaitState());
      });
      it("reset", function() {
        f = cc.global.SegmentedFunction(function() {
          return [
            function() { passed.push("a"); },
            function() { cc.pauseSegmentedFunction(); },
            function() { passed.push("b"); },
            function() { cc.pauseSegmentedFunction(); },
          ];
        });
        assert.isTrue(f.performWaitState());
        
        f.perform();
        assert.deepEqual(passed, [ "a" ]);
        assert.isTrue(f.performWaitState());
        
        f.reset();
        assert.isTrue(f.performWaitState());
        
        f.perform();
        assert.deepEqual(passed, [ "a", "a", ]);
        assert.isTrue(f.performWaitState());
        
        f.perform();
        assert.deepEqual(passed, [ "a", "a", "b" ]);
        assert.isTrue(f.performWaitState());

        f.perform();
        assert.deepEqual(passed, [ "a", "a", "b" ]);
        assert.isFalse(f.performWaitState());
      });
      it("empty", function() {
        f = cc.global.SegmentedFunction();
        assert.isFalse(f.performWaitState());
        f.reset();
        assert.isFalse(f.performWaitState());
      });
    });
  });

});
