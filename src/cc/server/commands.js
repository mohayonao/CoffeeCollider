define(function(require, exports, module) {
  "use strict";

  var cc     = require("./cc");
  var node   = require("./node");
  var buffer = require("./buffer");
  
  var commands = {};
  
  // the 'this.' context is an instance.
  
  commands["/n_run"] = function(msg) {
    var nodeId = msg[1]|0;
    var flag   = !!msg[2];
    var target = this.nodes[nodeId];
    if (target) {
      target.running = flag;
    }
  };
  commands["/n_free"] = function(msg) {
    var nodeId = msg[1]|0;
    var target = this.nodes[nodeId];
    if (target) {
      target.doneAction(2);
    }
  };
  commands["/n_set"] = function(msg) {
    var nodeId = msg[1]|0;
    var controls = msg[2];
    var target = this.nodes[nodeId];
    if (target) {
      target.set(controls);
    }
  };
  commands["/g_new"] = function(msg) {
    var nodeId       = msg[1]|0;
    var addAction    = msg[2]|0;
    var targetNodeId = msg[3]|0;
    var target = this.nodes[targetNodeId];
    if (target) {
      this.nodes[nodeId] = new node.Group(nodeId, target, addAction, this);
    }
  };
  commands["/s_def"] = function(msg) {
    var defId = msg[1]|0;
    var specs = msg[2];
    this.defs[defId] = specs;
  };
  commands["/s_new"] = function(msg) {
    var nodeId       = msg[1]|0;
    var addAction    = msg[2]|0;
    var targetNodeId = msg[3]|0;
    var defId        = msg[4]|0;
    var controls     = msg[5];
    var target = this.nodes[targetNodeId];
    if (target) {
      this.nodes[nodeId] = new node.Synth(nodeId, target, addAction, defId, controls, this);
    }
  };
  commands["/b_new"] = function(msg) {
    var bufnum   = msg[1]|0;
    var frames   = msg[2]|0;
    var channels = msg[3]|0;
    this.buffers[bufnum] = new buffer.Buffer(bufnum, frames, channels);
  };
  commands["/b_bind"] = function(msg) {
    var bufnum     = msg[1]|0;
    var bufSrcId   = msg[2]|0;
    var startFrame = msg[3]|0;
    var frames     = msg[4]|0;
    var buffer = this.buffers[bufnum];
    var bufSrc = this.bufSrc[bufSrcId];
    if (buffer) {
      if (bufSrc) {
        buffer.bindBufferSource(bufSrc, startFrame, frames);
      } else {
        bufSrc = new buffer.BufferSource(bufSrcId);
        bufSrc.pendings.push([buffer, startFrame, frames]);
        this.bufSrc[bufSrcId] = bufSrc;
      }
    }
  };
  commands["/b_free"] = function(msg) {
    var bufnum = msg[1]|0;
    delete this.buffers[bufnum];
  };
  commands["/b_zero"] = function(msg) {
    var bufnum = msg[1]|0;
    var buffer = this.buffers[bufnum];
    if (buffer) {
      buffer.zero();
    }
  };
  commands["/b_set"] = function(msg) {
    var bufnum = msg[1]|0;
    var params = msg[2];
    var buffer = this.buffers[bufnum];
    if (buffer) {
      buffer.set(params);
    }
  };
  commands["/b_gen"] = function(msg) {
    var bufnum = msg[1]|0;
    var cmd    = msg[2];
    var flag   = msg[3]|0;
    var params = msg.slice(4);
    var buffer = this.buffers[bufnum];
    if (buffer) {
      buffer.gen(cmd, flag, params);
    }
  };
  
  commands[C.BINARY_CMD_SET_SYNC] = function(binary) {
    this.syncItems.set(binary);
    var server    = cc.server;
    var syncCount = new Uint32Array(binary.buffer)[C.SYNC_COUNT];
    if (server.sysSyncCount < syncCount) {
      server.sysSyncCount = syncCount;
    }
  };
  commands[C.BINARY_CMD_SET_BUFSRC] = function(binary) {
    var bufSrcId = (binary[3] << 8) + binary[2];
    var channels = (binary[7] << 8) + binary[6];
    var sampleRate = (binary[11] << 24) + (binary[10] << 16) + (binary[ 9] << 8) + binary[ 8];
    var frames     = (binary[15] << 24) + (binary[14] << 16) + (binary[13] << 8) + binary[12];
    var samples = new Float32Array(binary.buffer, C.BUFSRC_HEADER_SIZE);
    var bufSrc = this.bufSrc[bufSrcId];
    if (!bufSrc) {
      bufSrc = new buffer.BufferSource(bufSrcId);
    }
    bufSrc.set(channels, sampleRate, frames, samples);
    this.bufSrc[bufSrcId] = bufSrc;
  };
  
  module.exports = commands;

});
