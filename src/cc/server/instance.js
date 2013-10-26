define(function(require, exports, module) {
  "use strict";

  var node = require("./node");
  var commands = require("./commands");
  
  var InstanceManager = (function() {
    function InstanceManager() {
      this.map  = {};
      this.list = [];
      this.server = null;
      this.process = process0;
    }

    InstanceManager.prototype.init = function(server) {
      if (this.server) {
        return;
      }
      var busLength  = server.bufLength * C.AUDIO_BUS_LEN + C.CONTROL_BUS_LEN;
      var bufLength  = server.bufLength;
      var bufLength4 = server.bufLength << 2;
      this.server    = server;
      this.busClear  = new Float32Array(busLength);
      this.map       = {};
      this.list      = [];
      this.busOut    = new Float32Array(busLength);
      this.busOutLen = server.bufLength << 1;
      this.busOutL  = new Float32Array(this.busOut.buffer, 0         , bufLength);
      this.busOutR  = new Float32Array(this.busOut.buffer, bufLength4, bufLength);
    };
    InstanceManager.prototype.append = function(userId) {
      if (!this.map[userId]) {
        var instance = new Instance(this, userId);
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
    InstanceManager.prototype.setSyncItems = function(userId, syncItems) {
      var instance = this.map[userId];
      if (instance) {
        instance.syncItems.set(syncItems);
      }
    };
    InstanceManager.prototype.setTimeline = function(userId, timeline) {
      var instance = this.map[userId];
      if (instance) {
        instance.timeline = timeline;
      }
    };
    
    var process0 = function() {
      this.busOut.set(this.busClear);
    };
    var process1 = function(bufLength, index) {
      this.list[0].process(bufLength, index);
      this.busOut.set(this.list[0].bus);
    };
    var processN = function(bufLength, index) {
      var list = this.list;
      var busOut    = this.busOut;
      var busOutLen = this.busOutLen;
      var instance;
      busOut.set(this.busClear);
      for (var i = 0, imax = list.length; i < imax; ++i) {
        instance = list[i];
        instance.process(bufLength, index);
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
    function Instance(manager, userId) {
      var busLength = manager.server.bufLength * C.AUDIO_BUS_LEN + C.CONTROL_BUS_LEN;
      this.manager = manager;
      this.userId  = userId|0;
      this.bus     = new Float32Array(busLength);
      this.busClear = manager.busClear;
      
      this.busIndex = 0;
      this.busAmp   = 0.8;
      this.timeline = C.DO_NOTHING;
      this.rootNode = new node.Group(0, 0, 0, this);
      this.nodes   = { 0:this.rootNode };
      this.fixNums = {};
      this.defs    = {};
      this.buffers = {};
      this.syncItems = new Float32Array(C.SYNC_ITEM_LEN);
    }

    Instance.prototype.play = function() {
      this.rootNode.running = true;
      this.bus.set(this.busClear);
    };
    Instance.prototype.pause = function() {
      this.rootNode.running = false;
      this.bus.set(this.busClear);
      this.timeline = C.DO_NOTHING;
    };
    Instance.prototype.reset = function() {
      if (this.manager.busClear) {
        this.bus.set(this.manager.busClear);
      }
      this.timeline = C.DO_NOTHING;
      this.rootNode = new node.Group(0, 0, 0, this);
      this.nodes   = { 0:this.rootNode };
      this.fixNums = {};
      this.defs    = {};
      this.buffers = {};
    };
    Instance.prototype.getFixNum = function(value) {
      var fixNums = this.fixNums;
      return fixNums[value] || (fixNums[value] = {
        outs: [ new Float32Array([value]) ]
      });
    };
    Instance.prototype.process = function(bufLength, index) {
      if (this.timeline !== C.DO_NOTHING) {
        var timelineResult = this.timeline[index];
        for (var i = 0, imax = timelineResult.length; i < imax; ++i) {
          var args = timelineResult[i];
          var func = commands[args[0]];
          if (func) {
            func.call(this, args);
          }
        }
      }
      this.bus.set(this.busClear);
      this.rootNode.process(bufLength, this);
    };
    
    return Instance;
  })();
  
  module.exports = {
    InstanceManager: InstanceManager
  };

});
