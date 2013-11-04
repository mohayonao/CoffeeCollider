define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var utils = require("./utils");
  var ops   = require("../common/ops");
  var slice = [].slice;
  
  var fn = (function() {
    function Fn(func) {
      this.func  = func;
      this.def   = null;
      this.multi = false;
    }
    Fn.prototype.defaults = function(def) {
      this.def = def;
      return this;
    };
    Fn.prototype.multiCall = function(flag) {
      this.multi = flag === undefined ? true : !!flag;
      return this;
    };
    Fn.prototype.build = function() {
      var func = this.func;
      var keys = [];
      var vals = [];
      if (this.def) {
        this.def.split(",").forEach(function(items) {
          items = items.trim().split("=");
          keys.push( items[0].trim());
          if (items.length === 2) {
            vals.push(JSON.parse(items[1]));
          } else {
            vals.push(undefined);
          }
        });
      }
      var ret = func;
      if (this.multi) {
        if (this.def) {
          ret = function() {
            var args = slice.call(arguments);
            args = resolve_args(keys, vals, slice.call(arguments));
            if (containsArray(args)) {
              return utils.flop(args).map(function(items) {
                return func.apply(this, items);
              }, this);
            }
            return func.apply(this, args);
          };
        } else {
          ret = function() {
            var args = slice.call(arguments);
            if (containsArray(args)) {
              return utils.flop(args).map(function(items) {
                return func.apply(this, items);
              }, this);
            }
            return func.apply(this, args);
          };
        }
      } else if (this.def) {
        ret = function() {
          var args = slice.call(arguments);
          args = resolve_args(keys, vals, slice.call(arguments));
          return func.apply(this, args);
        };
      }
      return ret;
    };
    var containsArray = function(list) {
      for (var i = 0, imax = list.length; i < imax; ++i) {
        if (Array.isArray(list[i])) {
          return true;
        }
      }
      return false;
    };
    var resolve_args = function(keys, vals, given) {
      var dict;
      var args = vals.slice();
      if (utils.isDict(given[given.length - 1])) {
        dict = given.pop();
        Object.keys(dict).forEach(function(key) {
          var index = keys.indexOf(key);
          if (index !== -1) {
            args[index] = dict[key];
          }
        });
      }
      for (var i = 0, imax = Math.min(given.length, args.length); i < imax; ++i) {
        args[i] = given[i];
      }
      if (dict && keys.length <= args.length) {
        if (utils.isDict(vals[vals.length - 1])) {
          args.splice(args.length-1, 1, dict);
        }
      }
      return args;
    };
    return function(func) {
      return new Fn(func);
    };
  })();
  
  fn.sync = function(func) {
    return function() {
      cc.timeline.push(this, func, slice.call(arguments));
      return this;
    };
  };

  fn.definePrototypeProperty = function(Klass, key, func) {
    Object.defineProperty(Klass.prototype, key, {
      configurable: true,
      enumerable  : false,
      writable    : true,
      value       : func
    });
  };
  
  fn.setupBinaryOp = function(Klass, selector, func) {
    var ugenSelector;
    if (ops.UGEN_OP_ALIASES.hasOwnProperty(selector)) {
      ugenSelector = ops.UGEN_OP_ALIASES[selector];
    } else {
      ugenSelector = selector;
    }
    fn.definePrototypeProperty(Klass, selector, function(b) {
      var a = this;
      if (Array.isArray(b)) {
        return b.map(function(b) {
          return a[selector](b);
        });
      } else if (cc.instanceOfUGen(b)) {
        return cc.createBinaryOpUGen(ugenSelector, a, b);
      }
      return func.call(a, b);
    });
  };
  
  module.exports = fn;

});
