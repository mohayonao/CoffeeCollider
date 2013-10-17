define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");
  var fn = require("./fn");

  var Timeline = (function() {
    function Timeline() {
      this.klassName = "Timeline";
      this.list  = [];
      this.stack = [];
    }
    Timeline.prototype.play = function() {
      this.counterIncr = (cc.server.bufLength / cc.server.sampleRate) * 1000;
    };
    Timeline.prototype.pause = function() {
    };
    Timeline.prototype.reset = function() {
      this.list = [];
    };
    Timeline.prototype.append = function(sched) {
      var index = this.list.indexOf(sched);
      if (index === -1) {
        this.list.push(sched);
      }
    };
    Timeline.prototype.remove = function(sched) {
      var index = this.list.indexOf(sched);
      if (index !== -1) {
        this.list.splice(index, 1);
      }
    };
    Timeline.prototype.push = function(func) {
      var sched = this.stack[this.stack.length - 1];
      if (sched) {
        sched.push(func);
      } else {
        func();
      }
    };
    Timeline.prototype.process = function() {
      var list = this.list;
      var counterIncr = this.counterIncr;
      for (var i = 0; i < list.length; ++i) {
        list[i].process(counterIncr);
      }
    };
    return Timeline;
  })();

  var Task = (function() {
    function Task() {
      this.klassName = "Task";
      this.timeline = cc.server.timeline;
      this.payload = new TaskPayload(this);
      this.events = [];
      this.bang = false;
      this.counter = 0;
    }
    Task.prototype.play = function() {
      if (this.timeline) {
        var that = this;
        this.timeline.push(function() {
          that.timeline.append(that);
          if (that.events.length === 0) {
            that.bang = true;
          }
        });
      }
      return this;
    };
    Task.prototype.pause = function() {
      if (this.timeline) {
        var that = this;
        this.timeline.push(function() {
          that.timeline.remove(that);
          that.bang = false;
        });
      }
      return this;
    };
    Task.prototype.stop = function() {
      if (this.timeline) {
        var that = this;
        this.timeline.push(function() {
          that.pause();
          that.timeline = null;
        });
      }
      return this;
    };
    Task.prototype.push = function(func) {
      if (typeof func === "function") {
        this.events.push(func);
      }
    };
    Task.prototype.process = function(counterIncr) {
      var timeline = this.timeline;
      var events   = this.events;
      var continuance = false;
      do {
        if (this.bang) {
          timeline.stack.push(this);
          this._execute();
          timeline.stack.pop();
          this.bang = false;
        }
        var i = 0;
        LOOP:
        while (i < events.length) {
          switch (typeof events[i]) {
          case "number":
            events[i] -= counterIncr;
            if (events[i] > 0) {
              break LOOP;
            }
            break;
          case "function":
            events[i]();
            break;
          default:
            if (events[i] instanceof Task) {
              if (events[i].timeline !== null) {
                break LOOP;
              }
            }
          }
          i += 1;
        }
        continuance = false;
        if (i) {
          events.splice(0, i);
          if (events.length === 0) {
            continuance = this._done();
          }
        }
      } while (continuance);
    };
    return Task;
  })();
  
  var TaskPayload = (function() {
    function TaskPayload(task) {
      this.task = task;
    }
    TaskPayload.prototype.wait = function(sync) {
      this.task.events.push(sync); // End of Task
    };
    TaskPayload.prototype.pause = function() {
      this.task.pause();
    };
    TaskPayload.prototype.stop = function() {
      this.task.stop();
    };
    return TaskPayload;
  })();

  var TaskDo = (function() {
    function TaskLoop(func) {
      Task.call(this);
      this.func = func;
    }
    fn.extend(TaskLoop, Task);

    TaskLoop.prototype._execute = function() {
      this.func.call(this.payload);
    };
    TaskLoop.prototype._done = function() {
      this.stop();
    };
    
    return TaskLoop;
  })();
  
  var TaskLoop = (function() {
    function TaskLoop(func) {
      TaskDo.call(this, func);
    }
    fn.extend(TaskLoop, TaskDo);

    TaskLoop.prototype._done = function() {
      this.bang = true;
    };
    
    return TaskLoop;
  })();

  var TaskEach = (function() {
    function TaskEach(list, func) {
      Task.call(this);
      this.list = list;
      this.func = func;
      this.index = 0;
    }
    fn.extend(TaskEach, Task);

    TaskEach.prototype._execute = function() {
      if (this.index < this.list.length) {
        this.func.call(this.payload, this.list[this.index++]);
      }
    };
    TaskEach.prototype._done = function() {
      if (this.index < this.list.length) {
        this.bang = true;
      } else {
        this.stop();
      }
    };
    
    return TaskEach;
  })();

  var TaskTimeout = (function() {
    function TaskTimeout(delay, func) {
      Task.call(this);
      delay = Math.max(0, delay);
      if (isNaN(delay)) {
        delay = 0;
      }
      this.func = func;
      this.events.push(delay);
      this.once = true;
    }
    fn.extend(TaskTimeout, Task);
    
    TaskTimeout.prototype._execute = function() {
      this.func.call(this.payload);
    };
    TaskTimeout.prototype._done = function() {
      if (this.once) {
        this.bang = true;
        this.once = false;
        return true;
      }
      this.stop();
    };
    
    return TaskTimeout;
  })();
  
  var TaskInterval = (function() {
    function TaskInterval(delay, func) {
      TaskTimeout.call(this, delay, func);
    }
    fn.extend(TaskInterval, TaskTimeout);

    TaskInterval.prototype._done = function() {
      this.bang = true;
      return true;
    };
    
    return TaskInterval;
  })();
  
  var TaskInterface = (function() {
    function TaskInterface() {
      this.klassName = "Task";
    }

    TaskInterface.prototype.$do = function(func) {
      if (typeof func === "function") {
        return new TaskDo(func);
      }
      throw new TypeError();
    };
    TaskInterface.prototype.$loop = function(func) {
      if (typeof func === "function") {
        return new TaskLoop(func);
      }
      throw new TypeError();
    };
    TaskInterface.prototype.$each = function(list, func) {
      if (Array.isArray(list) && typeof func === "function") {
        return new TaskEach(list, func);
      }
      throw new TypeError();
    };
    TaskInterface.prototype.$timeout = function(delay, func) {
      if (typeof delay === "number" && typeof func === "function") {
        return new TaskTimeout(delay, func);
      }
      throw new TypeError();
    };
    TaskInterface.prototype.$interval = function(delay, func) {
      if (typeof delay === "number" && typeof func === "function") {
        return new TaskInterval(delay, func);
      }
      throw new TypeError();
    };
    
    fn.classmethod(TaskInterface);
    
    return TaskInterface;
  })();

  var install = function(register) {
    register("Task", TaskInterface);
  };
  
  module.exports = {
    Timeline: Timeline,
    Task    : Task,
    TaskDo  : TaskDo,
    TaskLoop: TaskLoop,
    TaskEach: TaskEach,
    TaskTimeout : TaskTimeout,
    TaskInterval: TaskInterval,
    TaskInterface: TaskInterface,
    install: install
  };

});
