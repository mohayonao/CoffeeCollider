define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var fn = require("./fn");
  var FixNum = require("./unit/fixnum").FixNum;
  var Unit   = require("./unit/unit").Unit;

  var Node = (function() {
    function Node() {
      this.klassName = "Node";
      this.next    = null;
      this.prev    = null;
      this.parent  = null;
      this.running = true;
    }
    
    var appendFunc = {};
    appendFunc.addToHead = function(node) {
      var prev;
      if (this.head === null) {
        this.head = this.tail = node;
      } else {
        prev = this.head.prev;
        if (prev) { prev.next = node; }
        node.next = this.head;
        this.head.prev = node;
        this.head = node;
      }
      node.parent = this;
    };
    appendFunc.addToTail = function(node) {
      var next;
      if (this.tail === null) {
        this.head = this.tail = node;
      } else {
        next = this.tail.next;
        if (next) { next.prev = node; }
        node.prev = this.tail;
        this.tail.next = node;
        this.tail = node;
      }
      node.parent = this;
    };
    appendFunc.addBefore = function(node) {
      var prev = this.prev;
      this.prev = node;
      node.prev = prev;
      if (prev) { prev.next = node; }
      node.next = this;
      if (this.parent && this.parent.head === this) {
        this.parent.head = node;
      }
      node.parent = this.parent;
    };
    appendFunc.addAfter = function(node) {
      var next = this.next;
      this.next = node;
      node.next = next;
      if (next) { next.prev = node; }
      node.prev = this;
      if (this.parent && this.parent.tail === this) {
        this.parent.tail = node;
      }
      node.parent = this.parent;
    };
    
    Node.prototype.append = function(node, addAction) {
      if (appendFunc[addAction]) {
        appendFunc[addAction].call(this, node);
      }
      return this;
    };

    Node.prototype.remove = function() {
      if (this.parent) {
        if (this.parent.head === this) {
          this.parent.head = this.next;
        }
        if (this.parent.tail === this) {
          this.parent.tail = this.prev;
        }
      }
      if (this.prev) {
        this.prev.next = this.next;
      }
      if (this.next) {
        this.next.prev = this.prev;
      }
      this.prev = null;
      this.next = null;
      this.parent = null;
      return this;
    };
    
    return Node;
  })();

  var Group = (function() {
    function Group() {
      Node.call(this);
      this.klassName = "Group";
      this.head = null;
      this.tail = null;
    }
    fn.extend(Group, Node);
    
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
    function Synth(specs, target, args, addAction) {
      Node.call(this);
      this.klassName = "Synth";
      this.specs = JSON.parse(specs);
      target.append(this, addAction);
      build.call(this, this.specs, args);
    }
    fn.extend(Synth, Node);

    var build = function(specs, args) {
      this.server = cc.server;
      var fixNumList = specs.consts.map(function(value) {
        return new FixNum(value);
      });
      var unitList = specs.defs.map(function(spec) {
        return new Unit(this, spec);
      }, this);
      this.controls = new Float32Array(specs.params.values);
      this.set(args);
      this.unitList = unitList.filter(function(unit) {
        var inputs  = unit.inputs;
        var inRates = unit.inRates;
        var inSpec  = unit.specs[3];
        for (var i = 0, imax = inputs.length; i < imax; ++i) {
          var i2 = i << 1;
          if (inSpec[i2] === -1) {
            inputs[i]  = fixNumList[inSpec[i2+1]].outs[0];
            inRates[i] = C.SCALAR;
          } else {
            inputs[i]  = unitList[inSpec[i2]].outs[inSpec[i2+1]];
            inRates[i] = unitList[inSpec[i2]].outRates[inSpec[i2+1]];
          }
        }
        unit.init();
        return !!unit.process;
      });
    };
    Synth.prototype.set = function(args) {
      if (!args) {
        return this;
      }
      return this;
    };
    Synth.prototype.process = function(inNumSamples) {
      if (this.running) {
        var unitList = this.unitList;
        for (var i = 0, imax = unitList.length; i < imax; ++i) {
          var unit = unitList[i];
          unit.process(unit.rate.bufLength);
        }
      }
      if (this.next) {
        this.next.process(inNumSamples);
      }
    };
    
    return Synth;
  })();

  var install = function() {
  };
  
  module.exports = {
    Node : Node,
    Group: Group,
    Synth: Synth,
    install: install,
  };

});
