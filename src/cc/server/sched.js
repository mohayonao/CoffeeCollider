define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");
  var fn = require("./fn");

  var Timeline = (function() {
    function Timeline() {
      this.klassName = "Timeline";
      this._list  = [];
      this._stack = [];
    }
    Timeline.prototype.play = function() {
      this.counterIncr = (cc.server.bufLength / cc.server.sampleRate) * 1000;
    };
    Timeline.prototype.pause = function() {
    };
    Timeline.prototype.reset = function() {
      this._list = [];
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
      if (sched) {
        sched._push(that, func, args);
      } else {
        if (typeof that === "function") {
          that();
        } else {
          func.apply(that, args);
        }
      }
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
    function Task() {
      this.klassName = "Task";
      this._timeline = cc.server.timeline;
      this._context = new TaskContext(this);
      this._queue = [];
      this._bang  = false;
      this._index = 0;
    }
    
    Task.prototype.play = fn.sync(function() {
      if (this._timeline) {
        this._timeline.append(this);
      }
      if (this._queue.length === 0) {
        this._bang = true;
      }
    });
    Task.prototype.pause = fn.sync(function() {
      if (this._timeline) {
        this._timeline.remove(this);
      }
      this._bang = false;
    });
    Task.prototype.stop = fn.sync(function() {
      this.pause();
      this._timeline = null;
    });
    Task.prototype._push = function(that, func, args) {
      if (typeof that === "function") {
        this._queue.push([that, null, args]);
      } else {
        this._queue.push([func, that, args]);
      }
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
            } else if (e instanceof Task) {
              if (e._timeline !== null) {
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
      this.wait = function(sync) {
        task._queue.push(sync);
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
