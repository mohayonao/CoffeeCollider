define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var cc = require("./cc");
  var installer = require("./installer");
  var sched     = require("./sched");
  var Timeline  = sched.Timeline;
  var Task      = sched.Task;
  var TaskDo    = sched.TaskDo;

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
      cc.register = installer.register(cc);
      sched.install(cc);
    });
    beforeEach(function() {
      cc.server = new MockServer();
      timeline  = cc.server.timeline;
      sync = function(func) {
        timeline.push(func);
      };
      procN = function(n) {
        for (var i = 0; i < n; i++) {
          timeline.process();
        }
      };
      procT = function(t) {
        var n = Math.ceil(t / timeline.currentTimeIncr);
        for (var i = 0; i < n; i++) {
          timeline.process();
        }
      };
      timeline.play();
    });
    describe("TaskDo", function() {
      it("create", function() {
        var t = cc.Task.do(function() {
        });
        assert.instanceOf(t, TaskDo);
      });
      it("do", function() {
        var passed = 0;
        var t = cc.Task.do(function() {
          passed += 1;
        }).play();
        procN(2);
        assert.equal(passed, 1);
      });
      it("sync", function() {
        var passed = 0;
        var t = cc.Task.do(function() {
          passed += 1;
          this.wait(1000);
          sync(function() {
            passed += 1;
          });
        }).play();
        procT(10);
        assert.equal(passed, 1);
        procT(1000);
        assert.equal(passed, 2);
      });
    });
    
  });

});
