define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var fn = require("./fn");
  var utils  = require("./utils");
  var ugen   = require("./ugen/ugen");
  var Unit   = require("./unit/unit").Unit;
  var FixNum = require("./unit/unit").FixNum;
  var slice = [].slice;

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
    Node.prototype.play = fn.sync(function() {
      this.running = true;
    });
    Node.prototype.pause = fn.sync(function() {
      this.running = false;
    });
    Node.prototype.stop = fn.sync(function() {
      this.remove();
    });
    
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
      if (specs) {
        build.call(this, specs, target, args, addAction);
      }
    }
    fn.extend(Synth, Node);
    
    var build = function(specs, target, args, addAction) {
      this.specs = specs = JSON.parse(specs);

      var that = this;
      var timeline = cc.server.timeline;
      timeline.push(function() {
        target.append(that, addAction);
      });
      
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
  
  var SynthDefInterface = (function() {
    function SynthDefInterface() {
    }
    SynthDefInterface.prototype.$def = function(func) {
      if (typeof func === "function") {
        var instance = new SynthDef();
        instance.initialize.apply(instance, arguments);
        return instance;
      }
      throw "Synth.def() requires a function.";
    };
    fn.classmethod(SynthDefInterface);
    return SynthDefInterface;
  })();
  
  var SynthDef = (function() {
    function SynthDef() {
      this.klassName = "SynthDef";
    }
    SynthDef.prototype.initialize = function(func, args) {
      var isVaridArgs = false;
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
      var controls = ugen.Control.kr(flatten);
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
      
      var children = [];
      ugen.setSynthDef(function(ugen) {
        children.push(ugen);
      });
      
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
        return [ x.klassName, x.rate, x.specialIndex|0, inputs, outputs ];
      });
      var specs = {
        consts: consts,
        defs  : defs,
        params: params,
      };
      this.specs = specs;
      return this;
    };
    
    SynthDef.prototype.play = fn(function(running) {
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
      case "addToHead": case "addToTail": case "addBefore": case "addAfter":
        break;
      default:
        addAction = "addToHead";
      }
      var synth = new Synth(JSON.stringify(this.specs), target, args, addAction);
      if (running === undefined) {
        running = true;
      }
      synth.running = !!running;
      return synth;
    }).multiCall().build();

    var topoSort = (function() {
      var _topoSort = function(x, list) {
        var index = list.indexOf(x);
        if (index !== -1) {
          list.splice(index, 1);
        }
        list.unshift(x);
        if (x.inputs) {
          x.inputs.forEach(function(x) {
            _topoSort(x, list);
          });
        }
      };
      return function(list) {
        list.forEach(function(x) {
          if (x instanceof ugen.Out) {
            x.inputs.forEach(function(x) {
              _topoSort(x, list);
            });
          }
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
  
  var install = function(register) {
    register("Synth", SynthDefInterface);
  };
  
  module.exports = {
    Node : Node,
    Group: Group,
    Synth: Synth,
    install: install,
  };

});
