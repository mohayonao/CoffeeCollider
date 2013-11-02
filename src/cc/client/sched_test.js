define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var cc = require("./cc");
  var fn = require("./fn");
  var ugen  = require("./ugen/ugen");
  var sched = require("./sched");
  
  require("./object");
  
  describe("sched.js", function() {
    var timeline, procN, procT;
    before(function() {
      ugen.use();
      sched.use();
    });
    beforeEach(function() {
      timeline = cc.createTimeline({
        bufLength:64, sampleRate:44100
      });
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
      timeline.play( (64 / 44100) * 1000 );
    });
    describe("TaskDo", function() {
      it("create", function() {
        var t = cc.createTaskDo(function() {});
        assert.equal(t.klassName, "TaskDo");
      });
      it("sync", function() {
        var actual = 0;
        var t = cc.createTaskDo(function() {
          actual = 1;
          this.wait(100).on("end", function() {
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
        var t = cc.createTaskDo(function() {
          actual = 1;
          this.wait(100).on("end", function() {
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
        var t = cc.createTaskDo(function() {
          actual = 1;
          this.wait(100).on("end", function() {
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
        var t = cc.createTaskLoop(function() {})
        assert.equal(t.klassName, "TaskLoop");
      });
      it("sync", function() {
        var actual = 0;
        var t = cc.createTaskLoop(function() {
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
        var t = cc.createTaskEach([], function() {});
        assert.equal(t.klassName, "TaskEach");
      });
      it("sync", function() {
        var actual = 0;
        var t = cc.createTaskEach([1,2,3], function(i) {
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
        var t = cc.createTaskTimeout(0, function() {});
        assert.equal(t.klassName, "TaskTimeout");
      });
      it("sync", function() {
        var actual = 0;
        var t = cc.createTaskTimeout(10, function(i) {
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
        var t = cc.createTaskInterval(0, function() {});
        assert.equal(t.klassName, "TaskInterval");
      });
      it("sync", function() {
        var actual = 0;
        var t = cc.createTaskInterval(10, function(i) {
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
        var t = cc.createTaskBlock();
        assert.equal(t.klassName, "TaskBlock");
      });
      it("sync", function() {
        var actual = 0;
        var block1 = cc.createTaskBlock();
        var block2 = cc.createTaskBlock();
        var t = cc.createTaskDo(function() {
          actual = 1;
          this.wait(block1).on("end", function() {
            actual = 2;
          });
          this.wait(block2).on("end", function() {
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
      var t = cc.createTaskDo(function() {
        actual = 1;
        this.wait(100);
        var tt = cc.createTaskEach([2,3], function(i) {
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
      var t = cc.createTaskDo(function() {
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

    describe("TaskWaitToken", function() {
      var emitted;
      beforeEach(function() {
        emitted = false;
      });
      it("number", function() {
        var t = cc.createTaskWaitToken(10).on("end", function() {
          emitted = true;
        });
        assert.equal(t.klassName, "TaskWaitTokenNumber");
        assert.equal(emitted, false);
        t.performWait(5);
        assert.equal(emitted, false);
        t.performWait(5);
        assert.equal(emitted, true);
      });
      it("function", function() {
        var cnt = 2;
        var t = cc.createTaskWaitToken(function() {
          cnt -= 1;
          return cnt > 0;
        }).on("end", function() {
          emitted = true;
        });
        assert.equal(t.klassName, "TaskWaitTokenFunction");
        assert.equal(emitted, false);
        t.performWait(1);
        assert.equal(emitted, false);
        t.performWait(1);
        assert.equal(emitted, true);
      });
      it("array", function() {
        var list = [ 5, 15, 10 ];
        var t = cc.createTaskWaitToken(list).on("end", function() {
          emitted = true;
        });
        assert.equal(t.klassName, "TaskWaitAND");
        assert.equal(emitted, false);
        t.performWait(5);
        assert.equal(emitted, false);
        t.performWait(5);
        assert.equal(emitted, false);
        t.performWait(5);
        assert.equal(emitted, true);
      });
      it("block", function() {
        var obj = {
          blocking   : true,
          performWait: function() {
            return this.blocking;
          }
        };
        var t = cc.createTaskWaitToken(obj).on("end", function() {
          emitted = true;
        });
        assert.equal(t.klassName, "TaskWaitTokenBlock");
        assert.equal(emitted, false);
        t.performWait(5);
        assert.equal(emitted, false);
        obj.blocking = false;
        t.performWait(5);
        assert.equal(emitted, true);
      });
      it("true (infinity block)", function() {
        var t = cc.createTaskWaitToken(true).on("end", function() {
          emitted = true;
        });
        assert.equal(t.klassName, "TaskWaitTokenBoolean");
        assert.equal(emitted, false);
        t.performWait(5);
        assert.equal(emitted, false);
        t.performWait(5);
        assert.equal(emitted, false);
      });
      it("false (not block)", function() {
        var t = cc.createTaskWaitToken(false).on("end", function() {
          emitted = true;
        });
        assert.equal(t.klassName, "TaskWaitTokenBoolean");
        assert.equal(emitted, false);
        t.performWait(5);
        assert.equal(emitted, true);
      });
      it("pass", function() {
        var t1 = cc.createTaskWaitToken(10);
        var t2 = cc.createTaskWaitToken(t1);
        assert.equal(t1, t2);
      });
    });
    describe("TaskWaitLogic", function() {
      var emitted;
      beforeEach(function() {
        emitted = [];
      });
      it("and", function() {
        var t1 = cc.createTaskWaitToken(10).on("end", function() {
          emitted.push(1);
        });
        var t2 = cc.createTaskWaitToken(20).on("end", function() {
          emitted.push(2);
        });
        var t3 = cc.createTaskWaitToken(15).on("end", function() {
          emitted.push(3);
        });
        var t = cc.createTaskWaitLogic("and", [t1,t2,t3]).on("end", function() {
          emitted.push(4);
        });
        assert.equal(t.klassName, "TaskWaitAND");
        assert.deepEqual(emitted, []);
        t.performWait(5);
        assert.deepEqual(emitted, []);
        t.performWait(5);
        assert.deepEqual(emitted, [1]);
        t.performWait(5);
        assert.deepEqual(emitted, [1, 3]);
        t.performWait(5);
        assert.deepEqual(emitted, [1, 3, 2, 4]);
      });
      it("or", function() {
        var t1 = cc.createTaskWaitToken(10).on("end", function() {
          emitted.push(1);
        });
        var t2 = cc.createTaskWaitToken(20).on("end", function() {
          emitted.push(2);
        });
        var t3 = cc.createTaskWaitToken(15).on("end", function() {
          emitted.push(3);
        });
        var t = cc.createTaskWaitLogic("or", [t1,t2,t3]).on("end", function() {
          emitted.push(4);
        });
        assert.equal(t.klassName, "TaskWaitOR");
        assert.deepEqual(emitted, []);
        t.performWait(5);
        assert.deepEqual(emitted, []);
        t.performWait(5);
        assert.deepEqual(emitted, [1, 4]);
        t.performWait(5);
        assert.deepEqual(emitted, [1, 4]);
        t.performWait(5);
        assert.deepEqual(emitted, [1, 4]);
      });
      it("and/or", function() {
        var t1 = cc.createTaskWaitToken(10).on("end", function() {
          emitted.push(1);
        });
        var t2 = cc.createTaskWaitToken(20).on("end", function() {
          emitted.push(2);
        });
        var t3 = cc.createTaskWaitToken(15).on("end", function() {
          emitted.push(3);
        });
        var t4 = cc.createTaskWaitLogic("and", [t1,t2]).on("end", function() {
          emitted.push(4);
        });
        var t = cc.createTaskWaitLogic("or", [t3, t4]).on("end", function() {
          emitted.push(5);
        });
        assert.equal(t.klassName, "TaskWaitOR");
        assert.deepEqual(emitted, []);
        t.performWait(5);
        assert.deepEqual(emitted, []);
        t.performWait(5);
        assert.deepEqual(emitted, [1]);
        t.performWait(5);
        assert.deepEqual(emitted, [1, 3, 5]);
        t.performWait(5);
        assert.deepEqual(emitted, [1, 3, 5]);
      });
    });
  });
});
