define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var extend = require("../common/extend");
  
  var valueOf = function(obj) {
    if (obj === null || obj === undefined) {
      return null;
    }
    return obj.valueOf();
  };
  
  var TaskManager = (function() {
    function TaskManager() {
      this.klassName = "TaskManager";
      this.tasks = [];
      this.counterIncr = 0;
    }
    
    TaskManager.prototype.start = function(counterIncr) {
      this.counterIncr = Math.max(1, counterIncr);
    };
    
    TaskManager.prototype.stop = function() {
      this.counterIncr = 0;
    };
    
    TaskManager.prototype.reset = function() {
      this.tasks.splice(0);
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
      if (counterIncr) {
        var tasks = this.tasks;
        for (var i = 0; i < tasks.length; ++i) {
          tasks[i].performWait(counterIncr);
        }
        this.tasks = tasks.filter(function(task) {
          return task._state === C.PLAYING;
        });
      }
    };
    
    return TaskManager;
  })();
  
  var Task = (function() {
    function Task(func, iter) {
      this.klassName = "Task";
      if (cc.instanceOfSyncBlock(func)) {
        this._func = func;
        this._state = C.PENDING;
      } else {
        this._func = null;
        this._state = C.FINISHED;
      }
      this._iter = iter;
      this._wait = null;
      this._args = valueOf(iter);
      this._remain = 0; // number
    }
    extend(Task, cc.Object);
    
    Task.prototype.start = function() {
      this.reset();
      if (cc.taskManager) {
        cc.taskManager.append(this);
      }
      this._state = C.PLAYING;
      return this;
    };
    
    Task.prototype.resume = function() {
      if (cc.taskManager) {
        cc.taskManager.append(this);
      }
      this._state = C.PLAYING;
      return this;
    };
    
    Task.prototype.pause = function() {
      if (cc.taskManager) {
        cc.taskManager.remove(this);
      }
      this._state = C.PENDING;
      return this;
    };
    
    Task.prototype.stop = function() {
      if (cc.taskManager) {
        cc.taskManager.remove(this);
      }
      this._state = C.PENDING;
      return this;
    };
    
    Task.prototype.reset = function() {
      if (this._func) {
        this._func.reset();
        this._state = C.PENDING;
      } else {
        this._state = C.FINISHED;
      }
      if (this._iter) {
        this._iter.reset();
      }
      this._wait = null;
      this._args = valueOf(this._iter);
      return this;
    };
    
    Task.prototype.wait = function() {
      if (cc.currentTask && cc.currentTask !== this) {
        cc.currentTask.__wait__(this);
      }
      return this;
    };
    
    Task.prototype.__sync__ = function(func, args) {
      return this.__wait__(new Task(func, args));
    };
    
    Task.prototype.__wait__ = function(task) {
      if (this._wait) {
        throw new Error("Task#append: wait already exists???");
      }
      if (typeof task === "number") {
        task += this._remain;
      }
      this._remain = 0;
      this._wait = cc.createTaskWaitToken(task);
      if (task instanceof Task) {
        task._state = C.PLAYING;
      }
      cc.pauseSyncBlock();
      return this;
    };
    
    Task.prototype.performWait = function(counterIncr) {
      var _currentSyncBlockHandler = cc.currentSyncBlockHandler;
      var _currentTask             = cc.currentTask;
      var func = this._func;
      var iter = this._iter;
      
      cc.currentSyncBlockHandler = this;
      cc.currentTask             = this;
      
      while (true) {
        if (this._wait) {
          if (this._wait.performWait(counterIncr)) {
            break;
          }
          this._remain = this._wait.remain || 0;
          this._wait = null;
        }
        counterIncr = 0;
        
        func.perform.apply(func, this._args);
        
        if (this._wait) {
          continue;
        }
        
        if (func.performWaitState()) {
          continue;
        }
        
        if (iter) {
          this._args = iter.next();
          if (iter.performWaitState()) {
            func.reset();
            continue;
          }
        }
        this._state = C.FINISHED;
        break;
      }
      
      cc.currentSyncBlockHandler = _currentSyncBlockHandler;
      cc.currentTask             = _currentTask;
      
      return this._state === C.PLAYING;
    };
    
    Task.prototype.performWaitState = function() {
      return this._state === C.PLAYING;
    };
    
    return Task;
  })();
  
  var TaskArguments = (function() {
    function TaskArguments() {
      this.klassName = "TaskArguments";
      this._args = [ 0, 0 ];
      this._state = C.PLAYING;
    }
    
    TaskArguments.prototype.next = function() {
      if (this._state === C.FINISHED) {
        return null;
      }
      this._state = C.FINISHED;
      return this._args;
    };
    
    TaskArguments.prototype.reset = function() {
      this._state = C.PLAYING;
      return this;
    };
    
    TaskArguments.prototype.valueOf = function() {
      return this._args;
    };
    
    TaskArguments.prototype.performWait = function() {
      return this._state === C.PLAYING;
    };
    
    TaskArguments.prototype.performWaitState = function() {
      return this._state === C.PLAYING;
    };
    
    return TaskArguments;
  })();

  var TaskArgumentsNumber = (function() {
    function TaskArgumentsNumber(start, end, step) {
      TaskArguments.call(this);
      this.klassName = "TaskArgumentsNumber";
      this.start = start;
      this.end   = end;
      this.step  = step;
      this.index = 0;
      this.reset();
    }
    extend(TaskArgumentsNumber, TaskArguments);
    
    TaskArgumentsNumber.prototype.next = function() {
      if (this._state === C.FINISHED) {
        return null;
      }
      var value = this._args[0] + this.step;
      if (this.step >= 0) {
        if (value <= this.end) {
          this._args[0] = value;
          this._args[1] = ++this.index;
        } else {
          this._state = C.FINISHED;
        }
      } else {
        if (value >= this.end) {
          this._args[0] = value;
          this._args[1] = ++this.index;
        } else {
          this._state = C.FINISHED;
        }
      }
      return this._state === C.FINISHED ? null : this._args;
    };
    
    TaskArguments.prototype.reset = function() {
      this.index = 0;
      this._args  = [ this.start, this.index ];
      this._state = C.PLAYING;
      return this;
    };
    
    return TaskArgumentsNumber;
  })();
  
  var TaskArgumentsArray = (function() {
    function TaskArgumentsArray(list, reversed) {
      TaskArguments.call(this);
      this.klassName = "TaskArgumentsArray";
      this.list     = list;
      this.reversed = reversed;
      this.reset();
    }
    extend(TaskArgumentsArray, TaskArguments);
    
    TaskArgumentsArray.prototype.next = function() {
      if (this._state === C.FINISHED) {
        return null;
      }
      if (this.reversed) {
        this.index -= 1;
        if (0 <= this.index) {
          this._args = [ this.list[this.index], this.index ];
        } else {
          this._state = C.FINISHED;
        }
      } else {
        this.index += 1;
        if (this.index < this.list.length) {
          this._args = [ this.list[this.index], this.index ];
        } else {
          this._state = C.FINISHED;
        }
      }
      return this._state === C.FINISHED ? null : this._args;
    };
    
    TaskArgumentsArray.prototype.reset = function() {
      this.index = this.reversed ? Math.max(0, this.list.length - 1) : 0;
      this._args = [ this.list[this.index], this.index ];
      this._state = C.PLAYING;
      return this;
    };
    
    return TaskArgumentsArray;
  })();

  var TaskArgumentsFunction = (function() {
    function TaskArgumentsFunction(func) {
      TaskArguments.call(this);
      this.klassName = "TaskArgumentsFunction";
      this.func  = func;
      this.index = 0;
      this.reset();
    }
    extend(TaskArgumentsFunction, TaskArguments);
    
    TaskArgumentsFunction.prototype.next = function() {
      if (this._state === C.FINISHED) {
        return null;
      }
      var value = this.func();
      if (!!value || value === 0) {
        this._args[0] = value;
        this._args[1] = ++this.index;
      } else {
        this._state = C.FINISHED;
      }
      return this._state === C.FINISHED ? null : this._args;
    };
    
    TaskArgumentsFunction.prototype.reset = function() {
      this._state = C.PLAYING;
      this.uninitialized = true;
      return this;
    };
    
    TaskArgumentsFunction.prototype.valueOf = function() {
      this.index = 0;
      if (this.uninitialized) {
        this.uninitialized = false;
        this._args = [ this.func(), this.index ];
      }
      return this._args;
    };
    
    return TaskArgumentsFunction;
  })();
  
  var TaskArgumentsPattern = (function() {
    function TaskArgumentsPattern(pattern) {
      TaskArguments.call(this);
      this.klassName = "TaskArgumentsPattern";
      this.pattern   = pattern;
      this.reset();
    }
    extend(TaskArgumentsPattern, TaskArguments);
    
    TaskArgumentsPattern.prototype.next = function() {
      if (this._state === C.FINISHED) {
        return null;
      }
      var val = this.pattern.next();
      if (val !== null && val !== undefined) {
        this._args = [ val, this.index++ ];
      } else {
        this._state = C.FINISHED;
      }
      return this._state === C.FINISHED ? null : this._args;
    };
    
    TaskArgumentsPattern.prototype.reset = function() {
      this.index = 0;
      this._args = [ this.pattern.reset().next(), this.index++ ];
      this._state = C.PLAYING;
      return this;
    };
    
    return TaskArgumentsPattern;
  })();
  
  var TaskWaitToken = (function() {
    function TaskWaitToken() {
      this.klassName = "TaskWaitToken";
      this._state = C.PLAYING;
    }
    
    TaskWaitToken.prototype.performWait = function() {
      return this._state === C.PLAYING;
    };
    
    TaskWaitToken.prototype.performWaitState = function() {
      return this._state === C.PLAYING;
    };
    
    return TaskWaitToken;
  })();

  var TaskWaitTokenNumber = (function() {
    function TaskWaitTokenNumber(token) {
      TaskWaitToken.call(this);
      this.klassName = "TaskWaitTokenNumber";
      this.token = token * 1000;
    }
    extend(TaskWaitTokenNumber, TaskWaitToken);

    TaskWaitTokenNumber.prototype.performWait = function(counterIncr) {
      if (this._state === C.PLAYING) {
        this.token -= counterIncr;
        if (this.token <= 0) {
          this._state = C.FINISHED;
          this.remain = this.token * 0.001;
        }
      }
      return this._state === C.PLAYING;
    };
    
    return TaskWaitTokenNumber;
  })();
  
  var TaskWaitTokenLogicAND = (function() {
    function TaskWaitTokenLogicAND(token) {
      TaskWaitToken.call(this);
      this.klassName = "TaskWaitTokenLogicAND";
      this.token = token.map(cc.createTaskWaitToken);
    }
    extend(TaskWaitTokenLogicAND, TaskWaitToken);
    
    TaskWaitTokenLogicAND.prototype.performWait = function(counterIncr) {
      if (this._state === C.PLAYING) {
        this.token = this.token.filter(function(token) {
          return token.performWait(counterIncr);
        });
        if (this.token.length === 0) {
          this._state = C.FINISHED;
        }
      }
      return this._state === C.PLAYING;
    };
    
    return TaskWaitTokenLogicAND;
  })();
  
  var TaskWaitTokenLogicOR = (function() {
    function TaskWaitTokenLogicOR(token) {
      TaskWaitToken.call(this);
      this.klassName = "TaskWaitTokenLogicOR";
      this.token = token.map(cc.createTaskWaitToken);
    }
    extend(TaskWaitTokenLogicOR, TaskWaitToken);
    
    TaskWaitTokenLogicOR.prototype.performWait = function(counterIncr) {
      if (this._state === C.PLAYING) {
        var list = this.token;
        for (var i = 0, imax = list.length; i < imax; ++i) {
          if (!list[i].performWait(counterIncr)) {
            this._state = C.FINISHED;
            this.token.splice(0);
            break;
          }
        }
      }
      return this._state === C.PLAYING;
    };
    
    return TaskWaitTokenLogicOR;
  })();
  
  var TaskWaitTokenFunction = (function() {
    function TaskWaitTokenFunction(token) {
      TaskWaitToken.call(this);
      this.klassName = "TaskWaitTokenFunction";
      this.token = token;
    }
    extend(TaskWaitTokenFunction, TaskWaitToken);
    
    TaskWaitTokenFunction.prototype.performWait = function() {
      if (this._state === C.PLAYING) {
        var finished = this.token();
        if (finished) {
          this._state = C.FINISHED;
        }
      }
      return this._state === C.PLAYING;
    };
    
    return TaskWaitTokenFunction;
  })();

  var TaskWaitTokenBoolean = (function() {
    function TaskWaitTokenBoolean(token) {
      TaskWaitToken.call(this);
      this.klassName = "TaskWaitTokenBoolean";
      this.token = token;
      this._state = token ? C.PLAYING : C.FINISHED;
    }
    extend(TaskWaitTokenBoolean, TaskWaitToken);
    
    return TaskWaitTokenBoolean;
  })();

  var TaskWaitTokenDate = (function() {
    function TaskWaitTokenDate(token) {
      TaskWaitToken.call(this);
      this.klassName = "TaskWaitTokenDate";
      this.token = +token;
    }
    extend(TaskWaitTokenDate, TaskWaitToken);
    
    TaskWaitTokenDate.prototype.performWait = function() {
      if (this._state === C.PLAYING) {
        if (Date.now() > this.token) {
          this._state = C.FINISHED;
        }
      }
      return this._state === C.PLAYING;
    };
    
    return TaskWaitTokenDate;
  })();
  
  cc.global.Task = function(func) {
    return new Task(func);
  };
  
  cc.createTaskManager = function() {
    cc.taskManager = new TaskManager();
    return cc.taskManager;
  };
  cc.instanceOfTaskManager = function(obj) {
    return obj instanceof TaskManager;
  };
  cc.createTask = function(func, iter) {
    return new Task(func, iter);
  };
  cc.instanceOfTask = function(obj) {
    return obj instanceof Task;
  };
  cc.instanceOfTaskArguments = function(obj) {
    return obj instanceof TaskArguments;
  };
  cc.createTaskArgumentsNumber = function(start, end, step) {
    return new TaskArgumentsNumber(start, end, step);
  };
  cc.createTaskArgumentsArray = function(list, reversed) {
    return new TaskArgumentsArray(list, !!reversed);
  };
  cc.createTaskArgumentsOnce = function(item) {
    return new TaskArgumentsArray([item]);
  };
  cc.createTaskArgumentsPattern = function(p) {
    return new TaskArgumentsPattern(p);
  };
  cc.createTaskWaitToken = function(token, logic) {
    if (token && typeof token.performWait === "function") {
      return token;
    }
    switch (typeof token) {
    case "number"  : return new TaskWaitTokenNumber(token);
    case "function": return new TaskWaitTokenFunction(token);
    case "boolean" : return new TaskWaitTokenBoolean(token);
    }
    if (Array.isArray(token)) {
      return cc.createTaskWaitTokenArray(token, logic);
    }
    if (token instanceof Date) {
      return new TaskWaitTokenDate(token);
    }
    return new TaskWaitTokenBoolean(false);
  };
  cc.instanceOfTaskWaitToken = function(obj) {
    return obj instanceof TaskWaitToken;
  };
  cc.createTaskWaitTokenNumber = function(token) {
    return new TaskWaitTokenNumber(token);
  };
  cc.createTaskWaitTokenArray = function(token, logic) {
    if (logic === "or") {
      return new TaskWaitTokenLogicOR(token);
    } else {
      return new TaskWaitTokenLogicAND(token);
    }
  };
  cc.createTaskWaitTokenFunction = function(token) {
    return new TaskWaitTokenFunction(token);
  };
  cc.createTaskWaitTokenBoolean = function(token) {
    return new TaskWaitTokenBoolean(token);
  };
  cc.createTaskWaitTokenDate = function(token) {
    return new TaskWaitTokenDate(token);
  };
  
  module.exports = {
    TaskManager : TaskManager,
    Task        : Task,
    TaskArguments        : TaskArguments,
    TaskArgumentsNumber  : TaskArgumentsNumber,
    TaskArgumentsArray   : TaskArgumentsArray,
    TaskArgumentsFunction: TaskArgumentsFunction,
    TaskWaitToken        : TaskWaitToken,
    TaskWaitTokenNumber  : TaskWaitTokenNumber,
    TaskWaitTokenLogicAND: TaskWaitTokenLogicAND,
    TaskWaitTokenLogicOR : TaskWaitTokenLogicOR,
    TaskWaitTokenFunction: TaskWaitTokenFunction,
    TaskWaitTokenBoolean : TaskWaitTokenBoolean,
    TaskWaitTokenDate    : TaskWaitTokenDate
  };

});
