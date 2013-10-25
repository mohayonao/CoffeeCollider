define(function(require, exports, module) {
  "use strict";

  var node = require("./node");
  var commands = require("./commands");
  
  var Userspace = (function() {
    function Userspace() {
      this.heapMap  = {};
      this.heapList = [];
    }
    
    Userspace.prototype.append = function(userId) {
      if (!this.heapMap[userId]) {
        var heap = new Heap(userId);
        this.heapMap[userId] = heap;
        this.heapList.push(heap);
      }
    };
    Userspace.prototype.remove = function(userId) {
      var heap = this.heapMap[userId];
      if (heap) {
        this.heapList.splice(this.heapList.indexOf(heap), 1);
        delete this.heapMap[userId];
      }
    };
    Userspace.prototype.play = function(userId) {
      var heap = this.heapMap[userId];
      if (heap) {
        heap.rootNode.running = true;
      }
    };
    Userspace.prototype.pause = function(userId) {
      var heap = this.heapMap[userId];
      if (heap) {
        heap.rootNode.running = false;
      }
    };
    Userspace.prototype.reset = function(userId) {
      var heap = this.heapMap[userId];
      if (heap) {
        heap.reset();
      }
    };
    Userspace.prototype.setSyncItems = function(userId, syncItems) {
      var heap = this.heapMap[userId];
      if (heap) {
        heap.syncItems.set(syncItems);
      }
    };
    Userspace.prototype.setTimeline = function(userId, timeline) {
      var heap = this.heapMap[userId];
      if (heap) {
        heap.timeline = timeline;
      }
    };
    Userspace.prototype.preprocess = function() {
      var list = this.heapList;
      for (var i = 0, imax = list.length; i < imax; ++i) {
        list[i].preprocess();
      }
    };
    Userspace.prototype.process = function(bufLength, index) {
      var list = this.heapList;
      for (var i = 0, imax = list.length; i < imax; ++i) {
        list[i].process(bufLength, index);
      }
    };
    Userspace.prototype.postprocess = function() {
      var list = this.heapList;
      for (var i = 0, imax = list.length; i < imax; ++i) {
        list[i].postprocess();
      }
    };
    
    return Userspace;
  })();
  
  var Heap = (function() {
    function Heap(userId) {
      this.userId = userId;
      this.timeline = [];
      this.rootNode = new node.Group(0, 0, 0, this);
      this.nodes = { 0:this.rootNode };
      this.fixNums = {};
      this.defs    = {};
      this.buffers = {};
      this.syncItems = new Float32Array(C.SYNC_ITEM_LEN);
    }
    
    Heap.prototype.reset = function() {
      this.timeline = [];
      this.rootNode = new node.Group(0, 0, 0, this);
      this.nodes = { 0:this.rootNode };
      this.fixNums = {};
      this.defs    = {};
      this.buffers = {};
    };
    Heap.prototype.getFixNum = function(value) {
      var fixNums = this.fixNums;
      return fixNums[value] || (fixNums[value] = {
        outs: [ new Float32Array([value]) ]
      });
    };
    Heap.prototype.process = function(bufLength, index) {
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
    
    return Heap;
  })();
    
  module.exports = {
    Userspace: Userspace
  };

});
