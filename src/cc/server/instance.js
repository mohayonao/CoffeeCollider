define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var commands = require("./commands");
  var push = [].push;
  
  
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
      this.timeline = [];
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
  
  cc.createInstance = function(userId) {
    return new Instance(userId);
  };
  
  module.exports = {
    Instance: Instance
  };

});
