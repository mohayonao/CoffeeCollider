define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var utils  = require("./utils");
  var extend = require("../common/extend");
  var push = [].push;
  
  var defId = 0;
  
  var SynthDef = (function() {
    function SynthDef(name) {
      this.klassName = "SynthDef";
      this.name = name;
      this._sent = false;
      this._defId = defId++;
      this._children = [];
      this._args = [];
      this.specs = {};
    }
    extend(SynthDef, cc.Object);
    
    SynthDef.prototype.send = function() {
      if (!this._sent) {
        var consts = this.specs.consts;
        if (consts[0] === -Infinity) {
          consts[0] = "-Infinity";
        }
        if (consts[consts.length-1] === Infinity) {
          consts[consts.length-1] = "Infinity";
        }
        cc.lang.pushToTimeline([
          "/s_def", this._defId, JSON.stringify(this.specs)
        ]);
        this._sent = true;
      }
      return this;
    };

    SynthDef.prototype.play = function() {
      this.send();
      
      var list = getSynthDefPlayArguments.apply(null, arguments);
      var target = list[0];
      var args   = list[1];
      var addAction = list[2];
      switch (addAction) {
      case "addToHead":
        return cc.global.Synth(this, args, target, C.ADD_TO_HEAD);
      case "addToTail":
        return cc.global.Synth(this, args, target, C.ADD_TO_TAIL);
      case "addBefore":
        return cc.global.Synth(this, args, target, C.ADD_BEFORE);
      case "addAfter":
        return cc.global.Synth(this, args, target, C.ADD_AFTER);
      default:
        return cc.global.Synth(this, args, target, C.ADD_TO_HEAD);
      }
    };
    
    return SynthDef;
  })();
  
  var getSynthDefPlayArguments = function() {
    var target, args, addAction;
    var i = 0;
    if (cc.instanceOfNode(arguments[i])) {
      target = arguments[i++];
    } else {
      target = cc.lang.rootNode;
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
      if (cc.instanceOfNode(args.target)) {
        target = args.target;
        delete args.target;
      }
      if (typeof args.addAction === "string") {
        addAction = args.addAction;
        delete args.addAction;
      }
    }
    return [target, args, addAction];
  };
  
  var build = function(that, func, args, rates, prependArgs, variants) {
    try {
      initBuild(that);
      buildUGenGraph(that, func, args, rates, prependArgs);
      finishBuild(that, variants);
      that.func = func;
    } finally {
      cc.setSynthDef(null);
    }
  };
  
  var initBuild = function(that) {
    var children = that._children = [];
    cc.setSynthDef(function(ugen) {
      children.push(ugen);
    });
    that._args = [];
  };
  var buildUGenGraph = function(that, func, args, rates, prependArgs) {
    var controls = args2controls(args, rates, prependArgs.length);
    push.apply(that._args, controls);
    args = prependArgs.concat(controls2args(controls));
    return func.apply(null, args);
  };
  var finishBuild = function(that) {
    cc.setSynthDef(null);
    that.specs = asJSON(that.name, that._args, that._children);
  };
  
  var asNumber = function(val) {
    if (Array.isArray(val)) {
      return val.map(asNumber);
    }
    return +val;
  };
  
  var args2controls = function(args, rates, skipArgs) {
    if (args.length === 0) {
      return [];
    }
    var keyValues = args2keyValues(args);
    var keys = keyValues.keys.slice(skipArgs);
    var vals = keyValues.vals.slice(skipArgs).map(asNumber);
    
    checkValidArgs(vals);
    
    return keyValueRates2args(keys, vals, rates);
  };
  
  var args2keyValues = function(args) {
    var keys = [], vals = [];
    if (args && args.length) {
      for (var i = 0, imax = args.length; i < imax; i += 2) {
        keys.push(args[i+0]);
        vals.push(args[i+1]);
      }
    }
    return { keys:keys, vals:vals };
  };
  
  var checkNumber = function(val) {
    return typeof val === "number" && !isNaN(val);
  };
  
  var checkValidArgs = function(vals) {
    for (var i = 0, imax = vals.length; i < imax; ++i) {
      var val = vals[i];
      if (val === null || val === undefined) {
        continue;
      }
      if (checkNumber(val) || (Array.isArray(val) && val.every(checkNumber))) {
        continue;
      }
      throw "bad arguments";
    }
    return true;
  };
  
  var IR = 0, TR = 1, KR = 2, AR = 3;
  
  var keyValueRates2args = function(keys, vals, rates) {
    var args = [];
    for (var i = 0, imax = keys.length; i < imax; ++i) {
      var key   = keys[i];
      var value = vals[i];
      var rate  = rates[i];
      var keyAt01 = key.substr(0, 2);
      args[i] = { index:i, name:key, value:value, lag:0 };
      if (rate === "ir" || keyAt01 === "i_") {
        args[i].type = IR;
      } else if (rate === "tr" || key === "trig" || keyAt01 === "t_") {
        args[i].type = TR;
      } else if (rate === "ar" || keyAt01 === "a_") {
        args[i].type = AR;
      } else {
        rate = utils.asNumber(rate);
        args[i].type = KR;
        args[i].lag  = rate;
      }
    }
    return args;
  };

  var getValue = function(items) {
    return items.value;
  };
  
  var controls2args = function(controls) {
    var args = new Array(controls.length);
    var values, lags, lagFlag, controlUGens;
    var controlNames = [];
    var irControlNames = controlNames[IR] = [];
    var trControlNames = controlNames[TR] = [];
    var arControlNames = controlNames[AR] = [];
    var krControlNames = controlNames[KR] = [];
    controls.forEach(function(cn) {
      controlNames[cn.type].push(cn);
    });
    var setToArgs = function(cn, index) {
      args[cn.index] = controlUGens[index];
    };
    if (irControlNames.length) {
      values = irControlNames.map(getValue);
      controlUGens = cc.createScalarControl().init(utils.flatten(values));
      controlUGens = reshape(values, utils.asArray(controlUGens));
      irControlNames.forEach(setToArgs);
    }
    if (trControlNames.length) {
      values = trControlNames.map(getValue);
      controlUGens = cc.createTriggerControl().init(utils.flatten(values));
      controlUGens = reshape(values, utils.asArray(controlUGens));
      trControlNames.forEach(setToArgs);
    }
    if (arControlNames.length) {
      values = arControlNames.map(getValue);
      controlUGens = cc.createAudioControl().init(utils.flatten(values));
      controlUGens = reshape(values, utils.asArray(controlUGens));
      arControlNames.forEach(setToArgs);
    }
    if (krControlNames.length) {
      values = []; lags = []; lagFlag = false;
      krControlNames.forEach(function(cn) {
        values.push(cn.value);
        utils.asArray(cn.value).forEach(function() { lags.push(cn.lag); });
        if (cn.lag !== 0) { lagFlag = true; }
      });
      if (lagFlag) {
        controlUGens = cc.createLagControl().init(utils.flatten(values), lags);
      } else {
        controlUGens = cc.createControl().init(utils.flatten(values));
      }
      controlUGens = reshape(values, utils.asArray(controlUGens));
      krControlNames.forEach(setToArgs);
    }
    return args;
  };
  
  var reshape = function(shape, flatten) {
    var result = [];
    var saved = flatten.slice();
    for (var i = 0, imax = shape.length; i < imax; ++i) {
      if (Array.isArray(shape[i])) {
        result.push(saved.splice(0, shape[i].length));
      } else {
        result.push(saved.shift());
      }
    }
    return result;
  };

  var sort = function(a, b) {
    return (a.type - b.type) || (a.index - b.index);
  };

  var filterUGen = function(ugen) {
    return !(typeof ugen === "number" || cc.instanceOfOutputProxy(ugen));
  };
  
  var getRate = function(ugen) {
    return ugen.rate;
  };
  
  var asJSON = function(name, args, children) {
    var sortedArgs = args.slice().sort(sort);
    
    var param = {};
    var sortedIndex = 0;
    var values  = param.values  = [];
    var names   = param.names   = [];
    var indices = param.indices = [];
    var length  = param.length  = [];
    sortedArgs.forEach(function(cn) {
      cn.sortedIndex = sortedIndex;
      if (Array.isArray(cn.value)) {
        push.apply(values, cn.value);
        cn.length = cn.value.length;
      } else {
        values.push(cn.value);
        cn.length = 1;
      }
      sortedIndex += cn.length;
    });
    args.forEach(function(cn) {
      names  .push(cn.name);
      indices.push(cn.sortedIndex);
      length .push(cn.length);
    });
    var consts = [];
    children.forEach(function(ugen) {
      ugen.inputs.forEach(function(x) {
        if (typeof x === "number" && consts.indexOf(x) === -1) {
          consts.push(x);
        }
      });
    });
    consts.sort();
    
    var ugenList = topoSort(children).filter(filterUGen);
    var specialIndex = 0;
    var defList = ugenList.map(function(ugen) {
      var inputs = [];
      ugen.inputs.forEach(function(x) {
        var index = ugenList.indexOf(cc.instanceOfOutputProxy(x) ? x.inputs[0] : x);
        var subindex = (index !== -1) ? x.outputIndex : consts.indexOf(x);
        inputs.push(index, subindex);
      });
      var outputs = [];
      if (ugen.channels) {
        if (cc.instanceOfControlUGen(ugen)) {
          ugen.specialIndex = specialIndex;
          specialIndex += ugen.channels.length;
        }
        outputs = ugen.channels.map(getRate);
      } else if (ugen.numOfOutputs === 1) {
        outputs = [ ugen.rate ];
      }
      return [ ugen.klassName, ugen.rate, ugen.specialIndex|0, inputs, outputs ];
    });
    return { name:name, consts:consts, params:param, defList:defList, variants:{} };
  };
  
  var topoSort = (function() {
    var _topoSort = function(x, list, checked, stack) {
      if (stack.indexOf(x) !== stack.length-1) {
        throw new Error("UGen graph contains recursion.");
      }
      checked.push(x);
      var index = list.indexOf(x);
      if (index !== -1) {
        list.splice(index, 1);
      }
      list.unshift(x);
      if (x.inputs) {
        x.inputs.forEach(function(x) {
          stack.push(x);
          _topoSort(x, list, checked, stack);
          stack.pop();
        });
      }
    };
    return function(list) {
      var checked = [];
      var stack;
      list.slice().forEach(function(x) {
        if (cc.instanceOfOut(x)) {
          checked.push(x);
          stack = [x];
          x.inputs.forEach(function(x) {
            stack.push(x);
            _topoSort(x, list, checked, stack);
            stack.pop();
          });
        }
      });
      list = list.filter(function(x) {
        return checked.indexOf(x) !== -1;
      });
      return list;
    };
  })();
  
  cc.global.SynthDef = function() {
    var name, func, args, rates, prependArgs, variants;
    var i = 0;
    if (typeof arguments[i] === "string") {
      name = arguments[i++];
    } else {
      name = "synth";
    }
    if (typeof arguments[i] !== "function") {
      throw new Error("SynthDef requires build function");
    }
    func = arguments[i++];
    
    args        = utils.asArray(arguments[i++]);
    rates       = utils.asArray(arguments[i++]);
    prependArgs = utils.asArray(arguments[i++]);
    variants    = {};
    
    var instance = new SynthDef(name, func, args, rates, prependArgs, variants);
    build(instance, func, args, rates, prependArgs, variants);
    return instance;
  };
  cc.instanceOfSynthDef = function(obj) {
    return obj instanceof SynthDef;
  };
  
  module.exports = {
    SynthDef: SynthDef,
    
    build: build,
    
    initBuild     : initBuild,
    buildUGenGraph: buildUGenGraph,
    finishBuild   : finishBuild,
    
    args2keyValues    : args2keyValues,
    args2controls     : args2controls,
    checkValidArgs    : checkValidArgs,
    keyValueRates2args: keyValueRates2args,
    
    controls2args: controls2args,
    
    asJSON: asJSON,
    
    reshape : reshape,
    topoSort: topoSort,
  };

});
