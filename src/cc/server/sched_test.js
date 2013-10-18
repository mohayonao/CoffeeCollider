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

  var MockServer = (function() {
    function MockServer() {
      this.sampleRate = 44100;
      this.bufLength  = 64;
      this.timeline   = new Timeline(this);
    }
    return MockServer;
  })();

  describe("sched.js", function() {
    var timeline, sync, procN, procT;
    before(function() {
      sched.install(register);
    });
    beforeEach(function() {
      cc.server = new MockServer();
      timeline  = cc.server.timeline;
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
        var passed = 0;
        var t = Task.do(function() {
          passed = 1;
          this.wait(100);
          this.sync(function() {
            passed = 2;
          });
          this.wait(100);
        }).on("end", function() {
          passed = 3;
        }).play();
        
        assert.equal(0, passed);
        procN(1);
        assert.equal(1, passed);
        procT(100);
        assert.equal(2, passed);
        procT(100);
        assert.equal(3, passed);
      });
      it("pause", function() {
        var passed = 0;
        var t = Task.do(function() {
          passed = 1;
          this.wait(100);
          this.sync(function() {
            passed = 2;
          });
          this.wait(100);
        }).on("end", function() {
          passed = 3;
        }).play();
        
        assert.equal(0, passed);
        procN(1);
        assert.equal(1, passed);
        t.pause();
        procT(100);
        assert.equal(1, passed);
        t.play();
        procT(100);
        assert.equal(2, passed);
        procT(100);
        assert.equal(3, passed);
      });
      it("stop", function() {
        var passed = 0;
        var t = Task.do(function() {
          passed = 1;
          this.wait(100);
          this.sync(function() {
            throw "should not pass through";
          });
        }).on("end", function() {
          passed = 3;
        }).play();

        assert.equal(0, passed);
        procN(1);
        assert.equal(1, passed);
        t.stop();
        assert.equal(3, passed);
        procT(100);
      });
    });
    describe("TaskLoop", function() {
      it("create", function() {
        var t = Task.loop(function() {})
        assert.instanceOf(t, TaskLoop);
      });
      it("sync", function() {
        var passed = 0;
        var t = Task.loop(function() {
          passed += 1;
          this.wait(100);
        }).on("end", function() {
          throw "should not pass through";
        }).play();
        
        assert.equal(0, passed);
        procN(1);
        for (var i = 1; i <= 10; i++) {
          assert.equal(i, passed);
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
        var passed = 0;
        var t = Task.each([1,2,3], function(i) {
          passed = i;
          this.wait(100);
        }).on("end", function() {
          passed = 4;
        }).play();
        
        assert.equal(0, passed);
        procN(1);
        assert.equal(1, passed);
        procT(100);
        assert.equal(2, passed);
        procT(100);
        assert.equal(3, passed);
        procT(100);
        assert.equal(4, passed);
      });
    });
    describe("TaskTimeout", function() {
      it("create", function() {
        var t = Task.timeout(0, function() {});
        assert.instanceOf(t, TaskTimeout);
      });
      it("sync", function() {
        var passed = 0;
        var t = Task.timeout(10, function(i) {
          passed = 1;
          this.wait(100);
        }).on("end", function() {
          passed = 2;
        }).play();
        
        assert.equal(0, passed);
        procN(1);
        assert.equal(0, passed);
        procT(10);
        assert.equal(1, passed);
        procT(100);
        assert.equal(2, passed);
      });
    });
    describe("TaskInterval", function() {
      it("create", function() {
        var t = Task.interval(0, function() {});
        assert.instanceOf(t, TaskInterval);
      });
      it("sync", function() {
        var passed = 0;
        var t = Task.interval(10, function(i) {
          passed += 1;
          this.wait(100);
        }).on("end", function() {
          throw "should not pass through";
        }).play();
        
        assert.equal(0, passed);
        procN(1);
        assert.equal(0, passed);
        procT(10);
        for (var i = 1; i <= 10; i++) {
          assert.equal(i, passed);
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
        var passed = 0;
        var block1 = Task.block();
        var block2 = Task.block();
        var t = Task.do(function() {
          passed = 1;
          this.wait(block1);
          this.sync(function() {
            passed = 2;
          });
          this.wait(block2);
          this.sync(function() {
            passed = 3;
          });
        }).on("end", function() {
        }).play();
        assert.equal(0, passed);
        procN(1);
        assert.equal(1, passed);
        procT(100);
        assert.equal(1, passed);
        block1.free();
        procN(1);
        assert.equal(2, passed);
        
        procT(100);
        assert.equal(2, passed);
        block2.lock();
        block2.free();
        procN(1);
        assert.equal(2, passed);
        block2.free();
        procN(1);
        assert.equal(3, passed);
      });
    });
    it("nesting", function() {
      var passed = 0;
      var t = Task.do(function() {
        passed = 1;
        this.wait(100);
        var tt = Task.each([2,3], function(i) {
          passed = i;
          this.wait(100);
        }).play();
        this.wait(tt);
        this.sync(function() {
          passed = 4;
        });
      }).play();
      assert.equal(0, passed);
      procN(1);
      assert.equal(1, passed);
      procT(100);
      assert.equal(2, passed);
      procT(100);
      assert.equal(3, passed);
      procT(100);
      assert.equal(4, passed);
    });
    it("chain", function() {
      var passed = 0;
      var t = Task.do(function() {
        passed = 1;
        this.wait(100);
      }).do(function() {
        passed = 2;
        this.wait(100);
      }).on("end", function() {
        passed = 3;
      }).play();
      
      assert.equal(0, passed);
      procN(1);
      assert.equal(1, passed);
      procT(100);
      assert.equal(2, passed);
      procT(100);
      assert.equal(3, passed);
    });
  });

});
