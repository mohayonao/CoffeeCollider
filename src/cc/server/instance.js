define(function(require, exports, module) {
  "use strict";

  var cc   = require("./cc");
  var node = require("./node");
  var commands = require("./commands");
  
  var InstanceManager = (function() {
    function InstanceManager() {
      this.map  = {};
      this.list = [];
      this.root = null;
      this.process = process0;
    }

    InstanceManager.prototype.init = function(server) {
      var busLength = server.bufLength * C.AUDIO_BUS_LEN + C.CONTROL_BUS_LEN;
      var bufLength  = cc.server.bufLength;
      var bufLength4 = cc.server.bufLength << 2;
      this.busClear = new Float32Array(busLength);
      this.root     = this.append(0);
      this.busOut    = this.root.bus;
      this.busOutLen = server.bufLength << 1;
      this.busOutL  = new Float32Array(this.root.bus.buffer, 0         , bufLength);
      this.busOutR  = new Float32Array(this.root.bus.buffer, bufLength4, bufLength);
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
        instance.rootNode.running = true;
      }
    };
    InstanceManager.prototype.pause = function(userId) {
      var instance = this.map[userId];
      if (instance) {
        instance.rootNode.running = false;
      }
    };
    InstanceManager.prototype.reset = function(userId) {
      var instance = this.map[userId];
      if (instance) {
        instance.reset();
      }
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
    };
    var process1 = function(bufLength, index) {
      this.list[0].process(bufLength, index);
    };
    var processN = function(bufLength, index) {
      var list = this.list;
      var busOut    = this.busOut;
      var busOutLen = this.busOutLen;
      var instance;
      for (var i = 0, imax = list.length; i < imax; ++i) {
        instance = list[i];
        instance.process(bufLength, index);
        if (i > 0) {
          var inBus = instance.bus;
          var inAmp = instance.busAmp;
          for (var j = busOutLen; j--; ) {
            busOut[j] += inBus[j] * inAmp;
          }
        }
      }
    };
    
    return InstanceManager;
  })();
  
  
  var Instance = (function() {
    function Instance(manager, userId) {
      var busLength = cc.server.bufLength * C.AUDIO_BUS_LEN + C.CONTROL_BUS_LEN;
      this.manager = manager;
      this.userId  = userId|0;
      this.bus     = new Float32Array(busLength);
      this.busClear = manager.busClear;
      
      this.busIndex = 0;
      this.busAmp   = 0.8;
      this.timeline = [];
      this.rootNode = new node.Group(0, 0, 0, this);
      this.nodes   = { 0:this.rootNode };
      this.fixNums = {};
      this.defs    = {};
      this.buffers = {};
      this.syncItems = new Float32Array(C.SYNC_ITEM_LEN);
    }
    
    Instance.prototype.reset = function() {
      if (this.manager.busClear) {
        this.bus.set(this.manager.busClear);
      }
      this.timeline = [];
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
      var commandList = this.timeline[index];
      if (commandList) {
        for (var i = 0, imax = commandList.length; i < imax; ++i) {
          var args = commandList[i];
          var func = commands[args[0]];
          if (func) {
            func.call(this, args);
          }
        }
        this.bus.set(this.busClear);
        this.rootNode.process(bufLength, this);
      }
    };
    
    return Instance;
  })();
  
  module.exports = {
    InstanceManager: InstanceManager
  };

});
