define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var commands = require("./commands");
  var push = [].push;
  
  var InstanceManager = (function() {
    function InstanceManager() {
      this.map  = {};
      this.list = [];
      this.server = null;
      this.process = process0;
    }
    
    InstanceManager.prototype.append = function(userId) {
      if (!this.map[userId]) {
        var instance = new Instance(userId);
        this.map[userId] = instance;
        this.list.push(instance);
        if (this.list.length === 1) {
          this.process = process1;
        } else {
          this.process = processN;
        }
      }
      return this.map[userId];
    };
    InstanceManager.prototype.remove = function(userId) {
      var instance = this.map[userId];
      if (instance) {
        this.list.splice(this.list.indexOf(instance), 1);
        delete this.map[userId];
        if (this.list.length === 1) {
          this.process = process1;
        } else if (this.list.length === 0) {
          this.process = process0;
        }
      }
    };
    InstanceManager.prototype.play = function(userId) {
      var instance = this.map[userId];
      if (instance) {
        instance.play();
      }
    };
    InstanceManager.prototype.pause = function(userId) {
      var instance = this.map[userId];
      if (instance) {
        instance.pause();
      }
    };
    InstanceManager.prototype.reset = function(userId) {
      var instance = this.map[userId];
      if (instance) {
        instance.reset();
      }
    };
    InstanceManager.prototype.isRunning = function() {
      return this.list.some(function(instance) {
        return instance.rootNode.running;
      });
    };
    InstanceManager.prototype.pushToTimeline = function(timeline, userId) {
      var instance = this.map[userId];
      if (instance) {
        instance.pushToTimeline(timeline);
      }
    };
    InstanceManager.prototype.doBinayCommand = function(binary, userId) {
      var instance = this.map[userId];
      if (instance) {
        instance.doBinayCommand(binary);
      }
    };
    
    var process0 = function() {
      cc.server.busOut.set(cc.server.busClear);
    };
    var process1 = function(bufLength) {
      this.list[0].process(bufLength);
      cc.server.busOut.set(this.list[0].bus);
    };
    var processN = function(bufLength) {
      var list = this.list;
      var busOut    = this.busOut;
      var busOutLen = this.busOutLen;
      var instance;
      busOut.set(this.busClear);
      for (var i = 0, imax = list.length; i < imax; ++i) {
        instance = list[i];
        instance.process(bufLength);
        var inBus = instance.bus;
        var inAmp = instance.busAmp;
        for (var j = busOutLen; j--; ) {
          busOut[j] += inBus[j] * inAmp;
        }
      }
    };
    
    return InstanceManager;
  })();
  
  
  var Instance = (function() {
    function Instance(userId) {
      this.userId  = userId|0;
      this.bus      = new Float32Array(cc.server.busClear);
      this.busClear = cc.server.busClear;
      
      this.busIndex = 0;
      this.busAmp   = 0.8;
      this.timeline = [];
      this.timelineIndex = 0;
      this.rootNode = cc.createServerRootNode(this);
      this.nodes   = { 0:this.rootNode };
      this.fixNums = {};
      this.defs    = {};
      this.buffers = {};
      this.bufSrc  = {};
      this.syncItems     = new Uint8Array(C.SYNC_ITEM_LEN);
      this.i16_syncItems = new Int16Array(this.syncItems.buffer);
      this.f32_syncItems = new Float32Array(this.syncItems.buffer);
    }
    
    Instance.prototype.play = function() {
      this.rootNode.running = true;
      this.bus.set(this.busClear);
    };
    Instance.prototype.pause = function() {
      this.rootNode.running = false;
      this.bus.set(this.busClear);
      this.timeline = [];
    };
    Instance.prototype.reset = function() {
      this.bus.set(this.busClear);
      this.timeline = [];
      this.rootNode = cc.createServerRootNode(this);
      this.nodes   = { 0:this.rootNode };
      this.fixNums = {};
      this.defs    = {};
      this.buffers = {};
      this.bufSrc  = {};
    };
    Instance.prototype.isRunning = function() {
      return this.rootNode.running;
    };
    Instance.prototype.pushToTimeline = function(timeline) {
      push.apply(this.timeline, timeline);
    };
    Instance.prototype.doBinayCommand = function(binary) {
      var func  = commands[(binary[1] << 8) + binary[0]];
      if (func) {
        func.call(this, binary);
      }
    };
    Instance.prototype.getFixNum = function(value) {
      var fixNums = this.fixNums;
      return fixNums[value] || (fixNums[value] = {
        outputs: [ new Float32Array([value]) ]
      });
    };
    Instance.prototype.process = function(bufLength) {
      var timeline = this.timeline;
      var args;
      
      while ((args = timeline.shift())) {
        var func = commands[args[0]];
        if (func) {
          func.call(this, args);
        }
      }
      
      this.bus.set(this.busClear);
      this.rootNode.process(bufLength, this);
    };
    
    return Instance;
  })();

  cc.createInstanceManager = function() {
    return new InstanceManager();
  };
  cc.createInstance = function(userId) {
    return new Instance(userId);
  };
  
  module.exports = {
    InstanceManager: InstanceManager,
    Instance: Instance
  };

});
