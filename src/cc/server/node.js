define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var fn = require("./fn");
  var utils = require("./utils");
  var ugen  = require("./ugen/ugen");
  var Unit    = require("./unit/unit").Unit;
  var FixNum  = require("./unit/unit").FixNum;
  var Emitter = require("../common/emitter").Emitter;
  var slice = [].slice;
  
  var graphFunc = {};
  graphFunc[C.ADD_TO_HEAD] = function(node) {
    var prev;
    if (this instanceof Group) {
      if (this.headNode === null) {
        this.headNode = this.tailNode = node;
      } else {
        prev = this.headNode.prevNode;
        if (prev) {
          prev.nextNode = node;
        }
        node.nextNode = this.headNode;
        this.headNode.prevNode = node;
        this.headNode = node;
      }
      node.parentNode = this;
    }
  };
  graphFunc[C.ADD_TO_TAIL] = function(node) {
    var next;
    if (this instanceof Group) {
      if (this.tailNode === null) {
        this.headNode = this.tailNode = node;
      } else {
        next = this.tailNode.nextNode;
        if (next) {
          next.prevNode = node;
        }
        node.prevNode = this.tailNode;
        this.tailNode.nextNode = node;
        this.tailNode = node;
      }
      node.parentNode = this;
    }
  };
  graphFunc[C.ADD_BEFORE] = function(node) {
    var prev = this.prevNode;
    this.prevNode = node;
    node.prevNode = prev;
    if (prev) {
      prev.nextNode = node;
    }
    node.nextNode = this;
    if (this.parentNode && this.parentNode.headNode === this) {
      this.parentNode.headNode = node;
    }
    node.parentNode = this.parentNode;
  };
  graphFunc[C.ADD_AFTER] = function(node) {
    var next = this.nextNode;
    this.nextNode = node;
    node.nextNode = next;
    if (next) {
      next.prevNode = node;
    }
    node.prevNode = this;
    if (this.parentNode && this.parentNode.tailNode === this) {
      this.parentNode.tailNode = node;
    }
    node.parentNode = this.parentNode;
  };
  graphFunc[C.REPLACE] = function(node) {
    node.nextNode = this.nextNode;
    node.prevNode = this.prevNode;
    node.headNode = this.headNode;
    node.tailNode = this.tailNode;
    node.parentNode = this.parentNode;
    if (this.prevNode) {
      this.prevNode.nextNode = node;
    }
    if (this.nextNode) {
      this.nextNode.prevNode = node;
    }
    if (this.parentNode && this.parentNode.headNode === this) {
      this.parentNode.headNode = node;
    }
    if (this.parentNode && this.parentNode.tailNode === this) {
      this.parentNode.tailNode = node;
    }
  };

  var doneAction = {}; // TODO: correct?
  doneAction[0] = function() {
    // do nothing when the UGen is finished
  };
  doneAction[1] = function() {
    // pause the enclosing synth, but do not free it
    this._running = false;
  };
  doneAction[2] = function() {
    // free the enclosing synth
    free.call(this);
  };
  doneAction[3] = function() {
    // free both this synth and the preceding node
    var prev = this.prevNode;
    if (prev) {
      free.call(prev);
    }
    free.call(this);
  };
  doneAction[4] = function() {
    // free both this synth and the following node
    var next = this.nextNode;
    free.call(this);
    if (next) {
      free.call(next);
    }
  };
  doneAction[5] = function() {
    // free this synth; if the preceding node is a group then do g_freeAll on it, else free it
    var prev = this.prevNode;
    if (prev instanceof Group) {
      g_freeAll(prev);
    } else {
      free.call(prev);
    }
    free.call(this);
  };
  doneAction[6] = function() {
    // free this synth; if the following node is a group then do g_freeAll on it, else free it
    var next = this.nextNode;
    free.call(this);
    if (next) {
      g_freeAll(next);
    } else {
      free.call(next);
    }
  };
  doneAction[7] = function() {
    // free this synth and all preceding nodes in this group
    var next = this.parentNode.headNode;
    if (next) {
      var node = next;
      while (node && node !== this) {
        next = node.nextNode;
        free.call(node);
        node = next;
      }
    }
    free.call(this);
  };
  doneAction[8] = function() {
    // free this synth and all following nodes in this group
    var next = this.nextNode;
    free.call(this);
    if (next) {
      var node = next;
      while (node) {
        next = node.nextNode;
        free.call(node);
        node = next;
      }
    }
  };
  doneAction[9] = function() {
    // free this synth and pause the preceding node
    var prev = this.prevNode;
    free.call(this);
    if (prev) {
      prev._running = false;
    }
  };
  doneAction[10] = function() {
    // free this synth and pause the following node
    var next = this.nextNode;
    free.call(this);
    if (next) {
      next._running = false;
    }
  };
  doneAction[11] = function() {
    // free this synth and if the preceding node is a group then do g_deepFree on it, else free it
    var prev = this.prevNode;
    if (prev instanceof Group) {
      g_deepFree(prev);
    } else {
      free.call(prev);
    }
    free.call(this);
  };
  doneAction[12] = function() {
    // free this synth and if the following node is a group then do g_deepFree on it, else free it
    var next = this.nextNode;
    free.call(this);
    if (next) {
      g_deepFree(next);
    } else {
      free.call(next);
    }
  };
  doneAction[13] = function() {
    // free this synth and all other nodes in this group (before and after)
    var next = this.parentNode.headNode;
    if (next) {
      var node = next;
      while (node) {
        next = node.nextNode;
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
    if (this.prevNode) {
      this.prevNode.nextNode = this.nextNode;
    }
    if (this.nextNode) {
      this.nextNode.prevNode = this.prevNode;
    }
    if (this.parentNode) {
      if (this.parentNode.headNode === this) {
        this.parentNode.headNode = this.nextNode;
      }
      if (this.parentNode.tailNode === this) {
        this.parentNode.tailNode = this.prevNode;
      }
      this.emit("end");
    }
    this.prevNode = null;
    this.nextNode = null;
    this.parentNode = null;
    this.blocking = false;
  };
  var g_freeAll = function(node) {
    var next = node.headNode;
    free.call(node);
    node = next;
    while (node) {
      next = node.nextNode;
      free.call(node);
      node = next;
    }
  };
  var g_deepFree = function(node) {
    var next = node.headNode;
    free.call(node);
    node = next;
    while (node) {
      next = node.nextNode;
      free.call(node);
      if (node instanceof Group) {
        g_deepFree(node);
      }
      node = next;
    }
  };
  
  var Node = (function() {
    function Node() {
      Emitter.call(this);
      this.klassName = "Node";
      this.nextNode   = null;
      this.prevNode   = null;
      this.parentNode = null;
      this.blocking = true;
      this._running = true;
    }
    fn.extend(Node, Emitter);
    Node.prototype.play = fn.sync(function() {
      this._running = true;
    });
    Node.prototype.pause = fn.sync(function() {
      this._running = false;
    });
    Node.prototype.stop = fn.sync(function() {
      free.call(this);
    });
    Node.prototype._doneAction = function(action, tag) {
      var func = doneAction[action];
      if (func) {
        this.emit("done", tag);
        func.call(this);
      }
    };
    return Node;
  })();

  var Group = (function() {
    function Group(node, addAction) {
      Node.call(this);
      this.klassName = "Group";
      this.headNode = null;
      this.tailNode = null;
      if (node) {
        var that = this;
        var timeline = cc.server.timeline;
        timeline.push(function() {
          graphFunc[addAction].call(node, that);
        });
      }
    }
    fn.extend(Group, Node);
    
    Group.prototype._process = function(inNumSamples) {
      if (this.headNode && this._running) {
        this.headNode._process(inNumSamples);
      }
      if (this.nextNode) {
        this.nextNode._process(inNumSamples);
      }
    };
    
    return Group;
  })();
  
  var Synth = (function() {
    function Synth(specs, node, args, addAction) {
      Node.call(this);
      this.klassName = "Synth";
      if (specs) {
        build.call(this, specs, args);
      }
      if (node) {
        var that = this;
        var timeline = cc.server.timeline;
        timeline.push(function() {
          graphFunc[addAction].call(node, that);
        });
      }
    }
    fn.extend(Synth, Node);
    
    var build = function(specs, args) {
      this.specs = specs = JSON.parse(specs);

      var fixNumList = specs.consts.map(function(value) {
        return new FixNum(value);
      });
      var unitList = specs.defs.map(function(spec) {
        return new Unit(this, spec);
      }, this);
      this.params   = specs.params;
      this.controls = new Float32Array(this.params.values);
      this.set(args);
      this.unitList = unitList.filter(function(unit) {
        var inputs  = unit.inputs;
        var inRates = unit.inRates;
        var inSpec  = unit.specs[3];
        var tag     = unit.specs[5];
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
        unit.init(tag);
        return !!unit.process;
      });
      return this;
    };
    
    Synth.prototype.set = fn.sync(function(args) {
      var params = this.params;
      if (utils.isDict(args)) {
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
                  this.controls[index + i] = value;
                }
              }
            }, this);
          } else if (typeof value === "number" && !isNaN(value)) {
            this.controls[index] = value;
          }
        }, this);
      } else {
        slice.call(arguments).forEach(function(value, i) {
          var index = params.indices[i];
          var length = params.length[i];
          if (Array.isArray(value)) {
            value.forEach(function(value, i) {
              if (i < length) {
                if (typeof value === "number" && !isNaN(value)) {
                  this.controls[index + i] = value;
                }
              }
            }, this);
          } else if (typeof value === "number" && !isNaN(value)) {
            this.controls[index] = value;
          }
        }, this);
      }
    });
    
    Synth.prototype._process = function(inNumSamples) {
      if (this._running) {
        var unitList = this.unitList;
        for (var i = 0, imax = unitList.length; i < imax; ++i) {
          var unit = unitList[i];
          unit.process(unit.rate.bufLength);
        }
      }
      if (this.nextNode) {
        this.nextNode._process(inNumSamples);
      }
    };
    
    return Synth;
  })();
  
  var SynthDef = (function() {
    function SynthDef(func, args) {
      this.klassName = "SynthDef";
      var isVaridArgs = false;
      if (args) {
        if (/^[ a-zA-Z0-9_$,.=\-\[\]]+$/.test(args)) {
          args = unpackArguments(args);
          if (args) {
            isVaridArgs = args.vals.every(function(item) {
              if (typeof item === "number") {
                return true;
              } else if (Array.isArray(item)) {
                return item.every(function(item) {
                  return typeof item === "number";
                });
              }
              if (item === undefined || item === null) {
                return true;
              }
              return false;
            });
          }
        }
        if (!isVaridArgs) {
          throw "UgenGraphFunc's arguments should be a constant number or an array that contains it.";
        }
      } else {
        args = { keys:[], vals:[] };
      }
      
      var children = [];
      ugen.setSynthDef(function(ugen) {
        children.push(ugen);
      });
      
      var params  = { names:[], indices:[], length:[], values:[] };
      var flatten = [];
      var i, imax, length;
      for (i = 0, imax = args.vals.length; i < imax; ++i) {
        length = Array.isArray(args.vals[i]) ? args.vals[i].length : 1;
        params.names  .push(args.keys[i]);
        params.indices.push(flatten.length);
        params.length .push(length);
        params.values = params.values.concat(args.vals[i]);
        flatten = flatten.concat(args.vals[i]);
      }
      var reshaped = [];
      var controls = new ugen.Control(C.CONTROL).init(flatten);
      if (!Array.isArray(controls)) {
        controls = [ controls ];
      }
      var saved = controls.slice();
      for (i = 0; i < imax; ++i) {
        if (Array.isArray(args.vals[i])) {
          reshaped.push(saved.splice(0, args.vals[i].length));
        } else {
          reshaped.push(saved.shift());
        }
      }
      
      try {
        func.apply(null, reshaped);
      } catch (e) {
        throw e.toString();
      } finally {
        ugen.setSynthDef(null);
      }

      var consts = [];
      children.forEach(function(x) {
        if (x.inputs) {
          x.inputs.forEach(function(_in) {
            if (typeof _in === "number" && consts.indexOf(_in) === -1) {
              consts.push(_in);
            }
          });
        }
      });
      consts.sort();
      var ugenlist = topoSort(children).filter(function(x) {
        return !(typeof x === "number" || x instanceof ugen.OutputProxy);
      });
      var defs = ugenlist.map(function(x) {
        var inputs = [];
        if (x.inputs) {
          x.inputs.forEach(function(x) {
            var index = ugenlist.indexOf((x instanceof ugen.OutputProxy) ? x.inputs[0] : x);
            var subindex = (index !== -1) ? x.outputIndex : consts.indexOf(x);
            inputs.push(index, subindex);
          });
        }
        var outputs;
        if (x instanceof ugen.MultiOutUGen) {
          outputs = x.channels.map(function(x) {
            return x.rate;
          });
        } else if (x.numOfOutputs === 1) {
          outputs = [ x.rate ];
        } else {
          outputs = [];
        }
        return [ x.klassName, x.rate, x.specialIndex|0, inputs, outputs, x.tag ];
      });
      var specs = {
        consts: consts,
        defs  : defs,
        params: params,
      };
      this.specs = specs;
      return this;
    }
    
    SynthDef.prototype.play = fn(function() {
      var target, args, addAction;
      var i = 0;
      target = args;
      if (arguments[i] instanceof Node) {
        target = arguments[i++];
      } else {
        target = cc.server.rootNode;
      }
      if (utils.isDict(arguments[i])) {
        args = arguments[i++];
      }
      if (typeof arguments[i] === "string") {
        addAction = arguments[i];
      } else {
        addAction = "addToHead";
      }
      if (args && arguments.length === 1) {
        if (args.target instanceof Node) {
          target = args.target;
          delete args.target;
        }
        if (typeof args.addAction === "string") {
          addAction = args.addAction;
          delete args.addAction;
        }
      }
      switch (addAction) {
      case "addToHead":
        return SynthInterface.head(this, target, args);
      case "addToTail":
        return SynthInterface.tail(this, target, args);
      case "addBefore":
        return SynthInterface.before(this, target, args);
      case "addAfter":
        return SynthInterface.after(this, target, args);
      default:
        return SynthInterface.head(this, target, args);
      }
    }).multiCall().build();

    var topoSort = (function() {
      var _topoSort = function(x, list, checked) {
        checked.push(x);
        var index = list.indexOf(x);
        if (index !== -1) {
          list.splice(index, 1);
        }
        list.unshift(x);
        if (x.inputs) {
          x.inputs.forEach(function(x) {
            _topoSort(x, list, checked);
          });
        }
      };
      return function(list) {
        var checked = [];
        list.forEach(function(x) {
          if (x instanceof ugen.Out) {
            checked.push(x);
            x.inputs.forEach(function(x) {
              _topoSort(x, list, checked);
            });
          }
        });
        list = list.filter(function(x) {
          return checked.indexOf(x) !== -1;
        });
        return list;
      };
    })();
    
    var splitArguments = function(args) {
      var result  = [];
      var begin   = 0;
      var bracket = 0;
      var inStr   = null;
      for (var i = 0, imax = args.length; i < imax; ++i) {
        var c = args.charAt(i);
        if (args.charAt(i-1) === "\\") {
          if (args.charAt(i-2) !== "\\") {
            continue;
          }
        }
        if (c === "\"" || c === "'") {
          if (inStr === null) {
            inStr = c;
          } else if (inStr === c) {
            inStr = null;
          }
        }
        if (inStr) {
          continue;
        }
        switch (c) {
        case ",":
          if (bracket === 0) {
            result.push(args.slice(begin, i).trim());
            begin = i + 1;
          }
          break;
        case "[":
          bracket += 1;
          break;
        case "]":
          bracket -= 1;
          break;
        }
      }
      if (begin !== i) {
        result.push(args.slice(begin, i).trim());
      }
      return result;
    };
    
    var unpackArguments = function(args) {
      var keys = [];
      var vals = [];
      if (args) {
        try {
          splitArguments(args).forEach(function(items) {
            var i = items.indexOf("=");
            var k, v;
            if (i === -1) {
              k = items;
              v = undefined;
            } else {
              k = items.substr(0, i).trim();
              v = JSON.parse(items.substr(i + 1));
            }
            keys.push(k);
            vals.push(v);
          });
        } catch (e) {
          return;
        }
      }
      return { keys:keys, vals:vals };
    };
    
    return SynthDef;
  })();

  var GroupInterface = function() {
    return new Group();
  };
  GroupInterface.after = function(node) {
    node = node || cc.server.rootNode;
    if (!(node instanceof Node)) {
      throw new TypeError("Group.after: arguments[0] is not a Node.");
    }
    return new Group(node, C.ADD_AFTER);
  };
  GroupInterface.before = function(node) {
    node = node || cc.server.rootNode;
    if (!(node instanceof Node)) {
      throw new TypeError("Group.before: arguments[0] is not a Node.");
    }
    return new Group(node, C.ADD_BEFORE);
  };
  GroupInterface.head = function(node) {
    node = node || cc.server.rootNode;
    if (!(node instanceof Group)) {
      throw new TypeError("Group.head: arguments[0] is not a Group.");
    }
    return new Group(node, C.ADD_TO_HEAD);
  };
  GroupInterface.tail = function(node) {
    node = node || cc.server.rootNode;
    if (!(node instanceof Group)) {
      throw new TypeError("Group.tail: arguments[0] is not a Group.");
    }
    return new Group(node, C.ADD_TO_TAIL);
  };
  GroupInterface.replace = function(node) {
    if (!(node instanceof Node)) {
      throw new TypeError("Group.replace: arguments[0] is not a Node.");
    }
    return new Group(node, C.REPLACE);
  };
  
  var SynthInterface = function() {
    return new Synth();
  };
  SynthInterface.def = function(func, args) {
    if (typeof func !== "function") {
      throw new TypeError("Synth.def: arguments[0] is not a Function.");
    }
    return new SynthDef(func, args);
  };
  SynthInterface.after = function() {
    var node, def, args;
    if (arguments[0] instanceof SynthDef) {
      node = cc.server.rootNode;
      def  = arguments[0];
      args = arguments[1] || {};
    } else if (arguments[1] instanceof SynthDef) {
      node = arguments[0];
      def  = arguments[1];
      args = arguments[2] || {};
    }
    if (!(node instanceof Node)) {
      throw new TypeError("Synth.after: arguments[0] is not a Node.");
    }
    if (!(def instanceof SynthDef)) {
      throw new TypeError("Synth.after: arguments[1] is not a SynthDef.");
    }
    return new Synth(JSON.stringify(def.specs), node, args||{}, C.ADD_AFTER);
  };
  SynthInterface.before = function() {
    var node, def, args;
    if (arguments[0] instanceof SynthDef) {
      node = cc.server.rootNode;
      def  = arguments[0];
      args = arguments[1] || {};
    } else if (arguments[1] instanceof SynthDef) {
      node = arguments[0];
      def  = arguments[1];
      args = arguments[2] || {};
    }
    if (!(node instanceof Node)) {
      throw new TypeError("Synth.before: arguments[0] is not a Node.");
    }
    if (!(def instanceof SynthDef)) {
      throw new TypeError("Synth.before: arguments[1] is not a SynthDef.");
    }
    return new Synth(JSON.stringify(def.specs), node, args||{}, C.ADD_BEFORE);
  };
  SynthInterface.head = function() {
    var node, def, args;
    if (arguments[0] instanceof SynthDef) {
      node = cc.server.rootNode;
      def  = arguments[0];
      args = arguments[1] || {};
    } else if (arguments[1] instanceof SynthDef) {
      node = arguments[0];
      def  = arguments[1];
      args = arguments[2] || {};
    }
    if (!(node instanceof Group)) {
      throw new TypeError("Synth.head: arguments[0] is not a Group.");
    }
    if (!(def instanceof SynthDef)) {
      throw new TypeError("Synth.head: arguments[1] is not a SynthDef.");
    }
    return new Synth(JSON.stringify(def.specs), node, args||{}, C.ADD_TO_HEAD);
  };
  SynthInterface.tail = function() {
    var node, def, args;
    if (arguments[0] instanceof SynthDef) {
      node = cc.server.rootNode;
      def  = arguments[0];
      args = arguments[1] || {};
    } else if (arguments[1] instanceof SynthDef) {
      node = arguments[0];
      def  = arguments[1];
      args = arguments[2] || {};
    }
    if (!(node instanceof Group)) {
      throw new TypeError("Synth.tail: arguments[0] is not a Group.");
    }
    if (!(def instanceof SynthDef)) {
      throw new TypeError("Synth.tail: arguments[1] is not a SynthDef.");
    }
    return new Synth(JSON.stringify(def.specs), node, args||{}, C.ADD_TO_TAIL);
  };
  SynthInterface.replace = function(node, def, args) {
    if (!(node instanceof Node)) {
      throw new TypeError("Synth.replace: arguments[0] is not a Node.");
    }
    if (!(def instanceof SynthDef)) {
      throw new TypeError("Synth.replace: arguments[1] is not a SynthDef.");
    }
    return new Synth(JSON.stringify(def.specs), node, args||{}, C.REPLACE);
  };
  
  var install = function() {
    global.Group = GroupInterface;
    global.Synth = SynthInterface;
  };
  
  module.exports = {
    Node : Node,
    Group: Group,
    Synth: Synth,
    install: install,
  };

});
