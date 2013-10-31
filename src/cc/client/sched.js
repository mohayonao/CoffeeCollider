define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var fn = require("./fn");
  var extend = require("../common/extend");
  var emitter = require("../common/emitter");
  
  var Timeline = (function() {
    function Timeline() {
      this.klassName = "Timeline";
      this.reset();
    }
    extend(Timeline, cc.Object);
    
    Timeline.prototype.play = function(counterIncr) {
      this.counterIncr = counterIncr;
    };
    Timeline.prototype.pause = function() {
      this.counterIncr = 0;
    };
    Timeline.prototype.reset = function() {
      var taskGlobal = cc.createTaskGlobal(this);
      this._list   = [ taskGlobal ];
      this._stack  = [ taskGlobal ];
      this.context = taskGlobal.context;
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
      this._stack[this._stack.length - 1].push(that, func, args);
    };
    Timeline.prototype.process = function() {
      var counterIncr = this.counterIncr;
      if (counterIncr) {
        var _list = this._list;
        for (var i = 0; i < _list.length; ++i) {
          _list[i].process(counterIncr);
        }
      }
    };
    
    return Timeline;
  })();
  
  var TaskWaitToken = (function() {
    function TaskWaitToken(item) {
      emitter.mixin(this);
      this.klassName = "TaskWaitToken";
      this.item = item;
      this._blocking = true;
    }
    extend(TaskWaitToken, cc.Object);
    
    TaskWaitToken.prototype.performWait = function() {
      if (this._blocking) {
        this._blocking = !!this.item;
        if (!this._blocking) {
          this.emit("end");
        }
      }
      return this._blocking;
    };
    
    return TaskWaitToken;
  })();

  var TaskWaitTokenNumber = (function() {
    function TaskWaitTokenNumber(item) {
      TaskWaitToken.call(this, item);
      this.klassName = "TaskWaitTokenNumber";
    }
    extend(TaskWaitTokenNumber, TaskWaitToken);
    
    TaskWaitTokenNumber.prototype.performWait = function(counterIncr) {
      if (this._blocking) {
        this.item -= counterIncr;
        if (this.item <= 0) {
          this._blocking = false;
          this.emit("end");
        }
      }
      return this._blocking;
    };
    
    return TaskWaitTokenNumber;
  })();

  var TaskWaitTokenFunction = (function() {
    function TaskWaitTokenFunction(item) {
      TaskWaitToken.call(this, item);
      this.klassName = "TaskWaitTokenFunction";
    }
    extend(TaskWaitTokenFunction, TaskWaitToken);
    
    TaskWaitTokenFunction.prototype.performWait = function() {
      if (this._blocking) {
        this._blocking = !!this.item();
        if (!this._blocking) {
          this.emit("end");
        }
      }
      return this._blocking;
    };
    
    return TaskWaitTokenFunction;
  })();

  var TaskWaitTokenBoolean = (function() {
    function TaskWaitTokenBoolean(item) {
      TaskWaitToken.call(this, item);
      this.klassName = "TaskWaitTokenBoolean";
    }
    extend(TaskWaitTokenBoolean, TaskWaitToken);
    
    TaskWaitTokenBoolean.prototype.performWait = function() {
      if (this._blocking) {
        this._blocking = this.item;
        if (!this._blocking) {
          this.emit("end");
        }
      }
      return this._blocking;
    };
    
    return TaskWaitTokenBoolean;
  })();
  
  var TaskWaitTokenBlock = (function() {
    function TaskWaitTokenBlock(item) {
      TaskWaitToken.call(this, item);
      this.klassName = "TaskWaitTokenBlock";
    }
    extend(TaskWaitTokenBlock, TaskWaitToken);
    
    TaskWaitTokenBlock.prototype.performWait = function(counterIncr) {
      if (this._blocking) {
        this._blocking = this.item.performWait(counterIncr);
        if (!this._blocking) {
          this.emit("end");
        }
      }
      return this._blocking;
    };
    
    return TaskWaitTokenBlock;
  })();

  var TaskWaitAND = (function() {
    function TaskWaitAND(list) {
      emitter.mixin(this);
      this.klassName = "TaskWaitAND";
      var items = [];
      list.forEach(function(x) {
        if (x instanceof TaskWaitAND) {
          items = items.concat(x.list);
        } else {
          items.push(x);
        }
      });
      this.items = items;
      this._blocking = true;
    }
    extend(TaskWaitAND, TaskWaitToken);
    
    TaskWaitAND.prototype.performWait = function(counterIncr) {
      if (this._blocking) {
        this._blocking = this.items.reduce(function(_blocking, item) {
          return item.performWait(counterIncr) || _blocking;
        }, false);
      }
      if (!this._blocking) {
        this.emit("end");
      }
      return this._blocking;
    };
    
    return TaskWaitAND;
  })();

  var TaskWaitOR = (function() {
    function TaskWaitOR(list) {
      emitter.mixin(this);
      this.klassName = "TaskWaitOR";
      var items = [];
      list.forEach(function(x) {
        if (x instanceof TaskWaitOR) {
          items = items.concat(x.list);
        } else {
          items.push(x);
        }
      });
      this.items = items;
      this._blocking = true;
    }
    extend(TaskWaitOR, TaskWaitToken);
    
    TaskWaitOR.prototype.performWait = function(counterIncr) {
      if (this._blocking) {
        this._blocking = this.items.reduce(function(_blocking, item) {
          return item.performWait(counterIncr) && _blocking;
        }, true);
        if (!this._blocking) {
          this.emit("end");
        }
      }
      return this._blocking;
    };
    
    return TaskWaitOR;
  })();
  
  var TaskContext = (function() {
    function TaskContext(task) {
      this.klassName = "TaskContext";
      this.wait = function(item) {
        var token = cc.createTaskWaitToken(item);
        task._queue.push(token);
        return token;
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
  
  var Task = (function() {
    function Task() {
      emitter.mixin(this);
      this.klassName = "Task";
      this._blocking  = true;
      this.timeline  = cc.timeline;
      this.context   = cc.createTaskContext(this);
      this._queue = [];
      this._bang  = false;
      this._index = 0;
      this._prev  = null;
      this._next  = null;
    }
    extend(Task, cc.Object);
    
    Task.prototype.play = fn.sync(function() {
      var that = this;
      // rewind to the head task of a chain
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
      this._blocking = false;
      this.emit("end");
      if (this._next) {
        this._next._prev = null;
        this._next.play();
        this._next = null;
      }
    });
    Task.prototype.performWait = function() {
      return this._blocking;
    };

    // task chain methods
    Task.prototype["do"] = function(func) {
      var next = cc.createTaskDo(func);
      next._prev = this;
      this._next = next;
      return next;
    };
    Task.prototype.loop = function(func) {
      var next = cc.createTasLoop(func);
      next._prev = this;
      this._next = next;
      return next;
    };
    Task.prototype.each = function(list, func) {
      var next = cc.createTaskEach(list, func);
      next._prev = this;
      this._next = next;
      return next;
    };
    Task.prototype.timeout = function(delay, func) {
      var next = cc.createTaskTimeout(delay, func);
      next._prev = this;
      this._next = next;
      return next;
    };
    Task.prototype.interval = function(delay, func) {
      var next = cc.createTaskInterval(delay, func);
      next._prev = this;
      this._next = next;
      return next;
    };

    
    Task.prototype.push = function(that, func, args) {
      if (typeof that === "function") {
        this._queue.push([that, null, args]);
      } else {
        this._queue.push([func, that, args]);
      }
    };
    Task.prototype.done = function() {
      // should be overridden
    };
    Task.prototype.process = function(counterIncr) {
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
            if (e.performWait) {
              if (e.performWait(counterIncr)) {
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
            continuance = this.done();
          }
        }
      } while (continuance);
    };
    return Task;
  })();
  
  var TaskGlobal = (function() {
    function TaskGlobal(timeline) {
      Task.call(this, timeline);
      this.klassName = "TaskGlobal";
    }
    extend(TaskGlobal, Task);
    
    TaskGlobal.prototype.play  = function() {};
    TaskGlobal.prototype.pause = function() {};
    TaskGlobal.prototype.stop  = function() {};
    
    return TaskGlobal;
  })();
  
  var TaskDo = (function() {
    function TaskDo(func) {
      if (typeof func !== "function") {
        throw new TypeError("Task.do: First argument must be a Function.");
      }
      Task.call(this);
      this.klassName = "TaskDo";
      this.func = func;
    }
    extend(TaskDo, Task);

    TaskDo.prototype._execute = function() {
      this.func.call(this.context, this._index);
    };
    TaskDo.prototype.done = function() {
      this.stop();
    };
    
    return TaskDo;
  })();
  
  var TaskLoop = (function() {
    function TaskLoop(func) {
      if (typeof func !== "function") {
        throw new TypeError("Task.loop: First argument must be a Function.");
      }
      TaskDo.call(this, func);
      this.klassName = "TaskLoop";
    }
    extend(TaskLoop, TaskDo);

    TaskLoop.prototype.done = function() {
      this._bang = true;
    };
    
    return TaskLoop;
  })();

  var TaskEach = (function() {
    function TaskEach(list, func) {
      if (!(Array.isArray(list))) {
        throw new TypeError("Task.each: First argument must be an Array.");
      }
      if (typeof func !== "function") {
        throw new TypeError("Task.each: Second argument must be a Function.");
      }
      Task.call(this);
      this.klassName = "TaskEach";
      this.list = list;
      this.func = func;
    }
    extend(TaskEach, Task);

    TaskEach.prototype._execute = function() {
      if (this._index < this.list.length) {
        this.func.call(this.context, this.list[this._index], this._index);
      }
    };
    TaskEach.prototype.done = function() {
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
      if (typeof delay !== "number") {
        throw new TypeError("Task.timeout: First argument must be a Number.");
      }
      if (typeof func !== "function") {
        throw new TypeError("Task.timeout: Second argument must be a Function.");
      }
      Task.call(this);
      this.klassName = "TaskTimeout";
      delay = Math.max(0, delay);
      if (isNaN(delay)) {
        delay = 0;
      }
      this.func = func;
      this._queue.push(cc.createTaskWaitToken(delay));
    }
    extend(TaskTimeout, Task);
    
    TaskTimeout.prototype._execute = function() {
      this.func.call(this.context, this._index);
    };
    TaskTimeout.prototype.done = function() {
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
      if (typeof delay !== "number") {
        throw new TypeError("Task.interval: First argument must be a Number.");
      }
      if (typeof func !== "function") {
        throw new TypeError("Task.interval: Second argument must be a Function.");
      }
      TaskTimeout.call(this, delay, func);
      this.klassName = "TaskInterval";
    }
    extend(TaskInterval, TaskTimeout);

    TaskInterval.prototype.done = function() {
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
      this._blocking = true;
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
        this._blocking = false;
      }
    });
    TaskBlock.prototype.performWait = function() {
      return this._blocking;
    };
    return TaskBlock;
  })();
  
  var use = function() {
    cc.createTimeline = function() {
      cc.timeline = new Timeline();
      return cc.timeline;
    };
    cc.createTaskGlobal = function(timeline) {
      return new TaskGlobal(timeline);
    };
    cc.createTaskDo = function(func) {
      return new TaskDo(func);
    };
    cc.createTaskLoop = function(func) {
      return new TaskLoop(func);
    };
    cc.createTaskEach = function(list, func) {
      return new TaskEach(list, func);
    };
    cc.createTaskTimeout = function(delay, func) {
      return new TaskTimeout(delay, func);
    };
    cc.createTaskInterval = function(delay, func) {
      return new TaskInterval(delay, func);
    };
    cc.createTaskBlock = function() {
      return new TaskBlock();
    };
    cc.createTaskContext = function(task) {
      return new TaskContext(task);
    };
    cc.createTaskWaitToken = function(item) {
      if (item instanceof TaskWaitToken) {
        return item;
      }
      switch (typeof item) {
      case "number":
        return new TaskWaitTokenNumber(item);
      case "function":
        return new TaskWaitTokenFunction(item);
      case "boolean":
        return new TaskWaitTokenBoolean(item);
      default:
        if (item) {
          if (Array.isArray(item)) {
            return cc.createTaskWaitLogic("and", item);
          } else if (typeof item.performWait === "function") {
            return new TaskWaitTokenBlock(item);
          }
        }
      }
      throw new TypeError("TaskWaitToken: Invalid type");
    };
    cc.createTaskWaitLogic = function(logic, list) {
      list = list.map(function(x) {
        return cc.createTaskWaitToken(x);
      });
      return (logic === "and") ? new TaskWaitAND(list) : new TaskWaitOR(list);
    };
    cc.instanceOfWaitToken = function(obj) {
      return obj instanceof TaskWaitToken;
    };
  };
  
  exports = function() {
    global.Task = {
      "do": function(func) {
        return cc.createTaskDo(func);
      },
      loop: function(func) {
        return cc.createTaskLoop(func);
      },
      each: function(list, func) {
        return cc.createTaskEach(list, func);
      },
      timeout: function(delay, func) {
        return cc.createTaskTimeout(delay, func);
      },
      interval: function(delay, func) {
        return cc.createTaskInterval(delay, func);
      },
      block: function() {
        return cc.createTaskBlock();
      }
    };
  };
  
  module.exports = {
    Timeline: Timeline,
    TaskWaitToken        : TaskWaitToken,
    TaskWaitTokenNumber  : TaskWaitTokenNumber,
    TaskWaitTokenFunction: TaskWaitTokenFunction,
    TaskWaitTokenBoolean : TaskWaitTokenBoolean,
    TaskWaitTokenBlock   : TaskWaitTokenBlock,
    TaskWaitAND : TaskWaitAND,
    TaskWaitOR  : TaskWaitOR,
    TaskContext : TaskContext,
    Task        : Task,
    TaskGlobal  : TaskGlobal,
    TaskDo      : TaskDo,
    TaskLoop    : TaskLoop,
    TaskEach    : TaskEach,
    TaskTimeout : TaskTimeout,
    TaskInterval: TaskInterval,
    TaskBlock   : TaskBlock,
    use:use, exports:exports,
  };

});
