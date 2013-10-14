define(function(require, exports, module) {
  "use strict";

  var cc    = require("../cc");
  var fn    = require("../fn");
  var ugen  = require("./ugen");
  var Node  = require("../node").Node;
  var Synth = require("../node").Synth;
  
  var SynthDef = (function() {
    function SynthDef() {
      this.klassName = "SynthDef";
    }
    SynthDef.prototype.initialize = function(func, args) {
      args = unpackArguments(args);
      
      var isVaridArgs = args.vals.every(function(item) {
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
      if (!isVaridArgs) {
        throw "UgenGraphFunc's arguments should be a number or an array that contains a number.";
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
      for (i = 0; i < imax; ++i) {
        if (Array.isArray(args.vals[i])) {
          reshaped.push(controls.slice(0, args.vals[i].length));
        } else {
          reshaped.push(controls.shift());
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
    };

    SynthDef.prototype.play = fn(function() {
      var target, args, addAction;
      var i = 0;
      target = args;
      if (arguments[i] instanceof Node) {
        target = arguments[i++];
      } else {
        target = cc.server.rootNode;
      }
      if (fn.isDictionary(arguments[i])) {
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
      return new Synth(JSON.stringify(this.specs), target, args, addAction);
    }).multicall().build();

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
    
    return SynthDef;
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
      splitArguments(args).forEach(function(items) {
        var i = items.indexOf("=");
        var k, v;
        if (i === -1) {
          k = items;
          v = undefined;
        } else {
          k = items.substr(0, i).trim();
          v = eval.call(null, items.substr(i + 1));
        }
        keys.push(k);
        vals.push(v);
      });
    }
    return { keys:keys, vals:vals };
  };

  var install = function(namespace) {
    namespace.register("def", function(func) {
      if (typeof func === "function") {
        var instance = new SynthDef();
        instance.initialize.apply(instance, arguments);
        return instance;
      }
      throw "def() requires a function.";
    });
  };

  module.exports = {
    splitArguments : splitArguments ,
    unpackArguments: unpackArguments,
    install: install
  };

});
