define(function(require, exports, module) {
  "use strict";

  var node = require("./node");
  var commands = require("./commands");
  
  var InstanceManager = (function() {
    function InstanceManager() {
      this.map  = {};
      this.list = [];
    }
    
    InstanceManager.prototype.append = function(userId) {
      if (!this.map[userId]) {
        var instance = new Instance(userId);
        this.map[userId] = instance;
        this.list.push(instance);
      }
    };
    InstanceManager.prototype.remove = function(userId) {
      var instance = this.map[userId];
      if (instance) {
        this.list.splice(this.list.indexOf(instance), 1);
        delete this.map[userId];
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
    InstanceManager.prototype.preprocess = function() {
      var list = this.list;
      for (var i = 0, imax = list.length; i < imax; ++i) {
        list[i].preprocess();
      }
    };
    InstanceManager.prototype.process = function(bufLength, index) {
      var list = this.list;
      for (var i = 0, imax = list.length; i < imax; ++i) {
        list[i].process(bufLength, index);
      }
    };
    InstanceManager.prototype.postprocess = function() {
      var list = this.list;
      for (var i = 0, imax = list.length; i < imax; ++i) {
        list[i].postprocess();
      }
    };
    
    return InstanceManager;
  })();
  
  var Instance = (function() {
    function Instance(userId) {
      this.userId = userId;
      this.timeline = [];
      this.rootNode = new node.Group(0, 0, 0, this);
      this.nodes   = { 0:this.rootNode };
      this.fixNums = {};
      this.defs    = {};
      this.buffers = {};
      this.syncItems = new Float32Array(C.SYNC_ITEM_LEN);
    }
    
    Instance.prototype.reset = function() {
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
        this.rootNode.process(bufLength, this);
      }
    };
    
    return Instance;
  })();
  
  module.exports = {
    InstanceManager: InstanceManager
  };

});
