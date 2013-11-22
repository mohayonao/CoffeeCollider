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
      this.multi = 0;
    }
    Fn.prototype.defaults = function(def) {
      this.def = def;
      return this;
    };
    Fn.prototype.multiCall = function(num) {
      this.multi = num === undefined ? Infinity : num;
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
      var multi = this.multi;
      if (multi === Infinity) {
        if (this.def) {
          ret = function() {
            var args = slice.call(arguments);
            args = resolve_args(keys, vals, slice.call(arguments));
            if (containsArray(args)) {
              return utils.flop(args).map(function(items) {
                return ret.apply(this, items);
              }, this);
            }
            return func.apply(this, args);
          };
        } else {
          ret = function() {
            var args = slice.call(arguments);
            if (containsArray(args)) {
              return utils.flop(args).map(function(items) {
                return ret.apply(this, items);
              }, this);
            }
            return func.apply(this, args);
          };
        }
      } else if (multi > 0) {
        if (this.def) {
          ret = function() {
            var args = slice.call(arguments);
            args = resolve_args(keys, vals, slice.call(arguments));
            var args0 = slice.call(args, 0, multi);
            if (containsArray(args0)) {
              var args1 = slice.call(args, multi);
              return utils.flop(args0).map(function(items) {
                return ret.apply(this, items.concat(args1));
              }, this);
            }
            return func.apply(this, args);
          };
        } else {
          ret = function() {
            var args0 = slice.call(arguments, 0, multi);
            
            if (containsArray(args0)) {
              var args1 = slice.call(arguments, multi);
              return utils.flop(args0).map(function(items) {
                return ret.apply(this, items.concat(args1));
              }, this);
            }
            return func.apply(this, arguments);
          };
        }
      } else if (multi < 0) {
        if (this.def) {
          ret = function() {
            var args = slice.call(arguments);
            args = resolve_args(keys, vals, slice.call(arguments));
            var args1 = slice.call(args, multi);
            if (containsArray(args1)) {
              var args0 = slice.call(args, 0, multi);
              return utils.flop(args1).map(function(items) {
                return ret.apply(this, args0.concat(items));
              }, this);
            }
            return func.apply(this, args);
          };
        } else {
          ret = function() {
            var args1 = slice.call(arguments, multi);
            if (containsArray(args1)) {
              var args0 = slice.call(arguments, 0, multi);
              return utils.flop(args1).map(function(items) {
                return ret.apply(this, args0.concat(items));
              }, this);
            }
            return func.apply(this, arguments);
          };
        }
      } else if (this.def) {
        ret = function() {
          return func.apply(this, resolve_args(keys, vals, slice.call(arguments)));
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
