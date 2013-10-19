define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var fn = require("./fn");
  var Emitter = require("../common/emitter").Emitter;
  var push  = [].push;
  var slice = [].slice;

  var Timeline = (function() {
    function Timeline() {
      this.klassName = "Timeline";
      this.reset();
    }
    Timeline.prototype.play = function() {
      this.counterIncr = (cc.server.bufLength / cc.server.sampleRate) * 1000;
    };
    Timeline.prototype.pause = function() {
    };
    Timeline.prototype.reset = function() {
      var globalTask = new GlobalTask(this);
      this._list  = [ globalTask ];
      this._stack = [ globalTask ];
      this._globalTask = globalTask;
    };
    Timeline.prototype.append = function(sched) {
      var index = this._list.indexOf(sched);
      if (index === -1) {
        this._list.push(sched);
      }
    };
    Timeline.prototype.remove = function(sched) {
      var index = this._list.indexOf(sched);
      if (index !== -1) {
        this._list.splice(index, 1);
      }
    };
    Timeline.prototype.push = function(that, func, args) {
      var sched = this._stack[this._stack.length - 1];
      sched._push(that, func, args);
    };
    Timeline.prototype.process = function() {
      var _list = this._list;
      var counterIncr = this.counterIncr;
      for (var i = 0; i < _list.length; ++i) {
        _list[i]._process(counterIncr);
      }
    };
    return Timeline;
  })();

  var Task = (function() {
    function Task(timeline) {
      Emitter.call(this);
      this.klassName = "Task";
      this.blocking  = true;
      this._timeline = timeline || cc.server.timeline;
      this._context = new TaskContext(this);
      this._queue = [];
      this._bang  = false;
      this._index = 0;
      this._prev  = null;
      this._next  = null;
    }
    fn.extend(Task, Emitter);
    
    Task.prototype.play = fn.sync(function() {
      var that = this;
      while (that._prev !== null) {
        that = that._prev;
      }
      if (that._timeline) {
        that._timeline.append(that);
      }
      if (that._queue.length === 0) {
        that._bang = true;
      }
    });
    Task.prototype.pause = fn.sync(function() {
      if (this._timeline) {
        this._timeline.remove(this);
      }
      this._bang = false;
    });
    Task.prototype.stop = fn.sync(function() {
      if (this._timeline) {
        this._timeline.remove(this);
      }
      this._bang = false;
      this._timeline = null;
      this.blocking = false;
      this.emit("end");
      if (this._next) {
        this._next._prev = null;
        this._next.play();
        this._next = null;
      }
    });
    Task.prototype["do"] = function(func) {
      var next = TaskInterface["do"](func);
      next._prev = this;
      this._next = next;
      return next;
    };
    Task.prototype.loop = function(func) {
      var next = TaskInterface.loop(func);
      next._prev = this;
      this._next = next;
      return next;
    };
    Task.prototype.each = function(list, func) {
      var next = TaskInterface.each(list, func);
      next._prev = this;
      this._next = next;
      return next;
    };
    Task.prototype.timeout = function(delay, func) {
      var next = TaskInterface.timeout(delay, func);
      next._prev = this;
      this._next = next;
      return next;
    };
    Task.prototype.interval = function(delay, func) {
      var next = TaskInterface.interval(delay, func);
      next._prev = this;
      this._next = next;
      return next;
    };
    
    Task.prototype._push = function(that, func, args) {
      switch (typeof that) {
      case "function":
        this._queue.push([that, null, args]);
        break;
      case "number":
        this._queue.push(that);
        break;
      default:
        this._queue.push([func, that, args]);
        break;
      }
    };
    Task.prototype._done = function() {
    };
    Task.prototype._process = function(counterIncr) {
      var _timeline = this._timeline;
      var _queue   = this._queue;
      var continuance = false;
      do {
        if (this._bang) {
          _timeline._stack.push(this);
          this._execute();
          this._index += 1;
          _timeline._stack.pop();
          this._bang = false;
        }
        var i = 0;
        LOOP:
        while (i < _queue.length) {
          var e = _queue[i];
          switch (typeof e) {
          case "number":
            _queue[i] -= counterIncr;
            if (_queue[i] > 0) {
              break LOOP;
            }
            break;
          case "function":
            e();
            break;
          default:
            if (Array.isArray(e)) {
              e[0].apply(e[1], e[2]);
            } else {
              if (e.blocking) {
                break LOOP;
              }
            }
          }
          i += 1;
        }
        continuance = false;
        if (i) {
          _queue.splice(0, i);
          if (_queue.length === 0) {
            continuance = this._done();
          }
        }
      } while (continuance);
    };
    return Task;
  })();

  var TaskContext = (function() {
    function TaskContext(task) {
      this.klassName = "TaskContext";
      this.wait = function() {
        push.apply(task._queue, slice.call(arguments));
      };
      this.pause = function() {
        task.pause();
      };
      this.stop = function() {
        task.stop();
      };
      this.sync = function(func) {
        if (typeof func === "function") {
          cc.server.timeline.push(func);
        }
      };
    }
    return TaskContext;
  })();

  var GlobalTask = (function() {
    function GlobalTask(timeline) {
      Task.call(this, timeline);
      this.klassName = "GlobalTask";
    }
    fn.extend(GlobalTask, Task);
    GlobalTask.prototype.play  = function() {};
    GlobalTask.prototype.pause = function() {};
    GlobalTask.prototype.stop  = function() {};
    return GlobalTask;
  })();

  var TaskDo = (function() {
    function TaskLoop(func) {
      Task.call(this);
      this.func = func;
    }
    fn.extend(TaskLoop, Task);

    TaskLoop.prototype._execute = function() {
      this.func.call(this._context, this._index);
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
      this._bang = true;
    };
    
    return TaskLoop;
  })();

  var TaskEach = (function() {
    function TaskEach(list, func) {
      Task.call(this);
      this.list = list;
      this.func = func;
    }
    fn.extend(TaskEach, Task);

    TaskEach.prototype._execute = function() {
      if (this._index < this.list.length) {
        this.func.call(this._context, this.list[this._index], this._index);
      }
    };
    TaskEach.prototype._done = function() {
      if (this._index < this.list.length) {
        this._bang = true;
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
      this._queue.push(delay);
    }
    fn.extend(TaskTimeout, Task);
    
    TaskTimeout.prototype._execute = function() {
      this.func.call(this._context, this._index);
    };
    TaskTimeout.prototype._done = function() {
      if (this._index === 0) {
        this._bang = true;
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
      this._bang = true;
      return true;
    };
    
    return TaskInterval;
  })();
  
  var TaskBlock = (function() {
    function TaskBlock(count) {
      this.klassName = "TaskBlock";
      if (typeof count !== "number") {
        count = 1;
      }
      this._count = count;
      this.blocking = true;
    }
    TaskBlock.prototype.lock = fn.sync(function(count) {
      if (typeof count !== "number") {
        count = 1;
      }
      this._count += count;
    });
    TaskBlock.prototype.free = fn.sync(function(count) {
      if (typeof count !== "number") {
        count = 1;
      }
      this._count -= count;
      if (this._count <= 0) {
        this.blocking = false;
      }
    });
    return TaskBlock;
  })();
  
  var TaskInterface = {
    "do": function(func) {
      if (typeof func !== "function") {
        throw new TypeError("Task.do: arguments[0] is not a Function.");
      }
      return new TaskDo(func);
    },
    loop: function(func) {
      if (typeof func !== "function") {
        throw new TypeError("Task.loop: arguments[0] is not a Function.");
      }
      return new TaskLoop(func);
    },
    each: function(list, func) {
      if (!(Array.isArray(list))) {
        throw new TypeError("Task.each: arguments[0] is not an Array.");
      }
      if (typeof func !== "function") {
        throw new TypeError("Task.each: arguments[1] is not a Function.");
      }
      return new TaskEach(list, func);
    },
    timeout: function(delay, func) {
      if (typeof delay !== "number") {
        throw new TypeError("Task.timeout: arguments[0] is not a Number.");
      }
      if (typeof func !== "function") {
        throw new TypeError("Task.timeout: arguments[1] is not a Function.");
      }
      return new TaskTimeout(delay, func);
    },
    interval: function(delay, func) {
      if (typeof delay !== "number") {
        throw new TypeError("Task.interval: arguments[0] is not a Number.");
      }
      if (typeof func !== "function") {
        throw new TypeError("Task.interval: arguments[1] is not a Function.");
      }
      return new TaskInterval(delay, func);
    },
    block: function() {
      return new TaskBlock();
    },
  };
  
  var install = function() {
    global.Task = TaskInterface;
    global.wait = function() {
      var globalTask = cc.server.timeline._globalTask;
      push.apply(globalTask._queue, slice.call(arguments));
    };
    global.sync = function(func) {
      if (typeof func === "function") {
        var globalTask = cc.server.timeline._globalTask;
        globalTask._push(func);
      }
    };
  };
  
  module.exports = {
    Timeline: Timeline,
    GlobalTask: GlobalTask,
    Task      : Task,
    TaskDo    : TaskDo,
    TaskLoop  : TaskLoop,
    TaskEach  : TaskEach,
    TaskTimeout : TaskTimeout,
    TaskInterval: TaskInterval,
    TaskBlock: TaskBlock,
    TaskInterface: TaskInterface,
    install: install
  };

});
