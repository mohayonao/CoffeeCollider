define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var fn = require("./fn");
  var extend = require("../common/extend");
  var Emitter = require("../common/emitter").Emitter;
  
  var Timeline = (function() {
    function Timeline() {
      this.klassName = "Timeline";
      this.reset();
    }
    Timeline.prototype.play = function() {
      this.counterIncr = (cc.client.bufLength / cc.client.sampleRate) * 1000;
    };
    Timeline.prototype.pause = function() {
    };
    Timeline.prototype.reset = function() {
      var globalTask = new GlobalTask(this);
      this._list   = [ globalTask ];
      this._stack  = [ globalTask ];
      this.context = globalTask.context;
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
      Emitter.bind(this);
      this.klassName = "Task";
      this.blocking  = true;
      this.timeline = timeline || cc.client.timeline;
      this.context = new TaskContext(this);
      this._queue = [];
      this._bang  = false;
      this._index = 0;
      this._prev  = null;
      this._next  = null;
    }
    extend(Task, cc.Object);
    
    Task.prototype.play = fn.sync(function() {
      var that = this;
      while (that._prev !== null) {
        that = that._prev;
      }
      if (that.timeline) {
        that.timeline.append(that);
      }
      if (that._queue.length === 0) {
        that._bang = true;
      }
    });
    Task.prototype.pause = fn.sync(function() {
      if (this.timeline) {
        this.timeline.remove(this);
      }
      this._bang = false;
    });
    Task.prototype.stop = fn.sync(function() {
      if (this.timeline) {
        this.timeline.remove(this);
      }
      this._bang = false;
      this.timeline = null;
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
      if (typeof that === "function") {
        this._queue.push([that, null, args]);
      } else {
        this._queue.push([func, that, args]);
      }
    };
    Task.prototype._done = function() {
    };
    Task.prototype._process = function(counterIncr) {
      var timeline = this.timeline;
      var _queue   = this._queue;
      var continuance = false;
      do {
        if (this._bang) {
          timeline._stack.push(this);
          this._execute();
          this._index += 1;
          timeline._stack.pop();
          this._bang = false;
        }
        var i = 0;
        LOOP:
        while (i < _queue.length) {
          var e = _queue[i];
          if (Array.isArray(e)) {
            e[0].apply(e[1], e[2]);
          } else {
            if (e instanceof TaskWaitToken) {
              e.process(counterIncr);
            }
            if (e.blocking) {
              break LOOP;
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

  var TaskWaitToken = (function() {
    function TaskWaitToken(item, callback) {
      if (item instanceof TaskWaitToken) {
        if (typeof callback === "function") {
          item.callback = callback;
        }
        return item;
      }
      this.klassName = "TaskWaitToken";
      if (callback === undefined) {
        if (typeof item === "function") {
          callback = item;
          item = 0;
        }
      }
      this.item = item;
      this.callback = callback;
      this.blocking = true;
    }
    extend(TaskWaitToken, cc.Object);
    
    TaskWaitToken.prototype.process = function(counterIncr) {
      if (this.blocking) {
        var blocking = true;
        if (typeof this.item === "number") {
          this.item -= counterIncr;
          if (this.item <= 0) {
            blocking = false;
          }
        } else if (this.item instanceof TaskWaitToken) {
          blocking = this.item.process();
        } else if (!this.item.blocking) {
          blocking = false;
        }
        if (!blocking) {
          this.blocking = false;
          if (this.callback) {
            this.callback();
            delete this.callback;
          }
        }
      }
      return this.blocking;
    };
    return TaskWaitToken;
  })();

  var TaskWaitTokenAND = (function() {
    function TaskWaitTokenAND(list) {
      this.klassName = "TaskWaitTokenAND";
      this.list = list.map(function(x) {
        return new TaskWaitToken(x);
      });
    }
    extend(TaskWaitTokenAND, TaskWaitToken);
    TaskWaitTokenAND.prototype.process = function(counterIncr) {
      this.blocking = this.list.reduce(function(blocking, x) {
        return x.process(counterIncr) || blocking;
      }, false);
      if (!this.blocking) {
        if (this.callback) {
          this.callback();
          delete this.callback;
        }
      }
      return this.blocking;
    };
    TaskWaitTokenAND.prototype.__and__ = function(x) {
      if (Array.isArray(x)) {
        this.list = this.list.concat(x.map(function(x) {
          return new TaskWaitToken(x);
        }));
      } else {
        this.list.push(new TaskWaitToken(x));
      }
      return this;
    };
    return TaskWaitTokenAND;
  })();
  
  var TaskWaitTokenOR = (function() {
    function TaskWaitTokenOR(list) {
      this.klassName = "TaskWaitTokenOR";
      this.list = list.map(function(x) {
        return new TaskWaitToken(x);
      });
    }
    extend(TaskWaitTokenOR, TaskWaitToken);
    TaskWaitTokenOR.prototype.process = function(counterIncr) {
      this.blocking = this.list.reduce(function(blocking, x) {
        return x.process(counterIncr) && blocking;
      }, true);
      if (!this.blocking) {
        if (this.callback) {
          this.callback();
          delete this.callback;
        }
      }
      return this.blocking;
    };
    TaskWaitTokenOR.prototype.__or__ = function(x) {
      if (Array.isArray(x)) {
        this.list = this.list.concat(x.map(function(x) {
          return new TaskWaitToken(x);
        }));
      } else {
        this.list.push(new TaskWaitToken(x));
      }
      return this;
    };
    return TaskWaitTokenOR;
  })();
  
  var TaskContext = (function() {
    function TaskContext(task) {
      this.klassName = "TaskContext";
      this.wait = function(item, callback) {
        task._queue.push(new TaskWaitToken(item, callback));
      };
      this.pause = function() {
        task.pause();
      };
      this.stop = function() {
        task.stop();
      };
    }
    return TaskContext;
  })();

  var GlobalTask = (function() {
    function GlobalTask(timeline) {
      Task.call(this, timeline);
      this.klassName = "GlobalTask";
    }
    extend(GlobalTask, Task);
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
    extend(TaskLoop, Task);

    TaskLoop.prototype._execute = function() {
      this.func.call(this.context, this._index);
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
    extend(TaskLoop, TaskDo);

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
    extend(TaskEach, Task);

    TaskEach.prototype._execute = function() {
      if (this._index < this.list.length) {
        this.func.call(this.context, this.list[this._index], this._index);
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
      this._queue.push(new TaskWaitToken(delay));
    }
    extend(TaskTimeout, Task);
    
    TaskTimeout.prototype._execute = function() {
      this.func.call(this.context, this._index);
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
    extend(TaskInterval, TaskTimeout);

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
  
  var TaskInterface = function() {
  };
  TaskInterface["do"] = function(func) {
    if (typeof func !== "function") {
      throw new TypeError("Task.do: arguments[0] is not a Function.");
    }
    return new TaskDo(func);
  };
  TaskInterface.loop = function(func) {
    if (typeof func !== "function") {
      throw new TypeError("Task.loop: arguments[0] is not a Function.");
    }
    return new TaskLoop(func);
  };
  TaskInterface.each = function(list, func) {
    if (!(Array.isArray(list))) {
      throw new TypeError("Task.each: arguments[0] is not an Array.");
    }
    if (typeof func !== "function") {
      throw new TypeError("Task.each: arguments[1] is not a Function.");
    }
    return new TaskEach(list, func);
  };
  TaskInterface.timeout = function(delay, func) {
    if (typeof delay !== "number") {
      throw new TypeError("Task.timeout: arguments[0] is not a Number.");
    }
    if (typeof func !== "function") {
      throw new TypeError("Task.timeout: arguments[1] is not a Function.");
    }
    return new TaskTimeout(delay, func);
  };
  TaskInterface.interval = function(delay, func) {
    if (typeof delay !== "number") {
      throw new TypeError("Task.interval: arguments[0] is not a Number.");
    }
    if (typeof func !== "function") {
      throw new TypeError("Task.interval: arguments[1] is not a Function.");
    }
    return new TaskInterval(delay, func);
  };
  TaskInterface.block = function() {
    return new TaskBlock();
  };
  
  var install = function() {
    global.Task = TaskInterface;
    
    // TODO: should be moved
    cc.Object.prototype.__and__ = function(b) {
      return new TaskWaitTokenAND([this].concat(b));
    };
    Number.prototype.__and__ = function(b) {
      var a = this;
      if (typeof b === "number") {
        return new TaskWaitToken(Math.max(a, b));
      }
      return new TaskWaitTokenAND([a].concat(b));
    };
    Array.prototype.__and__ = function(b) {
      return new TaskWaitTokenAND(this.concat(b));
    };
    cc.Object.prototype.__or__ = function(b) {
      return new TaskWaitTokenOR([this].concat(b));
    };
    Number.prototype.__or__ = function(b) {
      var a = this;
      if (typeof b === "number") {
        return new TaskWaitToken(Math.max(a, b));
      }
      return new TaskWaitTokenOR([a].concat(b));
    };
    Array.prototype.__or__ = function(b) {
      return new TaskWaitTokenOR(this.concat(b));
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
