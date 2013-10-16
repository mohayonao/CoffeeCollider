define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");
  var fn = require("./fn");

  var Timeline = (function() {
    function Timeline(server) {
      this.klassName = "Timeline";
      this.server = server;
      this.list = [];
      this.requireSort = false;
      this.currentTime = 0;
      this.currentTimeIncr = 0;
    }
    Timeline.prototype.play = function() {
      this.currentTimeIncr = (this.server.bufLength / this.server.sampleRate) * 1000;
    };
    Timeline.prototype.pause = function() {
      this.currentTimeIncr = 0;
    };
    Timeline.prototype.reset = function() {
      this.list = [];
      this.requireSort = false;
      this.currentTime = 0;
    };
    Timeline.prototype.push = function() {
      var list = this.list;

      var i = 0;
      var time, looper, immediately;

      if (typeof arguments[i] === "number") {
        time = arguments[i++];
      } else {
        time = this.currentTime;
      }
      if (arguments[i] instanceof Scheduler) {
        looper = arguments[i++];
      } else if (typeof arguments[i] === "function") {
        looper = { execute: arguments[i++] };
      }
      if (typeof arguments[i] === "boolean") {
        immediately = arguments[i++];
      } else {
        immediately = false;
      }
      if (list.length) {
        if (time < list[list.length - 1][0]) {
          this.requireSort = true;
        }
      }
      list.push([ time, looper ]);
      if (immediately && this.requireSort) {
        list.sort(sortFunction);
        this.requireSort = false;
      }
    };
    var sortFunction = function(a, b) {
      return a[0] - b[0];
    };
    Timeline.prototype.process = function() {
      var currentTime = this.currentTime;
      var list = this.list;
      if (this.requireSort) {
        list.sort(sortFunction);
        this.requireSort = false;
      }
      var i = 0, imax = list.length;
      while (i < imax) {
        if (list[i][0] < currentTime) {
          list[i][1].execute(currentTime);
        } else {
          break;
        }
        i += 1;
      }
      if (i) {
        list.splice(0, i);
      }
      this.currentTime = currentTime + this.currentTimeIncr;
    };
    return Timeline;
  })();

  var Scheduler = (function() {
    function Scheduler() {
      this.klassName = "Scheduler";
      this.server = cc.server;
      this.payload = new SchedPayload(this.server.timeline);
      this.running = false;
    }
    Scheduler.prototype.execute = function(currentTime) {
      if (this.running) {
        this._execute();
        this.server.timeline.currentTime = currentTime;
      }
    };
    Scheduler.prototype.run = function() {
      var that = this;
      var timeline = this.server.timeline;
      timeline.push(function() {
        that.running = true;
        timeline.push(0, that);
      }, true);
      return this;
    };
    Scheduler.prototype.pause = function() {
      var that = this;
      var timeline = this.server.timeline;
      timeline.push(function() {
        that.running = false;
      }, true);
      return this;
    };
    return Scheduler;
  })();

  var SchedPayload = (function() {
    function SchedPayload(timeline) {
      this.timeline = timeline;
      this.isBreak  = false;
    }
    SchedPayload.prototype.wait = function(msec) {
      msec = +msec;
      if (!isNaN(msec)) {
        this.timeline.currentTime += msec;
      }
    };
    SchedPayload.prototype.break = function() {
      this.isBreak = true;
    };
    return SchedPayload;
  })();

  var TaskDo = (function() {
    function TaskLoop(func) {
      Scheduler.call(this);
      this.func = func;
    }
    fn.extend(TaskLoop, Scheduler);

    TaskLoop.prototype._execute = function() {
      this.func.call(this.payload);
    };
    
    return TaskLoop;
  })();
  
  var TaskLoop = (function() {
    function TaskLoop(func) {
      Scheduler.call(this);
      this.func = func;
    }
    fn.extend(TaskLoop, Scheduler);

    TaskLoop.prototype._execute = function() {
      this.func.call(this.payload);
      if (!this.payload.isBreak) {
        this.server.timeline.push(this);
      }
    };
    
    return TaskLoop;
  })();

  var TaskEach = (function() {
    function TaskEach(list, func) {
      Scheduler.call(this);
      this.list  = list;
      this.func  = func;
      this.index = 0;
    }
    fn.extend(TaskEach, Scheduler);

    TaskEach.prototype._execute = function() {
      if (this.index < this.list.length) {
        this.func.call(this.payload, this.list[this.index++]);
        if (!this.payload.isBreak) {
          this.server.timeline.push(this);
        }
      }
    };
    
    return TaskEach;
  })();

  var TaskTimeout = (function() {
    function TaskTimeout(delay, func) {
      Scheduler.call(this);
      this.delay = delay;
      this.func  = func;
    }
    fn.extend(TaskTimeout, Scheduler);
    
    TaskTimeout.prototype.run = function() {
      var that = this;
      var timeline = this.server.timeline;
      timeline.push(timeline.currentTime + this.delay, function() {
        timeline.push(0, that);
      });
    };
    TaskTimeout.prototype._execute = function() {
      this.func.call(this.payload);
    };
    
    return TaskTimeout;
  })();
  
  var TaskInterval = (function() {
    function TaskInterval(delay, func) {
      TaskTimeout.call(this, delay, func);
    }
    fn.extend(TaskInterval, TaskTimeout);

    TaskInterval.prototype._execute = function() {
      this.func.call(this.payload);
      if (!this.payload.isBreak) {
        var timeline = this.server.timeline;
        timeline.push(timeline.currentTime + this.delay, this);
      }
    };
    
    return TaskInterval;
  })();
  
  var Task = (function() {
    function Task() {
      this.klassName = "Task";
    }

    Task.prototype.$do = function(func) {
      return new TaskDo(func);
    };
    Task.prototype.$loop = function(func) {
      return new TaskLoop(func);
    };
    Task.prototype.$each = function(list, func) {
      return new TaskEach(list, func);
    };
    Task.prototype.$timeout = function(delay, func) {
      return new TaskTimeout(delay, func);
    };
    Task.prototype.$interval = function(delay, func) {
      return new TaskInterval(delay, func);
    };
    
    fn.classmethod(Task);
    
    return Task;
  })();

  var install = function(namespace) {
    namespace.register("Task", Task);
  };
  
  module.exports = {
    Timeline: Timeline,
    TaskLoop: TaskLoop,
    TaskEach: TaskEach,
    TaskTimeout : TaskTimeout,
    TaskInterval: TaskInterval,
    Task    : Task,
    install : install
  };

});
