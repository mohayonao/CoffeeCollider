define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var push = [].push;
  
  var commands = {};
  
  var World = (function() {
    function World(userId) {
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
      this.buffers = [];
      this.bufSrc  = {};
      this.syncItems     = new Uint8Array(C.SYNC_ITEM_LEN);
      this.i16_syncItems = new Int16Array(this.syncItems.buffer);
      this.f32_syncItems = new Float32Array(this.syncItems.buffer);
    }
    World.prototype.play = function() {
      this.rootNode.running = true;
      this.bus.set(this.busClear);
      this.timeline = [];
    };
    World.prototype.pause = function() {
      this.rootNode.running = false;
      this.bus.set(this.busClear);
      this.timeline = [];
    };
    World.prototype.reset = function() {
      this.bus.set(this.busClear);
      this.timeline = [];
      this.rootNode = cc.createServerRootNode(this);
      this.nodes   = { 0:this.rootNode };
      this.fixNums = {};
      this.defs    = {};
      this.buffers = {};
      this.bufSrc  = {};
    };
    World.prototype.isRunning = function() {
      return this.rootNode.running;
    };
    World.prototype.pushToTimeline = function(timeline) {
      push.apply(this.timeline, timeline);
    };
    World.prototype.doBinayCommand = function(binary) {
      var func  = commands[(binary[1] << 8) + binary[0]];
      if (func) {
        func(this, binary);
      }
    };
    World.prototype.getFixNum = function(value) {
      var fixNums = this.fixNums;
      return fixNums[value] || (fixNums[value] = {
        outputs: [ new Float32Array([value]) ]
      });
    };
    World.prototype.process = function(bufLength) {
      var timeline = this.timeline;
      var args, func;
      
      while ((args = timeline.shift())) {
        func = commands[args[0]];
        if (func) {
          func(this, args);
        }
      }
      
      this.bus.set(this.busClear);
      this.rootNode.process(bufLength, this);
    };
    
    return World;
  })();
  
  commands["/n_run"] = function(world, args) {
    var nodeId = args[1]|0;
    var flag   = !!args[2];
    var target = world.nodes[nodeId];
    if (target) {
      target.running = flag;
    }
  };
  commands["/n_free"] = function(world, args) {
    var nodeId = args[1]|0;
    var target = world.nodes[nodeId];
    if (target) {
      target.doneAction(2);
    }
  };
  commands["/n_set"] = function(world, args) {
    var nodeId = args[1]|0;
    var controls = args[2];
    var target = world.nodes[nodeId];
    if (target) {
      target.set(controls);
    }
  };
  commands["/g_new"] = function(world, args) {
    var nodeId       = args[1]|0;
    var addAction    = args[2]|0;
    var targetNodeId = args[3]|0;
    var target = world.nodes[targetNodeId];
    if (target) {
      world.nodes[nodeId] = cc.createServerGroup(nodeId, target, addAction, world);
    }
  };
  commands["/s_def"] = function(world, args) {
    var defId = args[1]|0;
    var specs = args[2];
    world.defs[defId] = specs;
  };
  commands["/s_new"] = function(world, args) {
    var nodeId       = args[1]|0;
    var addAction    = args[2]|0;
    var targetNodeId = args[3]|0;
    var defId        = args[4]|0;
    var controls     = args[5];
    var target = world.nodes[targetNodeId];
    if (target) {
      world.nodes[nodeId] = cc.createServerSynth(nodeId, target, addAction, defId, controls, world);
    }
  };
  commands["/b_new"] = function(world, args) {
    var bufnum   = args[1]|0;
    var frames   = args[2]|0;
    var channels = args[3]|0;
    world.buffers[bufnum] = cc.createServerBuffer(world, bufnum, frames, channels);
  };
  commands["/b_free"] = function(world, args) {
    var bufnum = args[1]|0;
    world.buffers[bufnum] = null;
  };
  commands["/b_zero"] = function(world, args) {
    var bufnum = args[1]|0;
    var buffer = world.buffers[bufnum];
    if (buffer) {
      buffer.zero();
    }
  };
  commands["/b_set"] = function(world, args) {
    var bufnum = args[1]|0;
    var params = args[2];
    var buffer = world.buffers[bufnum];
    if (buffer) {
      buffer.set(params);
    }
  };
  commands["/b_get"] = function(world, args) {
    var bufnum = args[1]|0;
    var index  = args[2]|0;
    var callbackId = args[3]|0;
    var buffer = world.buffers[bufnum];
    if (buffer) {
      buffer.get(index, callbackId);
    }
  };
  commands["/b_getn"] = function(world, args) {
    var bufnum = args[1]|0;
    var index  = args[2]|0;
    var count  = args[3]|0;
    var callbackId = args[4]|0;
    var buffer = world.buffers[bufnum];
    if (buffer) {
      buffer.getn(index, count, callbackId);
    }
  };
  commands["/b_fill"] = function(world, args) {
    var bufnum = args[1]|0;
    var params = args[2];
    var buffer = world.buffers[bufnum];
    if (buffer) {
      buffer.fill(params);
    }
  };
  commands["/b_gen"] = function(world, args) {
    var bufnum = args[1]|0;
    var cmd    = args[2];
    var flag   = args[3]|0;
    var params = args.slice(4);
    var buffer = world.buffers[bufnum];
    if (buffer) {
      buffer.gen(cmd, flag, params);
    }
  };
  
  commands[C.BINARY_CMD_SET_SYNC] = function(world, binary) {
    world.syncItems.set(binary);
    var server    = cc.server;
    var syncCount = new Uint32Array(binary.buffer)[C.SYNC_COUNT];
    if (server.sysSyncCount < syncCount) {
      server.sysSyncCount = syncCount;
    }
  };
  commands[C.BINARY_CMD_SET_BUFFER] = function(world, binary) {
    var bufnum   = (binary[3] << 8) + binary[2];
    var channels = (binary[7] << 8) + binary[6];
    var sampleRate = (binary[11] << 24) + (binary[10] << 16) + (binary[ 9] << 8) + binary[ 8];
    var frames     = (binary[15] << 24) + (binary[14] << 16) + (binary[13] << 8) + binary[12];
    var samples = new Float32Array(binary.buffer, C.SET_BUFFER_HEADER_SIZE);
    var buffer  = world.buffers[bufnum];
    if (buffer) {
      buffer.bind(sampleRate, channels, frames, samples);
    }
  };
  
  cc.createWorld = function(userId) {
    return new World(userId);
  };
  
  module.exports = {
    World   : World,
    commands: commands
  };

});
