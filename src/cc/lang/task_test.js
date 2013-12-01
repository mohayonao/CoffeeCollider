define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var testTools = require("../../testTools");
  
  var cc = require("./cc");
  var seg  = require("./seg");
  var task = require("./task");
  
  var Timer = (function() {
    function Timer(task) {
      this.task = task;
    }
    Timer.prototype.process = function(msec) {
      var i;
      if (this.task.process) {
        for (i = 0; i < msec; ++i) {
          this.task.process();
        }
      } else {
        for (i = 0; i < msec; ++i) {
          this.task.performWait(1);
        }
      }
    };
    return Timer;
  })();
  
  describe("lang/task.js", function() {
    var m, f, t, w, iter, actual, expected;
    var timer, passed;
    beforeEach(function() {
      global.indent = 0;
      passed = [];
    });
    describe("TaskArguments", function() {
      describe("TaskArgumentsNumber", function() {
        it("create", function() {
          iter = cc.createTaskArgumentsNumber(0, 10, 1);
          assert.instanceOf(iter, task.TaskArgumentsNumber);
          assert.isTrue(cc.instanceOfTaskArguments(iter));
        });
        it("next(incr)", function() {
          iter = cc.createTaskArgumentsNumber(0, 10, 2);
          assert.deepEqual(iter.valueOf(), [ 0, 0]);
          assert.deepEqual(iter.next()   , [ 2, 1]);
          assert.deepEqual(iter.next()   , [ 4, 2]);
          assert.deepEqual(iter.next()   , [ 6, 3]);
          assert.deepEqual(iter.next()   , [ 8, 4]);
          assert.deepEqual(iter.next()   , [10, 5]);
          assert.isTrue(iter.performWaitState());
          assert.isNull(iter.next());
          assert.isFalse(iter.performWaitState());
          assert.isNull(iter.next());

          iter = cc.createTaskArgumentsNumber(100, 10, 2);
          assert.deepEqual(iter.valueOf(), [100, 0]);
          assert.isTrue(iter.performWaitState());
          assert.isNull(iter.next());
          assert.isFalse(iter.performWaitState());
        });
        it("next(decr)", function() {
          iter = cc.createTaskArgumentsNumber(10, 0, -2);
          assert.deepEqual(iter.valueOf(), [10, 0]);
          assert.deepEqual(iter.next()   , [ 8, 1]);
          assert.deepEqual(iter.next()   , [ 6, 2]);
          assert.deepEqual(iter.next()   , [ 4, 3]);
          assert.deepEqual(iter.next()   , [ 2, 4]);
          assert.deepEqual(iter.next()   , [ 0, 5]);
          assert.isTrue(iter.performWaitState());
          assert.isNull(iter.next());
          assert.isFalse(iter.performWaitState());
          assert.isNull(iter.next());
          
          iter = cc.createTaskArgumentsNumber(10, 100, -2);
          assert.deepEqual(iter.valueOf(), [10, 0]);
          assert.isTrue(iter.performWaitState());
          assert.isNull(iter.next());
          assert.isFalse(iter.performWaitState());
        });
        it("reset", function() {
          iter = cc.createTaskArgumentsNumber(0, 10, 4);
          assert.deepEqual(iter.valueOf(), [ 0, 0]);
          assert.deepEqual(iter.next()   , [ 4, 1]);
          assert.deepEqual(iter.next()   , [ 8, 2]);
          assert.isNull(iter.next());
          assert.isFalse(iter.performWaitState());
          
          iter.reset();
          assert.isTrue(iter.performWaitState());
          assert.deepEqual(iter.valueOf(), [ 0, 0]);
          assert.deepEqual(iter.next()   , [ 4, 1]);
          assert.deepEqual(iter.next()   , [ 8, 2]);
          assert.isNull(iter.next());
          assert.isFalse(iter.performWaitState());
        });
      });
      describe("TaskArgumentsArray", function() {
        it("create", function() {
          iter = cc.createTaskArgumentsArray(["A", "B", "C"]);
          assert.instanceOf(iter, task.TaskArgumentsArray);
          assert.isTrue(cc.instanceOfTaskArguments(iter));
        });
        it("next", function() {
          iter = cc.createTaskArgumentsArray(["A", "B", "C"]);
          assert.deepEqual(iter.valueOf(), ["A", 0]);
          assert.deepEqual(iter.next()   , ["B", 1]);
          assert.deepEqual(iter.next()   , ["C", 2]);
          assert.isTrue(iter.performWaitState());
          assert.isNull(iter.next());
          assert.isFalse(iter.performWaitState());
          assert.isNull(iter.next());
        });
        it("next(reversed)", function() {
          iter = cc.createTaskArgumentsArray(["A", "B", "C"], true);
          assert.deepEqual(iter.valueOf(), ["C", 2]);
          assert.deepEqual(iter.next()   , ["B", 1]);
          assert.deepEqual(iter.next()   , ["A", 0]);
          assert.isTrue(iter.performWaitState());
          assert.isNull(iter.next());
          assert.isFalse(iter.performWaitState());
          assert.isNull(iter.next());
        });
        it("reset", function() {
          iter = cc.createTaskArgumentsArray(["A", "B", "C"]);
          assert.deepEqual(iter.valueOf(), ["A", 0]);
          assert.deepEqual(iter.next()   , ["B", 1]);
          assert.deepEqual(iter.next()   , ["C", 2]);
          assert.isNull(iter.next());
          assert.isFalse(iter.performWaitState());
          
          iter.reset();
          assert.isTrue(iter.performWaitState());
          assert.deepEqual(iter.valueOf(), ["A", 0]);
          assert.deepEqual(iter.next()   , ["B", 1]);
          assert.deepEqual(iter.next()   , ["C", 2]);
          assert.isNull(iter.next());
          assert.isFalse(iter.performWaitState());
        });
      });
      describe("TaskArgumentsFunction", function() {
        it("create", function() {
          iter = cc.createTaskArgumentsFunction(function() {
            return 1;
          });
          assert.instanceOf(iter, task.TaskArgumentsFunction);
          assert.isTrue(cc.instanceOfTaskArguments(iter));
        });
        it("next", function() {
          var block = true;
          var index = 0, list = [ 10, 20, 30 ];
          iter = cc.createTaskArgumentsFunction(function() {
            if (block) {
              throw "should not be called";
            }
            return list[index++];
          });
          block = false;
          assert.deepEqual(iter.valueOf(), [10, 0]);
          assert.deepEqual(iter.valueOf(), [10, 0]);
          assert.deepEqual(iter.next()   , [20, 1]);
          assert.deepEqual(iter.next()   , [30, 2]);
          assert.isTrue(iter.performWaitState());
          assert.isNull(iter.next());
          assert.isFalse(iter.performWaitState());
          assert.isNull(iter.next());
        });
      });
      describe("TaskArgumentsBoolean", function() {
        it("create", function() {
          iter = cc.createTaskArgumentsBoolean(true);
          assert.isTrue(cc.instanceOfTaskArguments(iter));
        });
        it("next", function() {
          iter = cc.createTaskArgumentsBoolean(true);
          assert.deepEqual(iter.valueOf(), [true, 0]);
          assert.isTrue(iter.performWaitState());
          assert.isNull(iter.next());
          assert.isFalse(iter.performWaitState());
        });
      });
    });
    describe("TaskWaitToken", function() {
      it("create", function() {
        w = cc.createTaskWaitToken(0);
        assert.instanceOf(w, task.TaskWaitToken);
        assert.isTrue(cc.instanceOfTaskWaitToken(w));
        
        w = cc.createTaskWaitToken(function() {});
        assert.instanceOf(w, task.TaskWaitTokenFunction);

        w = cc.createTaskWaitToken(true);
        assert.instanceOf(w, task.TaskWaitTokenBoolean);
        
        w = cc.createTaskWaitToken();
        assert.instanceOf(w, task.TaskWaitTokenBoolean);
        
        assert.equal(w, cc.createTaskWaitToken(w));
      });
      describe("TaskWaitTokenNumber", function() {
        it("create", function() {
          w = cc.createTaskWaitToken(1);
          assert.instanceOf(w, task.TaskWaitTokenNumber);
          assert.isTrue(cc.instanceOfTaskWaitToken(w));
        });
        it("performWait", function() {
          w = cc.createTaskWaitTokenNumber(1);
          assert.isTrue(w.performWaitState());
          
          timer = new Timer(w);
          
          timer.process(500);
          assert.isTrue(w.performWaitState());
          
          timer.process(500);
          assert.isFalse(w.performWaitState());
          
          timer.process(500);
          assert.isFalse(w.performWaitState());
        });
      });
      describe("TaskWaitTokenLogicAND", function() {
        it("create", function() {
          w = cc.createTaskWaitToken([1, 2]);
          assert.instanceOf(w, task.TaskWaitTokenLogicAND);
          assert.isTrue(cc.instanceOfTaskWaitToken(w));
        });
        it("performWait", function() {
          var w0 = cc.createTaskWaitTokenNumber(1);
          w = cc.createTaskWaitTokenArray([w0, 2], "and");
          assert.isTrue(w .performWaitState());
          assert.isTrue(w0.performWaitState());
          
          timer = new Timer(w);

          timer.process(1000);
          assert.isTrue (w .performWaitState());
          assert.isFalse(w0.performWaitState());

          timer.process(1000);
          assert.isFalse(w .performWaitState());
          assert.isFalse(w0.performWaitState());
        });
      });
      describe("TaskWaitTokenLogicOR", function() {
        it("create", function() {
          w = cc.createTaskWaitToken([1, 2], "or");
          assert.instanceOf(w, task.TaskWaitTokenLogicOR);
          assert.isTrue(cc.instanceOfTaskWaitToken(w));
        });
        it("performWait", function() {
          var w0 = cc.createTaskWaitTokenNumber(1);
          w = cc.createTaskWaitTokenArray([w0, 2], "or");
          assert.isTrue(w .performWaitState());
          assert.isTrue(w0.performWaitState());
          
          timer = new Timer(w);

          timer.process(1000);
          assert.isFalse(w .performWaitState());
          assert.isFalse(w0.performWaitState());
        });
      });
      describe("TaskWaitTokenFunction", function() {
        it("create", function() {
          w = cc.createTaskWaitTokenFunction(function() {});
          assert.instanceOf(w, task.TaskWaitTokenFunction);
          assert.isTrue(cc.instanceOfTaskWaitToken(w));
        });
        it("performWait", function() {
          var flag = false, bang = false;
          w = cc.createTaskWaitTokenFunction(function() {
            if (bang) {
              throw "should not be called";
            }
            return flag; // true if finished
          });
          assert.isTrue(w.performWaitState());
          
          timer = new Timer(w);
          
          timer.process(500);
          assert.isTrue(w.performWaitState());
          
          flag = true;
          timer.process(500);
          assert.isFalse(w.performWaitState());

          bang = true;
          timer.process(500);
          assert.isFalse(w.performWaitState());
        });
      });
      describe("TaskWaitTokenBoolean", function() {
        it("create", function() {
          w = cc.createTaskWaitTokenBoolean(true);
          assert.instanceOf(w, task.TaskWaitTokenBoolean);
          assert.isTrue(cc.instanceOfTaskWaitToken(w));
        });
        it("performWait", function() {
          w = cc.createTaskWaitTokenBoolean(true);
          assert.isTrue(w.performWaitState());

          timer = new Timer(w);
          timer.process(500);
          
          assert.isTrue(w.performWaitState());
        });
      });
      describe("TaskWaitTokenDate", function() {
        it("create", function() {
          w = cc.createTaskWaitTokenDate(new Date());
          assert.instanceOf(w, task.TaskWaitTokenDate);
          assert.isTrue(cc.instanceOfTaskWaitToken(w));
        });
        it("performWait (backward)", function() {
          w = cc.createTaskWaitTokenDate(new Date(0));
          assert.isTrue(w.performWaitState());
          
          timer = new Timer(w);
          timer.process(500);
          
          assert.isFalse(w.performWaitState());
        });
        it("performWait (forward)", function() {
          w = cc.createTaskWaitTokenDate(new Date(Date.now() + 60000));
          assert.isTrue(w.performWaitState());
          
          timer = new Timer(w);
          timer.process(500);
          
          assert.isTrue(w.performWaitState());
        });
      });
    });
    describe("Task", function() {
      it("create", function() {
        t = cc.global.Task();
        assert.instanceOf(t, task.Task);
        assert.isTrue(cc.instanceOfTask(t));
      });
      it("start", function() {
        t = cc.global.Task();
        assert.equal(t.start(), t, "start should be return self");
      });
      it("resume", function() {
        t = cc.global.Task();
        assert.equal(t.resume(), t, "resume should be return self");
      });
      it("pause", function() {
        t = cc.global.Task();
        assert.equal(t.pause(), t, "pause should be return self");
      });
      it("pause", function() {
        t = cc.global.Task();
        assert.equal(t.pause(), t, "pause should be return self");
      });
      it("reset", function() {
        t = cc.global.Task();
        assert.equal(t.reset(), t, "reset should be return self");
      });
      it("stop", function() {
        t = cc.global.Task();
        assert.equal(t.stop(), t, "stop should be return self");
      });
      it("__wait__", function() {
        t = cc.global.Task();
        t.__wait__({ performWait:function(){} });
        assert.throws(function() {
          t.__wait__({ performWait:function(){} });
        });
        
        t.reset();
        assert.equal(t.__wait__(0), t, "wait should be return self");
      });
      it("perform", function() {
        t = cc.global.Task(cc.global.SegmentedFunction(function() {
          var i = 0;
          return [
            function() { passed.push(i++); },
            function() { passed.push(i++); },
            function() { passed.push(i++); },
          ];
        }));
        timer = new Timer(t);
        timer.process(1);
        assert.deepEqual(passed, [ 0, 1, 2 ]);
      });
    });
    describe("TaskManager", function() {
      it("create", function() {
        m = cc.createTaskManager();
        assert.instanceOf(m, task.TaskManager);
        assert.isTrue(cc.instanceOfTaskManager(m));
      });
      it("start/stop", function() {
        m = cc.createTaskManager();
        assert.equal(m.counterIncr, 0);
        
        m.start(1);
        assert.equal(m.counterIncr, 1);
        
        m.stop();
        assert.equal(m.counterIncr, 0);
      });
      it("reset", function() {
        m = cc.createTaskManager();
        assert.deepEqual(m.tasks, []);
        m.tasks.push(1, 2, 3);
        m.reset();
        assert.deepEqual(m.tasks, []);
      });
      it("append/remove", function() {
        m = cc.createTaskManager();
        assert.deepEqual(m.tasks, []);
        t = cc.createTask();
        m.append(t);
        m.append(t);
        assert.deepEqual(m.tasks, [ t ]);
        m.remove(t);
        m.remove(t);
        assert.deepEqual(m.tasks, []);
      });
    });
    describe("combined", function() {
      before(function() {
        testTools.replaceTempNumberPrototype("do", function(func) {
          var i, n = this;
          if (cc.instanceOfSegmentedFunction(func)) {
            if (cc.currentSegHandler) {
              if (n > 0) {
                cc.currentSegHandler.__seg__(func, cc.createTaskArgumentsNumber(0, n - 1, 1));
              }
            } else {
              for (i = 0; i < n; ++i) {
                func.clone().perform(i);
              }
            }
          } else {
            for (i = 0; i < n; ++i) {
              func(i);
            }
          }
          return this;
        });
        testTools.replaceTempNumberPrototype("wait", function() {
          var n = this;
          if (n >= 0 && cc.currentTask) {
            cc.currentTask.__wait__(cc.createTaskWaitTokenNumber(n));
          }
          return this;
        });
      });
      after(function() {
        testTools.restoreTempNumberPrototype("do");
        testTools.restoreTempNumberPrototype("wait");
      });
      it("case 1", function() {
        (5).do(cc.global.SegmentedFunction(function() {
          return [
            function(i) { passed.push(+i); },
            function(i) { passed.push(-i); },
          ];
        }));
        assert.deepEqual(passed, [ 0, -0, 1, -1, 2, -2, 3, -3, 4, -4 ]);
      });
      it("case 2", function() {
        t = cc.global.Task(cc.global.SegmentedFunction(function() {
          return [
            function() { passed.push("begin"); },
            function() {
              (5).do(cc.global.SegmentedFunction(function() {
                return [
                  function(i) { passed.push(+i); },
                  function(i) { passed.push(-i); },
                ];
              }));
            },
            function() { passed.push("end"); },
          ];
        }));
        timer = new Timer(t);
        
        timer.process(1);
        assert.deepEqual(passed, [ "begin", 0, -0, 1, -1, 2, -2, 3, -3, 4, -4, "end" ]);
      });
      it("case 3", function() {
        t = cc.global.Task(cc.global.SegmentedFunction(function() {
          return [
            function() { passed.push("begin"); },
            function() {
              (0).do(cc.global.SegmentedFunction(function() {
                return [
                  function(i) { passed.push(i); },
                ];
              }));
            },
            function() { passed.push("end"); },
          ];
        }));
        timer = new Timer(t);
        
        timer.process(1);
        assert.deepEqual(passed, [ "begin", "end" ]);
      });
      it("case 4", function() {
        t = cc.global.Task(cc.global.SegmentedFunction(function() {
          return [
            function() { passed.push("begin"); },
            function() { (1).wait(); },
            function() {
              (5).do(cc.global.SegmentedFunction(function() {
                return [
                  function(i) { passed.push(+i); },
                  function(i) { (0.1).wait(); },
                  function(i) { passed.push(-i); },
                  function(i) { (0.1).wait(); },
                ];
              }));
            },
            function() { passed.push("end"); },
          ];
        }));
        
        timer = new Timer(t);
        
        timer.process(1);
        assert.deepEqual(passed, [ "begin" ]);
        
        timer.process(1000);
        assert.deepEqual(passed, [ "begin", 0 ]);
        
        timer.process(100);
        assert.deepEqual(passed, [ "begin", 0, -0 ]);

        timer.process(1000);
        assert.deepEqual(passed, [ "begin", 0, -0, 1, -1, 2, -2, 3, -3, 4, -4, "end" ]);
      });
      it("case 5", function() {
        t = cc.global.Task(cc.global.SegmentedFunction(function() {
          return [
            function() { passed.push("begin"); },
            function() { (1).wait(); },
            function() {
              (5).do(cc.global.SegmentedFunction(function() {
                return [
                  function(i) { passed.push(+i); },
                  function(i) { (0.1).wait(); },
                  function(i) { passed.push(-i); },
                  function(i) { (0.1).wait(); },
                ];
              }));
            },
            function() { passed.push("end"); },
          ];
        }));
        m = cc.createTaskManager();
        m.start(1);
        
        timer = new Timer(m);
        t.start();
        
        timer.process(1);
        assert.deepEqual(passed, [ "begin" ]);
        
        timer.process(1000);
        assert.deepEqual(passed, [ "begin", 0 ]);
        
        timer.process(100);
        assert.deepEqual(passed, [ "begin", 0, -0 ]);

        t.start(1);
        
        timer.process(1);
        assert.deepEqual(passed, [ "begin", 0, -0, "begin" ]);
        
        t.pause();
        
        timer.process(1000);
        assert.deepEqual(passed, [ "begin", 0, -0, "begin" ]);

        t.resume();
        
        timer.process(1000);
        assert.deepEqual(passed, [ "begin", 0, -0, "begin", 0 ]);

        t.stop();

        timer.process(1000);
        assert.deepEqual(passed, [ "begin", 0, -0, "begin", 0 ]);

        t.resume();
        
        m.stop();
        timer.process(1000);
        assert.deepEqual(passed, [ "begin", 0, -0, "begin", 0 ]);
        
        m.start(1);
        timer.process(1000);
        assert.deepEqual(passed, [ "begin", 0, -0, "begin", 0, -0, 1, -1, 2, -2, 3, -3, 4, -4, "end" ]);
      });
    });
  });

});
