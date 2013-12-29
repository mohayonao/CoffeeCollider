define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var extend = require("../common/extend");
  
  var graphFunc  = [];
  var doneAction = [];
  
  graphFunc[C.ADD_TO_HEAD] = function(child, addThisOne) {
    if (child.nodeId !== 0 && addThisOne instanceof Group) {
      child.prev = null;
      child.next = addThisOne.head;
      if (addThisOne.head) {
        addThisOne.head.prev = child;
        addThisOne.head = child;
      } else {
        addThisOne.head = addThisOne.tail = child;
      }
      child.parent = addThisOne;
    }
  };
  graphFunc[C.ADD_TO_TAIL] = function(child, addThisOne) {
    if (child.nodeId !== 0 && addThisOne instanceof Group) {
      child.prev = addThisOne.tail;
      child.next = null;
      if (addThisOne.tail) {
        addThisOne.tail.next = child;
        addThisOne.tail = child;
      } else {
        addThisOne.head = addThisOne.tail = child;
      }
      child.parent = addThisOne;
    }
  };
  graphFunc[C.ADD_BEFORE] = function(node, beforeThisOne) {
    if (node.nodeId !== 0 && beforeThisOne.parent) {
      node.parent = beforeThisOne.parent;
      node.prev = beforeThisOne.prev;
      node.next = beforeThisOne;
      
      if (beforeThisOne.prev) {
        beforeThisOne.prev.next = node;
      } else {
        node.parent.head = node;
      }
      beforeThisOne.prev = node;
    }
  };
  graphFunc[C.ADD_AFTER] = function(node, afterThisOne) {
    if (node.nodeId !== 0 && afterThisOne.parent) {
      node.parent = afterThisOne.parent;
      node.prev = afterThisOne;
      node.next = afterThisOne.next;
      
      if (afterThisOne.next) {
        afterThisOne.next.prev = node;
      } else {
        node.parent.tail = node;
      }
      afterThisOne.next = node;
    }
  };
  graphFunc[C.REPLACE] = function(node, replaceThisOne) {
    if (node.node !== 0 && replaceThisOne.parent) {
      var parent = node.parent = replaceThisOne.parent;
      node.prev = replaceThisOne.prev;
      node.next = replaceThisOne.next;
      
      if (node instanceof Group) {
        node.head = replaceThisOne.head;
        node.tail = replaceThisOne.tail;
      }
      
      if (replaceThisOne.prev) {
        replaceThisOne.prev.next = node;
      }
      if (replaceThisOne.next) {
        replaceThisOne.next.prev = node;
      }
      if (parent.head === replaceThisOne) {
        parent.head = node;
      }
      if (parent.tail === replaceThisOne) {
        parent.tail = node;
      }
    }
  };

  // do nothing when the UGen is finished
  doneAction[0] = null;
  
  // pause the enclosing synth, but do not free it
  doneAction[1] = function(node) {
    node.running = false;
  };
  
  // free the enclosing synth
  doneAction[2] = function(node) {
    node.end();
  };

  // free both this synth and the preceding node
  doneAction[3] = function(node) {
    if (node.prev) {
      node.prev.end();
    }
    node.end();
  };

  // free both this synth and the following node
  doneAction[4] = function(node) {
    if (node.next) {
      node.next.end();
    }
    node.end();
  };
  
  // free this synth; if the preceding node is a group then do g_freeAll on it, else free it
  doneAction[5] = function(node) {
    var prev = node.prev;
    if (prev instanceof Group) {
      prev.endAll();
    } else if (prev) {
      prev.end();
    }
    node.end();
  };
  
  // free this synth; if the following node is a group then do g_freeAll on it, else free it
  doneAction[6] = function(node) {
    var next = node.next;
    node.end();
    if (next instanceof Group) {
      next.endAll();
    } else if (next) {
      next.end();
    }
  };

  // free this synth and all preceding nodes in this group
  doneAction[7] = function(node) {
    var prev;
    while (node) {
      prev = node.prev;
      node.end();
      node = prev;
    }
  };
  
  // free this synth and all following nodes in this group
  doneAction[8] = function(node) {
    var next;
    while (node) {
      next = node.next;
      node.end();
      node = next;
    }
  };
  
  // free this synth and pause the preceding node
  doneAction[9] = function(node) {
    if (node.prev) {
      node.prev.running = false;
    }
    node.end();
  };
  
  // free this synth and pause the following node
  doneAction[10] = function(node) {
    if (node.next) {
      node.next.running = false;
    }
    node.end();
  };
  
  // free this synth and if the preceding node is a group then do g_deepFree on it, else free it
  doneAction[11] = function(node) {
    var prev = node.prev;
    if (prev instanceof Group) {
      prev.endDeep();
    } else if (prev) {
      prev.end();
    }
    node.end();
  };

  // free this synth and if the following node is a group then do g_deepFree on it, else free it
  doneAction[12] = function(node) {
    var next = node.next;
    if (next instanceof Group) {
      next.endDeep();
    } else if (next) {
      next.end();
    }
    node.end();
  };
  
  // free this synth and all other nodes in this group (before and after)
  doneAction[13] = function(node) {
    var next;
    node = node.parent.head;
    while (node) {
      next = node.next;
      node.end();
      node = next;
    }
  };
  
  // free the enclosing group and all nodes within it (including this synth)
  doneAction[14] = function(node) {
    node.parent.endDeep();
  };
  
  var Node = (function() {
    function Node(world, nodeId) {
      this.world   = world;
      this.nodeId  = nodeId|0;
      this.next    = null;
      this.prev    = null;
      this.parent  = null;
      this.running = true;
    }
    Node.prototype.play = function() {
      this.running = true;
    };
    Node.prototype.pause = function() {
      this.running = false;
    };
    Node.prototype.end = function() {
      if (this.nodeId !== 0) {
        if (this.prev) {
          this.prev.next = this.next;
        }
        if (this.next) {
          this.next.prev = this.prev;
        }
        if (this.parent.head === this) {
          this.parent.head = this.next;
        }
        if (this.parent.tail === this) {
          this.parent.tail = this.prev;
        }
        this.prev   = null;
        this.next   = null;
        this.parent = null;
        this.world.nodes[this.nodeId] = null;
      }
      this.running = false;
    };
    Node.prototype.run = function(inRun) {
      this.running = !!inRun; // TODO
    };
    Node.prototype.doneAction = function(action) {
      var func = doneAction[action];
      if (func) {
        func(this);
      }
    };
    return Node;
  })();

  var Group = (function() {
    function Group(world, nodeId, target, addAction) {
      Node.call(this, world, nodeId);
      this.head = null;
      this.tail = null;
      if (target) {
        graphFunc[addAction](this, target);
      }
    }
    extend(Group, Node);

    Group.prototype.endAll = function() {
      var next, node = this.head;
      while (node) {
        next = node.next;
        node.end();
        node = next;
      }
      this.end();
    };

    Group.prototype.endDeep = function() {
      var next, node = this.head;
      while (node) {
        next = node.next;
        if (node instanceof Group) {
          node.endDeep();
        } else {
          node.end();
        }
        node = next;
      }
      this.end();
    };
    
    Group.prototype.process = function(inNumSamples) {
      if (this.head && this.running) {
        this.head.process(inNumSamples);
      }
      if (this.next) {
        this.next.process(inNumSamples);
      }
    };
    
    return Group;
  })();

  var Synth = (function() {
    function Synth(world, nodeId, target, addAction, defId, controls) {
      Node.call(this, world, nodeId);
      if (world) {
        var specs = world.defs[defId];
        if (specs) {
          this.build(specs, controls, world);
        }
      }
      if (target) {
        graphFunc[addAction](this, target);
      }
    }
    extend(Synth, Node);
    
    Synth.prototype.build = function(specs, controls, world) {
      var list, fixNumList, unitList = [];
      var heap = new Float32Array(specs.heapSize);
      var unit, inputs, inRates, fromUnits, inSpec;
      var i, imax, j, jmax, k, u, x1, x2;
      
      this.specs  = specs;
      this.params = specs.params;
      
      this.heap      = heap;
      this.heapIndex = this.params.values.length;
      heap.set(this.params.values);
      
      this.controls = heap;
      this.set(controls);
      
      list = specs.consts;
      fixNumList = new Array(list.length);
      for (i = 0, imax = list.length; i < imax; ++i) {
        fixNumList[i] = world.getFixNum(list[i]);
      }
      
      list = specs.defList;
      for (i = 0, imax = list.length; i < imax; ++i) {
        unit      = cc.createUnit(this, list[i]);
        inputs    = unit.inputs;
        inRates   = unit.inRates;
        fromUnits = unit.fromUnits;
        inSpec    = unit.specs[3];
        for (j = k = 0, jmax = inputs.length; j < jmax; ++j) {
          x1 = inSpec[k++];
          x2 = inSpec[k++];
          if (x1 === -1) {
            inputs[j]  = fixNumList[x2].outputs[0];
            inRates[j] = C.SCALAR;
          } else {
            u = unitList[x1];
            inputs[j]    = u.outputs[x2];
            inRates[j]   = u.outRates[x2];
            fromUnits[j] = u;
          }
        }
        unit.init();
        if (unit.process) {
          unitList.push(unit);
        }
      }
      this.unitList = unitList;
      
      return this;
    };

    Synth.prototype.set = function(controls) {
      for (var i = 0, imax = controls.length; i < imax; i += 2) {
        var index = controls[i    ];
        var value = controls[i + 1];
        this.controls[index] = value;
      }
    };
    
    Synth.prototype.process = function(inNumSamples) {
      if (this.running && this.unitList) {
        var unitList = this.unitList;
        for (var i = 0, imax = unitList.length; i < imax; ++i) {
          var unit = unitList[i];
          if (unit.calcRate !== C.DEMAND) {
            unit.process(unit.rate.bufLength);
          }
        }
      }
      if (this.next) {
        this.next.process(inNumSamples);
      }
    };
    
    return Synth;
  })();
  
  cc.createServerRootNode = function(world) {
    return new Group(world, 0, 0, 0);
  };

  cc.createServerGroup = function(world, nodeId, target, addAction) {
    return new Group(world, nodeId, target, addAction);
  };

  cc.createServerSynth = function(world, nodeId, target, addAction, defId, controls) {
    return new Synth(world, nodeId, target, addAction, defId, controls);
  };
  
  module.exports = {
    Node : Node,
    Group: Group,
    Synth: Synth,
    graphFunc: graphFunc
  };

});
