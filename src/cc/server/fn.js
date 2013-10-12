define(function(require, exports, module) {
  "use strict";

  var array = require("./array.impl");
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
    Fn.prototype.multicall = function(flag) {
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
          vals.push(items.length > 1 ? +items[1].trim() : undefined);
        });
      }
      var ret = func;
      if (this.multi) {
        if (this.def) {
          ret = function() {
            var args = slice.call(arguments);
            args = resolve_args(keys, vals, slice.call(arguments));
            if (containsArray(args)) {
              return array.zip.apply(null, args).map(function(items) {
                return func.apply(this, items);
              }, this);
            }
            return func.apply(this, args);
          };
        } else {
          ret = function() {
            var args = slice.call(arguments);
            if (containsArray(args)) {
              return array.zip.apply(null, args).map(function(items) {
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
      if (fn.isDictionary(given[given.length - 1])) {
        dict = given.pop();
        for (var key in dict) {
          var index = keys.indexOf(key);
          if (index !== -1) {
            args[index] = dict[key];
          }
        }
      }
      for (var i = 0, imax = Math.min(given.length, args.length); i < imax; ++i) {
        args[i] = given[i];
      }
      if (dict && args.length < keys.length - 1) {
        args.push(dict);
      }
      return args;
    };
    return function(func) {
      return new Fn(func);
    };
  })();
  
  var copy = function(obj) {
    var ret = {};
    Object.keys(obj).forEach(function(key) {
      ret[key] = obj[key];
    });
    return ret;
  };
  
  fn.extend = function(child, parent) {
    for (var key in parent) {
      if (parent.hasOwnProperty(key)) {
        if (key === "classmethods") {
          child[key] = copy(parent[key]);
        } else {
          child[key] = parent[key];
        }
      }
    }
    /*jshint validthis:true */
    function ctor() {
      this.constructor = child;
    }
    /*jshint validthis:false */
    ctor.prototype = parent.prototype;
    /*jshint newcap:false */
    child.prototype = new ctor();
    /*jshint newcap:true */
    child.__super__ = parent.prototype;
    return child;
  };

  fn.classmethod = (function() {
    var _classmethod = function(Klass, func) {
      return function() {
        if (this instanceof Klass) {
          return func.apply(this, arguments);
        } else {
          return func.apply(new Klass(), arguments);
        }
      };
    };
    return function(child) {
      var classmethods = child.classmethods || {};
      Object.keys(child.prototype).forEach(function(key) {
        if (key.charAt(0) === "$" && typeof child.prototype[key] === "function") {
          classmethods[key] = child.prototype[key];
          delete child.prototype[key];
        }
      });
      Object.keys(classmethods).forEach(function(key) {
        var func = classmethods[key];
        key = key.substr(1);
        child[key] = _classmethod(child, func);
        child.prototype[key] = func;
      });
      child.classmethods = classmethods;
    };
  })();
  
  fn.isDictionary = function(obj) {
    return !!(obj && obj.constructor === Object);
  };

  var C = fn.constant = {};

  C.SCALAR  = 0;
  C.CONTROL = 1;
  C.AUDIO   = 2;

  C.UNIPOLAR = 1;
  C.BIPOLAR  = 2;

  C.UNARY_OP_UGEN_MAP = "num neg not tilde".split(" ");
  C.BINARY_OP_UGEN_MAP = "+ - * / %".split(" ");

  module.exports = fn;

});
