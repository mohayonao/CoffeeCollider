define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var cc = require("./cc");
  var fn = require("./fn");
  var register  = require("./installer").register;
  var sched     = require("./sched");
  var Timeline  = sched.Timeline;
  var Task      = sched.TaskInterface;
  var TaskDo    = sched.TaskDo;
  var TaskLoop  = sched.TaskLoop;
  var TaskEach  = sched.TaskEach;
  var TaskTimeout  = sched.TaskTimeout;
  var TaskInterval = sched.TaskInterval;
  var TaskBlock = sched.TaskBlock;

  var MockClient = (function() {
    function MockClient() {
      this.sampleRate = 44100;
      this.bufLength  = 64;
      this.timeline   = new Timeline(this);
    }
    return MockClient;
  })();

  describe("sched.js", function() {
    var timeline, sync, procN, procT;
    before(function() {
      sched.install(register);
    });
    beforeEach(function() {
      cc.client = new MockClient();
      timeline  = cc.client.timeline;
      procN = function(n) {
        for (var i = 0; i < n; i++) {
          timeline.process();
        }
      };
      procT = function(t) {
        var n = Math.ceil(t / timeline.counterIncr);
        for (var i = 0; i < n; i++) {
          timeline.process();
        }
      };
      timeline.play();
    });
    describe("TaskDo", function() {
      it("create", function() {
        var t = Task.do(function() {});
        assert.instanceOf(t, TaskDo);
      });
      it("sync", function() {
        var actual = 0;
        var t = Task.do(function() {
          actual = 1;
          this.wait(100);
          this.wait(function() {
            actual = 2;
          });
          this.wait(100);
        }).on("end", function() {
          actual = 3;
        }).play();
        
        assert.equal(actual, 0);
        procN(1);
        assert.equal(actual, 1);
        procT(100);
        assert.equal(actual, 2);
        procT(100);
        assert.equal(actual, 3);
      });
      it("pause", function() {
        var actual = 0;
        var t = Task.do(function() {
          actual = 1;
          this.wait(100);
          this.wait(function() {
            actual = 2;
          });
          this.wait(100);
        }).on("end", function() {
          actual = 3;
        }).play();
        
        assert.equal(actual, 0);
        procN(1);
        assert.equal(actual, 1);
        t.pause();
        procT(100);
        assert.equal(actual, 1);
        t.play();
        procT(100);
        assert.equal(actual, 2);
        procT(100);
        assert.equal(actual, 3);
      });
      it("stop", function() {
        var actual = 0;
        var t = Task.do(function() {
          actual = 1;
          this.wait(100);
          this.wait(function() {
            throw "should not pass through";
          });
        }).on("end", function() {
          actual = 3;
        }).play();

        assert.equal(actual, 0);
        procN(1);
        assert.equal(actual, 1);
        t.stop();
        procN(1);
        assert.equal(actual, 3);
        procT(100);
      });
    });
    describe("TaskLoop", function() {
      it("create", function() {
        var t = Task.loop(function() {})
        assert.instanceOf(t, TaskLoop);
      });
      it("sync", function() {
        var actual = 0;
        var t = Task.loop(function() {
          actual += 1;
          this.wait(100);
        }).on("end", function() {
          throw "should not pass through";
        }).play();
        
        assert.equal(actual, 0);
        procN(1);
        for (var i = 1; i <= 10; i++) {
          assert.equal(actual, i);
          procT(100);
        }
        procT(1000);
      });
    });
    describe("TaskEach", function() {
      it("create", function() {
        var t = Task.each([], function() {});
        assert.instanceOf(t, TaskEach);
      });
      it("sync", function() {
        var actual = 0;
        var t = Task.each([1,2,3], function(i) {
          actual = i;
          this.wait(100);
        }).on("end", function() {
          actual = 4;
        }).play();
        
        assert.equal(actual, 0);
        procN(1);
        assert.equal(actual, 1);
        procT(100);
        assert.equal(actual, 2);
        procT(100);
        assert.equal(actual, 3);
        procT(100);
        assert.equal(actual, 4);
      });
    });
    describe("TaskTimeout", function() {
      it("create", function() {
        var t = Task.timeout(0, function() {});
        assert.instanceOf(t, TaskTimeout);
      });
      it("sync", function() {
        var actual = 0;
        var t = Task.timeout(10, function(i) {
          actual = 1;
          this.wait(100);
        }).on("end", function() {
          actual = 2;
        }).play();
        
        assert.equal(actual, 0);
        procN(1);
        assert.equal(actual, 0);
        procT(10);
        assert.equal(actual, 1);
        procT(100);
        assert.equal(actual, 2);
      });
    });
    describe("TaskInterval", function() {
      it("create", function() {
        var t = Task.interval(0, function() {});
        assert.instanceOf(t, TaskInterval);
      });
      it("sync", function() {
        var actual = 0;
        var t = Task.interval(10, function(i) {
          actual += 1;
          this.wait(100);
        }).on("end", function() {
          throw "should not pass through";
        }).play();
        
        assert.equal(actual, 0);
        procN(1);
        assert.equal(actual, 0);
        procT(10);
        for (var i = 1; i <= 10; i++) {
          assert.equal(actual, i);
          procT(100);
        }
      });
    });
    describe("TaskBlock", function() {
      it("create", function() {
        var t = Task.block();
        assert.instanceOf(t, TaskBlock);
      });
      it("sync", function() {
        var actual = 0;
        var block1 = Task.block();
        var block2 = Task.block();
        var t = Task.do(function() {
          actual = 1;
          this.wait(block1);
          this.wait(function() {
            actual = 2;
          });
          this.wait(block2);
          this.wait(function() {
            actual = 3;
          });
        }).on("end", function() {
        }).play();
        assert.equal(actual, 0);
        procN(1);
        assert.equal(actual, 1);
        procT(100);
        assert.equal(actual, 1);
        block1.free();
        procN(1);
        assert.equal(actual, 2);
        
        procT(100);
        assert.equal(actual, 2);
        block2.lock();
        block2.free();
        procN(1);
        assert.equal(actual, 2);
        block2.free();
        procN(1);
        assert.equal(actual, 3);
      });
    });
    it("nesting", function() {
      var actual = 0;
      var t = Task.do(function() {
        actual = 1;
        this.wait(100);
        var tt = Task.each([2,3], function(i) {
          actual = i;
          this.wait(100);
        }).play();
        this.wait(tt);
        this.wait(function() {
          actual = 4;
        });
      }).play();
      assert.equal(actual, 0);
      procN(1);
      assert.equal(actual, 1);
      procT(100);
      assert.equal(actual, 2);
      procT(100);
      assert.equal(actual, 3);
      procT(100);
      assert.equal(actual, 4);
    });
    it("chain", function() {
      var actual = 0;
      var t = Task.do(function() {
        actual = 1;
        this.wait(100);
      }).do(function() {
        actual = 2;
        this.wait(100);
      }).on("end", function() {
        actual = 3;
      }).play();
      
      assert.equal(actual, 0);
      procN(1);
      assert.equal(actual, 1);
      procT(100);
      assert.equal(actual, 2);
      procT(100);
      assert.equal(actual, 3);
    });
  });

});
