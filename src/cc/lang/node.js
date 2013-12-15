define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var utils  = require("./utils");
  var extend = require("../common/extend");
  
  var nodes = {};
  
  var Node = (function() {
    var nodeId = 0;
    function Node() {
      this.klassName = "Node";
      this.nodeId    = nodeId++;
      this._blocking  = true;
      nodes[this.nodeId] = this;
    }
    extend(Node, cc.Object);
    
    Node.prototype.play = function() {
      cc.lang.pushToTimeline([
        "/n_run", this.nodeId, true
      ]);
      return this;
    };
    
    Node.prototype.pause = function() {
      cc.lang.pushToTimeline([
        "/n_run", this.nodeId, false
      ]);
      return this;
    };
    
    Node.prototype.stop = function() {
      cc.lang.pushToTimeline([
        "/n_free", this.nodeId
      ]);
      this._blocking = false;
      return this;
    };

    Node.prototype.set = function(args) {
      var controls = args2controls(args, this.params);
      if (controls.length) {
        cc.lang.pushToTimeline([
          "/n_set", this.nodeId, controls
        ]);
      }
      return this;
    };
    
    Node.prototype.release = function(releaseTime) {
      releaseTime = -1 - utils.asNumber(releaseTime);
      var controls = args2controls({ gate:releaseTime }, this.params);
      if (controls.length) {
        cc.lang.pushToTimeline([
          "/n_set", this.nodeId, controls
        ]);
      }
      return this;
    };
    
    Node.prototype.performWait = function() {
      return this._blocking;
    };

    Node.prototype.asString = function() {
      return this.klassName + "(" + this.nodeId + ")";
    };
    
    return Node;
  })();
  
  var Group = (function() {
    function Group(target, addAction) {
      Node.call(this);
      this.klassName = "Group";
      if (target instanceof Node) {
        cc.lang.pushToTimeline([
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
        cc.lang.pushToTimeline([
          "/s_new", nodeId, addAction, target.nodeId, def._defId, controls
        ]);
      }
    }
    extend(Synth, Node);
    
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
        var length = params.length[index];
        index = params.indices[index];
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
      node = cc.lang.rootNode;
      def  = list[0];
      args = list[1] || {};
    } else if (cc.instanceOfSynthDef(list[1])) {
      node = list[0];
      def  = list[1];
      args = list[2] || {};
    } else {
      node = cc.lang.rootNode;
      def  = null;
      args = {};
    }
    return [node, def, args];
  };
  
  cc.global.Group = function() {
    var target, addAction = C.ADD_TO_HEAD;
    var i = 0;
    if (cc.instanceOfNode(arguments[i])) {
      target = arguments[i++];
    } else {
      target = cc.lang.rootNode;
    }
    if (typeof arguments[i] === "string") {
      addAction = {
        addToHead:C.ADD_TO_HEAD, addToTail:C.ADD_TO_TAIL, addBefore:C.ADD_BEFORE, addAfter:C.ADD_AFTER, replace:C.REPLACE
      }[arguments[i++]] || C.ADD_TO_HEAD;
    } else if (typeof arguments[i] === "number") {
      if (0 <= arguments[i] && arguments[i] <= 4) {
        addAction = arguments[i++];
      }
    }
    return new Group(target, addAction);
  };
  cc.global.Group["new"] = cc.global.Group;
  cc.global.Group.after = function(node) {
    return new Group(node || cc.lang.rootNode, C.ADD_AFTER);
  };
  cc.global.Group.before = function(node) {
    return new Group(node || cc.lang.rootNode, C.ADD_BEFORE);
  };
  cc.global.Group.head = function(node) {
    return new Group(node || cc.lang.rootNode, C.ADD_TO_HEAD);
  };
  cc.global.Group.tail = function(node) {
    return new Group(node || cc.lang.rootNode, C.ADD_TO_TAIL);
  };
  cc.global.Group.replace = function(node) {
    return new Group(node, C.REPLACE);
  };
  
  cc.global.Synth = function(def) {
    var args, target, addAction = C.ADD_TO_HEAD;
    var i = 1;
    if (utils.isDict(arguments[i])) {
      args = arguments[i++];
    } else {
      args = {};
    }
    if (cc.instanceOfNode(arguments[i])) {
      target = arguments[i++];
    } else {
      target = cc.lang.rootNode;
    }
    if (typeof arguments[i] === "string") {
      addAction = {
        addToHead:C.ADD_TO_HEAD, addToTail:C.ADD_TO_TAIL, addBefore:C.ADD_BEFORE, addAfter:C.ADD_AFTER, replace:C.REPLACE
      }[arguments[i++]] || C.ADD_TO_HEAD;
    } else if (typeof arguments[i] === "number") {
      if (0 <= arguments[i] && arguments[i] <= 4) {
        addAction = arguments[i++];
      }
    }
    return new Synth(target, addAction, def, args);
  };
  cc.global.Synth["new"] = cc.global.Synth;
  cc.global.Synth.after = function() {
    var list = sortArgs(arguments);
    return new Synth(list[0], C.ADD_AFTER, list[1], list[2]);
  };
  cc.global.Synth.before = function() {
    var list = sortArgs(arguments);
    return new Synth(list[0], C.ADD_BEFORE, list[1], list[2]);
  };
  cc.global.Synth.head = function() {
    var list = sortArgs(arguments);
    return new Synth(list[0], C.ADD_TO_HEAD, list[1], list[2]);
  };
  cc.global.Synth.tail = function() {
    var list = sortArgs(arguments);
    return new Synth(list[0], C.ADD_TO_TAIL, list[1], list[2]);
  };
  cc.global.Synth.replace = function(node, def, args) {
    return new Synth(node, C.REPLACE, def, args);
  };
  
  cc.createLangRootNode = function() {
    return new Group();
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
  
  module.exports = {
    Node : Node,
    Group: Group,
    Synth: Synth,
    args2controls: args2controls
  };

});
