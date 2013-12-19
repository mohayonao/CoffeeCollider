define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  
  var cc = require("./cc");
  var syncblock  = require("./syncblock");
  
  describe("lang/syncblock.js", function() {
    var f, passed, actual, expected;
    beforeEach(function() {
      passed = [];
    });
    describe("SyncBlock", function() {
      it("create", function() {
        f = cc.global.syncblock();
        assert.isFunction(f);
        assert.isTrue(cc.instanceOfSyncBlock(f));
      });
      it("#performWaitState", function() {
        f = cc.global.syncblock();
        assert.isFalse(f.performWaitState());
      });
      it("#clone", function() {
        f = cc.global.syncblock();
        var cloned = f.clone();
        assert.isTrue(cc.instanceOfSyncBlock(cloned));
        assert.notEqual(f, cloned);
      });
      it("#perform", function() {
        f = cc.global.syncblock(function() {
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
      it("#pause", function() {
        f = cc.global.syncblock(function() {
          var i = 0;
          return [
            function() { passed.push(i++); },
            function() { cc.pauseSyncBlock(); },
            function() { passed.push(i++); },
            function() { cc.pauseSyncBlock(); },
            function() { passed.push(i++); },
            function() { cc.pauseSyncBlock(); },
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
      it("#reset", function() {
        f = cc.global.syncblock(function() {
          return [
            function() { passed.push("a"); },
            function() { cc.pauseSyncBlock(); },
            function() { passed.push("b"); },
            function() { cc.pauseSyncBlock(); },
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
        f = cc.global.syncblock();
        assert.isFalse(f.performWaitState());
        f.reset();
        assert.isFalse(f.performWaitState());
      });
      it("nesting", function() {
        f = cc.global.syncblock(function() {
          return [
            function() { passed.push("begin"); },
            function() { return cc.global.syncblock(function() {
              return [
                function() { passed.push("a"); },
                function() { cc.pauseSyncBlock(); },
                function() { passed.push("b"); },
                function() { cc.pauseSyncBlock(); },
              ];
            }); },
            function() { passed.push("end"); },
          ];
        });
        assert.isTrue(f.performWaitState());
        
        f.perform();
        assert.deepEqual(passed, [ "begin" ]);

        f.perform();
        assert.deepEqual(passed, [ "begin", "a" ]);

        f.perform();
        assert.deepEqual(passed, [ "begin", "a", "b" ]);

        f.perform();
        assert.deepEqual(passed, [ "begin", "a", "b", "end" ]);
      });      
      it("#perform (call)", function() {
        f = cc.global.syncblock(function() {
          var i = 0;
          return [
            function() { passed.push(i++); },
            function() { passed.push(i++); },
            function() { return 100; },
          ];
        });
        assert.isTrue(f.performWaitState());
        
        actual   = f();
        expected = 100;
        assert.deepEqual(passed, [ 0, 1 ]);
        assert.isFalse(f.performWaitState());
        assert.equal(actual, expected);
        
        actual   = f();
        expected = 100;
        assert.deepEqual(passed, [ 0, 1, 2, 3 ]);
        assert.isFalse(f.performWaitState());
        assert.equal(actual, expected);
      });
    });
  });

});
