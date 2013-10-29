define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var fn = require("./fn");
  var extend = require("../common/extend");
  var utils = require("./utils");
  var ugen  = require("./ugen/ugen");
  var emitter = require("../common/emitter");

  var nodes = {};
  
  var Node = (function() {
    var nodeId = 0;
    function Node() {
      emitter.mixin(this);
      this.klassName = "Node";
      this.blocking  = true;
      this.nodeId    = nodeId++;
      nodes[this.nodeId] = this;
    }
    extend(Node, cc.Object);
    Node.prototype.play = fn.sync(function() {
      cc.client.pushToTimeline([
        "/n_run", this.nodeId, true
      ]);
      return this;
    });
    Node.prototype.pause = fn.sync(function() {
      cc.client.pushToTimeline([
        "/n_run", this.nodeId, false
      ]);
      return this;
    });
    Node.prototype.stop = fn.sync(function() {
      cc.client.pushToTimeline([
        "/n_free", this.nodeId
      ]);
      this.blocking = false;
      return this;
    });
    return Node;
  })();

  var Group = (function() {
    function Group(target, addAction) {
      Node.call(this);
      this.klassName = "Group";
      if (target) {
        var that = this;
        var timeline = cc.client.timeline;
        timeline.push(function() {
          cc.client.pushToTimeline([
            "/g_new", that.nodeId, addAction, target.nodeId
          ]);
        });
      }
    }
    extend(Group, Node);
    
    return Group;
  })();
  
  var Synth = (function() {
    function Synth(target, addAction, def, args) {
      Node.call(this);
      this.klassName = "Synth";
      this.params = def.specs.params;
      if (target) {
        var that = this;
        var timeline = cc.client.timeline;
        var controls = args2controls(args, this.params);
        timeline.push(function() {
          cc.client.pushToTimeline([
            "/s_new", that.nodeId, addAction, target.nodeId, def._defId, controls
          ]);
        });
      }
    }
    extend(Synth, Node);

    var args2controls = function(args, params) {
      var controls = [];
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

    Synth.prototype._set = function(args) {
      var controls = args2controls(args, this.params);
      if (controls.length) {
        cc.client.pushToTimeline([
          "/n_set", this.nodeId, controls
        ]);
      }
    };
    
    Synth.prototype.set = fn.sync(Synth.prototype._set);
    
    return Synth;
  })();

  var SynthDef = (function() {
    var defId = 0;
    function SynthDef(func, args) {
      this.klassName = "SynthDef";
      this._defId = defId++;
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
      // console.log(children);
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
      // console.log(ugenlist);
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
      // console.log(specs);
      cc.client.pushToTimeline([
        "/s_def", this._defId, JSON.stringify(specs)
      ]);
      return this;
    }
    
    SynthDef.prototype.play = fn(function() {
      var target, args, addAction;
      var i = 0;
      if (arguments[i] instanceof Node) {
        target = arguments[i++];
      } else {
        target = cc.client.rootNode;
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
        return SynthInterface.head(target, this, args);
      case "addToTail":
        return SynthInterface.tail(target, this, args);
      case "addBefore":
        return SynthInterface.before(target, this, args);
      case "addAfter":
        return SynthInterface.after(target, this, args);
      default:
        return SynthInterface.head(target, this, args);
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
        list.slice().forEach(function(x) {
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
    node = node || cc.client.rootNode;
    if (!(node instanceof Node)) {
      throw new TypeError("Group.after: arguments[0] is not a Node.");
    }
    return new Group(node, C.ADD_AFTER);
  };
  GroupInterface.before = function(node) {
    node = node || cc.client.rootNode;
    if (!(node instanceof Node)) {
      throw new TypeError("Group.before: arguments[0] is not a Node.");
    }
    return new Group(node, C.ADD_BEFORE);
  };
  GroupInterface.head = function(node) {
    node = node || cc.client.rootNode;
    if (!(node instanceof Group)) {
      throw new TypeError("Group.head: arguments[0] is not a Group.");
    }
    return new Group(node, C.ADD_TO_HEAD);
  };
  GroupInterface.tail = function(node) {
    node = node || cc.client.rootNode;
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
      node = cc.client.rootNode;
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
    return new Synth(node, C.ADD_AFTER, def, args);
  };
  SynthInterface.before = function() {
    var node, def, args;
    if (arguments[0] instanceof SynthDef) {
      node = cc.client.rootNode;
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
    return new Synth(node, C.ADD_BEFORE, def, args);
  };
  SynthInterface.head = function() {
    var node, def, args;
    if (arguments[0] instanceof SynthDef) {
      node = cc.client.rootNode;
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
    return new Synth(node, C.ADD_TO_HEAD, def, args);
  };
  SynthInterface.tail = function() {
    var node, def, args;
    if (arguments[0] instanceof SynthDef) {
      node = cc.client.rootNode;
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
    return new Synth(node, C.ADD_TO_TAIL, def, args);
  };
  SynthInterface.replace = function(node, def, args) {
    if (!(node instanceof Node)) {
      throw new TypeError("Synth.replace: arguments[0] is not a Node.");
    }
    if (!(def instanceof SynthDef)) {
      throw new TypeError("Synth.replace: arguments[1] is not a SynthDef.");
    }
    return new Synth(node, C.REPLACE, def, args);
  };
  
  var reset = function() {
    nodes = {};
  };

  var get = function(nodeId) {
    return nodes[nodeId];
  };
  
  var install = function() {
    cc.createGroup = function(target, addAction) {
      return new Group(target, addAction);
    };
    cc.getNode   = get;
    cc.resetNode = reset;
  };

  exports = function() {
    global.Group = GroupInterface;
    global.Synth = SynthInterface;
  };
  
  module.exports = {
    Node : Node,
    Group: Group,
    Synth: Synth,
    install: install,
    exports: exports,
  };

});
