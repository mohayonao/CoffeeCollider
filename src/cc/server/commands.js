define(function(require, exports, module) {
  "use strict";
  
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
    var specs = JSON.parse(msg[2]);
    this.defs[defId] = specs;
  };
  commands["/s_new"] = function(msg) {
    var nodeId       = msg[1]|0;
    var addAction    = msg[2]|0;
    var targetNodeId = msg[3]|0;
    var defId        = msg[4]|0;
    var target = this.nodes[targetNodeId];
    if (target) {
      this.nodes[nodeId] = new node.Synth(nodeId, target, addAction, defId, {}, this);
    }
  };
  commands["/b_new"] = function(msg) {
    var bufId = msg[1]|0;
    this.buffers[bufId] = new buffer.Buffer(bufId);
  };
  commands["/b_set"] = function(msg) {
    var bufId       = msg[1]|0;
    var numFrames   = msg[2]|0;
    var numChannels = msg[3]|0;
    var sampleRate  = msg[4]|0;
    var samples     = msg[5];
    var buffer = this.buffers[bufId];
    if (buffer) {
      buffer.set(numFrames, numChannels, sampleRate, samples);
    }
  };
  
  module.exports = commands;

});
