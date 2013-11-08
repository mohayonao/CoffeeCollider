define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var extend  = require("../common/extend");
  var emitter = require("../common/emitter");
  var slice = [].slice;

  var TaskManager = (function() {
    function TaskManager() {
      this.klassName = "TaskManager";
      this.tasks = [];
      this.counterIncr = 0;
    }
    extend(TaskManager, cc.Object);
    
    TaskManager.prototype.play = function(counterIncr) {
      this.counterIncr = Math.max(1, counterIncr);
    };
    TaskManager.prototype.pause = function() {
      this.counterIncr = 0;
    };
    TaskManager.prototype.reset = function() {
      this.tasks = [];
    };
    TaskManager.prototype.append = function(task) {
      var index = this.tasks.indexOf(task);
      if (index === -1) {
        this.tasks.push(task);
      }
    };
    TaskManager.prototype.remove = function(task) {
      var index = this.tasks.indexOf(task);
      if (index !== -1) {
        this.tasks.splice(index, 1);
      }
    };
    TaskManager.prototype.process = function() {
      var counterIncr = this.counterIncr;
      var tasks = this.tasks;
      for (var i = 0; i < tasks.length; ++i) {
        tasks[i].process(counterIncr);
      }
    };
    
    return TaskManager;
  })();
  
  var TaskFunction = (function() {
    function TaskFunction(init) {
      emitter.mixin(this);
      this.klassName = "TaskFunction";
      if (typeof init !== "function") {
        throw new TypeError("TaskFunction: first argument should be a Function.");
      }
      var segments = init();
      if (!Array.isArray(segments)) {
        throw new TypeError("TaskFunction: invalid initialize function");
      }
      this.segments = segments;
      this.index    = 0;
    }
    extend(TaskFunction, cc.Object);
    
    TaskFunction.prototype.perform = function(context) {
      var func = this.segments[this.index++];
      if (func) {
        func.apply(context, slice.call(arguments, 1));
        return true;
      }
      return false;
    };
    
    return TaskFunction;
  })();

  var TaskWaitToken = (function() {
    function TaskWaitToken(item) {
      this.klassName = "TaskWaitToken";
      this.item = item;
      this._blocking = true;
    }
    extend(TaskWaitToken, cc.Object);
    
    TaskWaitToken.prototype.performWait = function() {
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
      }
      return this._blocking;
    };
    
    return TaskWaitTokenFunction;
  })();
  
  var TaskWaitTokenBoolean = (function() {
    function TaskWaitTokenBoolean(item) {
      TaskWaitToken.call(this, item);
      this.klassName = "TaskWaitTokenBoolean";
      this._blocking = item;
    }
    extend(TaskWaitTokenBoolean, TaskWaitToken);
    
    return TaskWaitTokenBoolean;
  })();

  var TaskWaitTokenBlockable = (function() {
    function TaskWaitTokenBlockable(item) {
      TaskWaitToken.call(this, item);
      this.klassName = "TaskWaitTokenBlockable";
    }
    extend(TaskWaitTokenBlockable, TaskWaitToken);
    
    TaskWaitTokenBlockable.prototype.performWait = function(counterIncr) {
      if (this._blocking) {
        this._blocking = this.item.performWait(counterIncr);
      }
      return this._blocking;
    };
    
    return TaskWaitTokenBlockable;
  })();

  var TaskWaitTokenLogicAND = (function() {
    function TaskWaitTokenLogicAND(list) {
      TaskWaitToken.call(this, []);
      this.klassName = "TaskWaitTokenLogicAND";
      var item = [];
      list.forEach(function(token) {
        if (token instanceof TaskWaitTokenLogicAND) {
          item = item.concat(token.item);
        } else {
          item.push(token);
        }
      });
      this.item = item;
    }
    extend(TaskWaitTokenLogicAND, TaskWaitToken);
    
    TaskWaitTokenLogicAND.prototype.performWait = function(counterIncr) {
      if (this._blocking) {
        this.item = this.item.filter(function(token) {
          return token.performWait(counterIncr);
        });
        this._blocking = this.item.length > 0;
      }
      return this._blocking;
    };
    
    return TaskWaitTokenLogicAND;
  })();

  var TaskWaitTokenLogicOR = (function() {
    function TaskWaitTokenLogicOR(list) {
      TaskWaitToken.call(this, []);
      var item = [];
      list.forEach(function(token) {
        if (token instanceof TaskWaitTokenLogicOR) {
          item = item.concat(token.item);
        } else {
          item.push(token);
        }
      });
      this.item = item;
    }
    extend(TaskWaitTokenLogicOR, TaskWaitToken);
    
    TaskWaitTokenLogicOR.prototype.performWait = function(counterIncr) {
      var blocking = true;
      this.item = this.item.filter(function(token) {
        var _blocking = token.performWait(counterIncr);
        blocking = _blocking && blocking;
        return _blocking;
      });
      if (this._blocking) {
        this._blocking = blocking;
      }
      return this._blocking;
    };
    
    return TaskWaitTokenLogicOR;
  })();
  
  var TaskProcessor = (function() {
    function TaskProcessor(func) {
      var that = this;
      
      emitter.mixin(this);
      this.klassName = "TaskProcessor";
      this.taskManager  = cc.taskManager;
      this._blocking = true;
      this._func  = func;
      this._count = 0;
      this._prev = null;
      this._next = null;
      this._wait = null;
      this._context = {
        wait: function(token) {
          that._wait = cc.createTaskWaitToken(token||0);
        },
        continue: function(token) {
          that._wait = cc.createTaskWaitToken(token||0);
          that._func.index = 0;
          that._done();
        },
        redo: function(token) {
          that._wait = cc.createTaskWaitToken(token||0);
          that._func.index = 0;
        },
        break: function() {
          that._func.index = that._func.segments.length;
          that.stop();
        }
      };
    }
    extend(TaskProcessor, cc.Object);
    
    TaskProcessor.prototype.play = function() {
      var that = this;
      // rewind to the head task of a chain
      while (that._prev !== null) {
        that = that._prev;
      }
      if (that.taskManager) {
        cc.taskManager.append(that);
      }
      this._blocking = true;
      return this;
    };
    TaskProcessor.prototype.pause = function() {
      if (this.taskManager) {
        this.taskManager.remove(this);
      }
      this._blocking = false;
      return this;
    };
    TaskProcessor.prototype.stop = function() {
      if (this.taskManager) {
        this.taskManager.remove(this);
        this.emit("end");
        if (this._next) {
          this._next._prev = null;
          this._next.play();
          this._next = null;
        }
      }
      this._count    = 0;
      this._blocking = false;
      this.taskManager = null;
      return this;
    };
    TaskProcessor.prototype.process = function(counterIncr) {
      var blocking;
      while (this._blocking) {
        if (this._wait) {
          blocking = this._wait.performWait(counterIncr);
          if (blocking) {
            return;
          }
          this._wait = null;
        }
        blocking = this._execute(this._count);
        if (!blocking) {
          this._done();
        }
        counterIncr  = 0;
      }
    };
    TaskProcessor.prototype._execute = function() {
      return this._func.perform(this._context, this._count);
    };
    TaskProcessor.prototype.performWait = function() {
      return this._blocking;
    };
    
    // task chain methods
    TaskProcessor.prototype["do"] = function(func) {
      var next = new TaskProcessorDo(cc.createTaskFunction(func));
      next._prev = this;
      this._next = next;
      return next;
    };
    TaskProcessor.prototype.loop = function(func) {
      var next = new TaskProcessorLoop(cc.createTaskFunction(func));
      next._prev = this;
      this._next = next;
      return next;
    };
    TaskProcessor.prototype.each = function(list, func) {
      var next = new TaskProcessorEach(list, cc.createTaskFunction(func));
      next._prev = this;
      this._next = next;
      return next;
    };
    
    return TaskProcessor;
  })();
  
  var TaskProcessorDo = (function() {
    function TaskProcessorDo(func) {
      TaskProcessor.call(this, func);
      this.klassName = "TaskProcessorDo";
    }
    extend(TaskProcessorDo, TaskProcessor);
    
    TaskProcessorDo.prototype._done = function() {
      this.stop();
    };
    
    return TaskProcessorDo;
  })();

  var TaskProcessorLoop = (function() {
    function TaskProcessorLoop(func) {
      TaskProcessor.call(this, func);
      this.klassName = "TaskProcessorLoop";
    }
    extend(TaskProcessorLoop, TaskProcessor);
    
    TaskProcessorLoop.prototype._done = function() {
      this._func.index = 0;
      this._count += 1;
    };
    
    return TaskProcessorLoop;
  })();

  var TaskProcessorEach = (function() {
    function TaskProcessorEach(list, func) {
      if (!(Array.isArray(list))) {
        throw new TypeError("Task.each: First argument must be an Array.");
      }
      TaskProcessor.call(this, func);
      this.klassName = "TaskProcessorEach";
      this._list = list;
    }
    extend(TaskProcessorEach, TaskProcessor);
    
    TaskProcessorEach.prototype._execute = function() {
      return this._func.perform(this._context, this._list[this._count], this._count);
    };
    TaskProcessorEach.prototype._done = function() {
      this._count += 1;
      if (this._count < this._list.length) {
        this._func.index = 0;
      } else {
        this.stop();
      }
    };
    
    return TaskProcessorEach;
  })();
  
  cc.global.Task = function(func) {
    return cc.createTaskFunction(func);
  };
  cc.global.Task["do"] = function(func) {
    return new TaskProcessorDo(cc.createTaskFunction(func));
  };
  cc.global.Task.loop = function(func) {
    return new TaskProcessorLoop(cc.createTaskFunction(func));
  };
  cc.global.Task.each = function(list, func) {
    return new TaskProcessorEach(list, cc.createTaskFunction(func));
  };
  
  module.exports = {
    TaskManager  : TaskManager,
    TaskFunction : TaskFunction,
    TaskWaitToken         : TaskWaitToken,
    TaskWaitTokenNumber   : TaskWaitTokenNumber,
    TaskWaitTokenFunction : TaskWaitTokenFunction,
    TaskWaitTokenBoolean  : TaskWaitTokenBoolean,
    TaskWaitTokenBlockable: TaskWaitTokenBlockable,
    TaskWaitTokenLogicAND : TaskWaitTokenLogicAND,
    TaskWaitTokenLogicOR  : TaskWaitTokenLogicOR,
    TaskProcessor        : TaskProcessor,
    TaskProcessorDo      : TaskProcessorDo,
    TaskProcessorLoop    : TaskProcessorLoop,
    TaskProcessorEach    : TaskProcessorEach,
    
    use: function() {
      cc.createTaskManager = function() {
        cc.taskManager = new TaskManager();
        return cc.taskManager;
      };
      cc.instanceOfTaskManager = function(obj) {
        return obj instanceof TaskManager;
      };
      cc.createTaskFunction = function(init) {
        return new TaskFunction(init);
      };
      cc.instanceOfTaskFunction = function(obj) {
        return obj instanceof TaskFunction;
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
          if (Array.isArray(item)) {
            return cc.createTaskWaitLogic("and", item);
          } else if (item && typeof item.performWait === "function") {
            return new TaskWaitTokenBlockable(item);
          }
        }
        throw new TypeError("TaskWaitToken: Invalid type");
      };
      cc.instanceOfTaskWaitToken = function(obj) {
        return obj instanceof TaskWaitToken;
      };
      cc.createTaskWaitLogic = function(logic, list) {
        list = list.map(function(token) {
          return cc.createTaskWaitToken(token);
        });
        if (logic === "and") {
          return new TaskWaitTokenLogicAND(list);
        }
        return new TaskWaitTokenLogicOR(list);
      };
    }
  };
  
  module.exports.use();

});
