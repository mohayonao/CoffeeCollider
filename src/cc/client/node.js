define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var utils   = require("./utils");
  var extend  = require("../common/extend");
  var emitter = require("../common/emitter");
  
  var nodes = {};
  
  var Node = (function() {
    var nodeId = 0;
    function Node() {
      emitter.mixin(this);
      this.klassName = "Node";
      this.nodeId    = nodeId++;
      this._blocking  = true;
      nodes[this.nodeId] = this;
    }
    extend(Node, cc.Object);
    Node.prototype.play = function() {
      cc.client.pushToTimeline([
        "/n_run", this.nodeId, true
      ]);
      return this;
    };
    Node.prototype.pause = function() {
      cc.client.pushToTimeline([
        "/n_run", this.nodeId, false
      ]);
      return this;
    };
    Node.prototype.stop = function() {
      cc.client.pushToTimeline([
        "/n_free", this.nodeId
      ]);
      this._blocking = false;
      return this;
    };
    Node.prototype.performWait = function() {
      return this._blocking;
    };
    return Node;
  })();

  var Group = (function() {
    function Group(target, addAction) {
      Node.call(this);
      this.klassName = "Group";
      if (target instanceof Node) {
        cc.client.pushToTimeline([
          "/g_new", this.nodeId, addAction, target.nodeId
        ]);
      }
    }
    extend(Group, Node);
    
    return Group;
  })();
  
  var Synth = (function() {
    function Synth(target, addAction, def, args) {
      Node.call(this);
      this.klassName = "Synth";
      if (target instanceof Node && cc.instanceOfSynthDef(def)) {
        this.params  = def.specs.params;
        var nodeId   = this.nodeId;
        var controls = args2controls(args, this.params);
        cc.client.pushToTimeline([
          "/s_new", nodeId, addAction, target.nodeId, def._defId, controls
        ]);
      }
    }
    extend(Synth, Node);
    
    Synth.prototype.set = function(args) {
      var controls = args2controls(args, this.params);
      if (controls.length) {
        cc.client.pushToTimeline([
          "/n_set", this.nodeId, controls
        ]);
      }
    };
    
    return Synth;
  })();
  
  
  var args2controls = function(args, params) {
    var controls = [];
    if (utils.isDict(args) && params) {
      Object.keys(args).forEach(function(key) {
        var value  = args[key];
        var index  = params.names.indexOf(key);
        if (index === -1) {
          return;
        }
        index = params.indices[index];
        var length = params.length[index];
        if (Array.isArray(value)) {
          value.forEach(function(value, i) {
            if (i < length) {
              if (typeof value === "number" && !isNaN(value)) {
                controls.push(index + i, value);
              }
            }
          });
        } else if (typeof value === "number" && !isNaN(value)) {
          controls.push(index, value);
        }
      });
    }
    return controls;
  };
  
  var sortArgs = function(list) {
    var node, def, args;
    if (cc.instanceOfSynthDef(list[0])) {
      node = cc.client.rootNode;
      def  = list[0];
      args = list[1] || {};
    } else if (cc.instanceOfSynthDef(list[1])) {
      node = list[0];
      def  = list[1];
      args = list[2] || {};
    } else {
      node = cc.client.rootNode;
      def  = null;
      args = {};
    }
    return [node, def, args];
  };
  
  var GroupInterface = cc.global.Group = function() {
    return new Group();
  };
  GroupInterface.after = function(node) {
    return new Group(node || cc.client.rootNode, C.ADD_AFTER);
  };
  GroupInterface.before = function(node) {
    return new Group(node || cc.client.rootNode, C.ADD_BEFORE);
  };
  GroupInterface.head = function(node) {
    return new Group(node || cc.client.rootNode, C.ADD_TO_HEAD);
  };
  GroupInterface.tail = function(node) {
    return new Group(node || cc.client.rootNode, C.ADD_TO_TAIL);
  };
  GroupInterface.replace = function(node) {
    return new Group(node, C.REPLACE);
  };
  
  var SynthInterface = cc.global.Synth = function() {
    return new Synth();
  };
  SynthInterface.def = function(func, args) {
    return cc.createSynthDef(func, args);
  };
  SynthInterface.after = function() {
    var list = sortArgs(arguments);
    return new Synth(list[0], C.ADD_AFTER, list[1], list[2]);
  };
  SynthInterface.before = function() {
    var list = sortArgs(arguments);
    return new Synth(list[0], C.ADD_BEFORE, list[1], list[2]);
  };
  SynthInterface.head = function() {
    var list = sortArgs(arguments);
    return new Synth(list[0], C.ADD_TO_HEAD, list[1], list[2]);
  };
  SynthInterface.tail = function() {
    var list = sortArgs(arguments);
    return new Synth(list[0], C.ADD_TO_TAIL, list[1], list[2]);
  };
  SynthInterface.replace = function(node, def, args) {
    return new Synth(node, C.REPLACE, def, args);
  };
  
  
  module.exports = {
    Node : Node,
    Group: Group,
    Synth: Synth,

    // private methods
    args2controls : args2controls,
    
    use: function() {
      cc.createNode = function() {
        return new Node();
      };
      cc.createGroup = function(target, addAction) {
        return new Group(target, addAction);
      };
      cc.createSynth = function(target, addAction, def, args) {
        return new Synth(target, addAction, def, args);
      };
      cc.instanceOfNode = function(obj) {
        return obj instanceof Node;
      };
      cc.instanceOfGroup = function(obj) {
        return obj instanceof Group;
      };
      cc.instanceOfSynth = function(obj) {
        return obj instanceof Synth;
      };
      cc.getNode   = function(nodeId) {
        return nodes[nodeId];
      };
      cc.resetNode = function() {
        nodes = {};
      };
    }
  };

});
