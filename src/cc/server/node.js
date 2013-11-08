define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var extend = require("../common/extend");
  
  var Unit = require("./unit/unit").Unit;
  var graphFunc  = {};
  var doneAction = {};
  
  graphFunc[C.ADD_TO_HEAD] = function(node) {
    var prev;
    if (this instanceof Group) {
      if (this.head === null) {
        this.head = this.tail = node;
      } else {
        prev = this.head.prev;
        if (prev) {
          prev.next = node;
        }
        node.next = this.head;
        this.head.prev = node;
        this.head = node;
      }
      node.parent = this;
    }
  };
  graphFunc[C.ADD_TO_TAIL] = function(node) {
    var next;
    if (this instanceof Group) {
      if (this.tail === null) {
        this.head = this.tail = node;
      } else {
        next = this.tail.next;
        if (next) {
          next.prev = node;
        }
        node.prev = this.tail;
        this.tail.next = node;
        this.tail = node;
      }
      node.parent = this;
    }
  };
  graphFunc[C.ADD_BEFORE] = function(node) {
    var prev = this.prev;
    this.prev = node;
    node.prev = prev;
    if (prev) {
      prev.next = node;
    }
    node.next = this;
    if (this.parent && this.parent.head === this) {
      this.parent.head = node;
    }
    node.parent = this.parent;
  };
  graphFunc[C.ADD_AFTER] = function(node) {
    var next = this.next;
    this.next = node;
    node.next = next;
    if (next) {
      next.prev = node;
    }
    node.prev = this;
    if (this.parent && this.parent.tail === this) {
      this.parent.tail = node;
    }
    node.parent = this.parent;
  };
  graphFunc[C.REPLACE] = function(node) {
    node.next = this.next;
    node.prev = this.prev;
    node.head = this.head;
    node.tail = this.tail;
    node.parent = this.parent;
    if (this.prev) {
      this.prev.next = node;
    }
    if (this.next) {
      this.next.prev = node;
    }
    if (this.parent && this.parent.head === this) {
      this.parent.head = node;
    }
    if (this.parent && this.parent.tail === this) {
      this.parent.tail = node;
    }
  };
  
  doneAction[0] = function() {
    // do nothing when the UGen is finished
  };
  doneAction[1] = function() {
    // pause the enclosing synth, but do not free it
    this.running = false;
  };
  doneAction[2] = function() {
    // free the enclosing synth
    free.call(this);
  };
  doneAction[3] = function() {
    // free both this synth and the preceding node
    var prev = this.prev;
    if (prev) {
      free.call(prev);
    }
    free.call(this);
  };
  doneAction[4] = function() {
    // free both this synth and the following node
    var next = this.next;
    free.call(this);
    if (next) {
      free.call(next);
    }
  };
  doneAction[5] = function() {
    // free this synth; if the preceding node is a group then do g_freeAll on it, else free it
    var prev = this.prev;
    if (prev instanceof Group) {
      g_freeAll(prev);
    } else {
      free.call(prev);
    }
    free.call(this);
  };
  doneAction[6] = function() {
    // free this synth; if the following node is a group then do g_freeAll on it, else free it
    var next = this.next;
    free.call(this);
    if (next) {
      g_freeAll(next);
    } else {
      free.call(next);
    }
  };
  doneAction[7] = function() {
    // free this synth and all preceding nodes in this group
    var next = this.parent.head;
    if (next) {
      var node = next;
      while (node && node !== this) {
        next = node.next;
        free.call(node);
        node = next;
      }
    }
    free.call(this);
  };
  doneAction[8] = function() {
    // free this synth and all following nodes in this group
    var next = this.next;
    free.call(this);
    if (next) {
      var node = next;
      while (node) {
        next = node.next;
        free.call(node);
        node = next;
      }
    }
  };
  doneAction[9] = function() {
    // free this synth and pause the preceding node
    var prev = this.prev;
    free.call(this);
    if (prev) {
      prev.running = false;
    }
  };
  doneAction[10] = function() {
    // free this synth and pause the following node
    var next = this.next;
    free.call(this);
    if (next) {
      next.running = false;
    }
  };
  doneAction[11] = function() {
    // free this synth and if the preceding node is a group then do g_deepFree on it, else free it
    var prev = this.prev;
    if (prev instanceof Group) {
      g_deepFree(prev);
    } else {
      free.call(prev);
    }
    free.call(this);
  };
  doneAction[12] = function() {
    // free this synth and if the following node is a group then do g_deepFree on it, else free it
    var next = this.next;
    free.call(this);
    if (next) {
      g_deepFree(next);
    } else {
      free.call(next);
    }
  };
  doneAction[13] = function() {
    // free this synth and all other nodes in this group (before and after)
    var next = this.parent.head;
    if (next) {
      var node = next;
      while (node) {
        next = node.next;
        free.call(node);
        node = next;
      }
    }
  };
  doneAction[14] = function() {
    // free the enclosing group and all nodes within it (including this synth)
    g_deepFree(this);
  };
  var free = function() {
    if (this.prev) {
      this.prev.next = this.next;
    }
    if (this.next) {
      this.next.prev = this.prev;
    }
    if (this.parent) {
      if (this.parent.head === this) {
        this.parent.head = this.next;
      }
      if (this.parent.tail === this) {
        this.parent.tail = this.prev;
      }

      var userId;
      if (this.instance) {
        userId = this.instance.userId;
      }
      cc.server.sendToLang([
        "/emit/n_end", this.nodeId
      ], userId);
    }
    this.prev = null;
    this.next = null;
    this.parent = null;
    this.blocking = false;
    if (this.instance) {
      delete this.instance.nodes[this.nodeId];
    }
  };
  var g_freeAll = function(node) {
    var next = node.head;
    free.call(node);
    node = next;
    while (node) {
      next = node.next;
      free.call(node);
      node = next;
    }
  };
  var g_deepFree = function(node) {
    var next = node.head;
    free.call(node);
    node = next;
    while (node) {
      next = node.next;
      free.call(node);
      if (node instanceof Group) {
        g_deepFree(node);
      }
      node = next;
    }
  };
  
  var Node = (function() {
    function Node(nodeId, instance) {
      this.nodeId = nodeId|0;
      this.next   = null;
      this.prev   = null;
      this.parent = null;
      this.running = true;
      this.instance = instance;
    }
    Node.prototype.play = function() {
      this.running = true;
    };
    Node.prototype.pause = function() {
      this.running = false;
    };
    Node.prototype.stop = function() {
      free.call(this);
    };
    Node.prototype.doneAction = function(action, tag) {
      var func = doneAction[action];
      if (func) {
        func.call(this);
        var userId;
        if (this.instance) {
          userId = this.instance.userId;
        }
        cc.server.sendToLang([
          "/emit/n_done", this.nodeId, tag
        ], userId);
      }
    };
    return Node;
  })();

  var Group = (function() {
    function Group(nodeId, target, addAction, instance) {
      Node.call(this, nodeId, instance);
      this.head = null;
      this.tail = null;
      if (target) {
        graphFunc[addAction].call(target, this);
      }
    }
    extend(Group, Node);
    
    Group.prototype.process = function(inNumSamples, instance) {
      if (this.head && this.running) {
        this.head.process(inNumSamples, instance);
      }
      if (this.next) {
        this.next.process(inNumSamples, instance);
      }
    };
    
    return Group;
  })();

  var Synth = (function() {
    function Synth(nodeId, node, addAction, defId, controls, instance) {
      Node.call(this, nodeId, instance);
      if (instance) {
        var specs = instance.defs[defId];
        if (specs) {
          this.build(specs, controls, instance);
        }
      }
      if (node) {
        graphFunc[addAction].call(node, this);
      }
    }
    extend(Synth, Node);
    
    Synth.prototype.build = function(specs, controls, instance) {
      this.specs = specs;

      var fixNumList = specs.consts.map(function(value) {
        return instance.getFixNum(value);
      });
      var unitList = specs.defList.map(function(spec) {
        return new Unit(this, spec);
      }, this);
      this.params   = specs.params;
      this.controls = new Float32Array(this.params.values);
      this.set(controls);
      this.unitList = unitList.filter(function(unit) {
        var inputs  = unit.inputs;
        var inRates = unit.inRates;
        var inSpec  = unit.specs[3];
        var tag     = unit.specs[5];
        for (var i = 0, imax = inputs.length; i < imax; ++i) {
          var i2 = i << 1;
          if (inSpec[i2] === -1) {
            inputs[i]  = fixNumList[inSpec[i2+1]].outputs[0];
            inRates[i] = C.SCALAR;
          } else {
            inputs[i]  = unitList[inSpec[i2]].outputs[inSpec[i2+1]];
            inRates[i] = unitList[inSpec[i2]].outRates[inSpec[i2+1]];
          }
        }
        unit.init(tag);
        return !!unit.process;
      });
      return this;
    };

    Synth.prototype.set = function(controls) {
      for (var i = 0, imax = controls.length; i < imax; i += 2) {
        var index = controls[i    ];
        var value = controls[i + 1];
        this.controls[index] = value;
      }
    };
    
    Synth.prototype.process = function(inNumSamples, instance) {
      if (this.running && this.unitList) {
        var unitList = this.unitList;
        for (var i = 0, imax = unitList.length; i < imax; ++i) {
          var unit = unitList[i];
          unit.process(unit.rate.bufLength, instance);
        }
      }
      if (this.next) {
        this.next.process(inNumSamples, instance);
      }
    };
    
    return Synth;
  })();
  
  module.exports = {
    Node : Node,
    Group: Group,
    Synth: Synth,
  };

});
