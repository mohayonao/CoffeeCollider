define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var fn = require("./fn");
  var extend  = require("../common/extend");
  var emitter = require("../common/emitter");
  var ops = require("../common/ops");
  
  var Pattern = (function() {
    function Pattern() {
      emitter.mixin(this);
      this.klassName = "Pattern";
      this._blocking = true;
    }
    extend(Pattern, cc.Object);
    
    Pattern.prototype.next = function() {
      if (this._blocking) {
        this.emit("end");
      }
      return null;
    };
    Pattern.prototype.nextN = function(n, inVal) {
      var a = new Array(n);
      for (var i = 0; i < n; ++i) {
        a[i] = this.next(inVal);
      }
      return a;
    };
    Pattern.prototype.valueOf = function(item) {
      if (item instanceof Pattern) {
        return item.next();
      }
      return item;
    };
    Pattern.prototype.reset = function() {
      this._blocking = false;
    };
    Pattern.prototype.performWait = function() {
      return this._blocking;
    };

    ops.UNARY_OP_UGEN_MAP.forEach(function(selector) {
      if (/^[a-z][a-zA-Z0-9_]*/.test(selector)) {
        Pattern.prototype[selector] = function() {
          return new PUnaryOp(this, selector);
        };
      }
    });
    
    ops.BINARY_OP_UGEN_MAP.forEach(function(selector) {
      if (/^[a-z][a-zA-Z0-9_]*/.test(selector)) {
        Pattern.prototype[selector] = function(b) {
          return new PBinaryOp(this, selector, b);
        };
      }
    });
    
    return Pattern;
  })();
  
  var PSequence = (function() {
    function PSequence(list, repeats, offset) {
      if (!(Array.isArray(list) || list instanceof Pattern)) {
        throw new TypeError("PSequence: the first argument is invalid");
      }
      if (typeof repeats !== "number") {
        throw new TypeError("PSequence: the second argument must be a Number");
      }
      if (typeof offset !== "number") {
        throw new TypeError("PSequence: the third argument must be a Number");
      }
      Pattern.call(this);
      this.klassName = "PSequence";
      this.list    = list;
      this.repeats = repeats;
      this.offset  = offset;
      this._pos = 0;
    }
    extend(PSequence, Pattern);
    
    PSequence.prototype.next = function() {
      if (this._blocking) {
        if (this._pos < this.repeats * this.list.length) {
          var index = (this._pos + this.offset) % this.list.length;
          var item  = this.list[index];
          var value = this.valueOf(item);
          if (!(value === null || value === undefined)) {
            if (!(item instanceof Pattern)) {
              this._pos += 1;
            }
            return value;
          }
          if (item instanceof Pattern) {
            item.reset();
          }
          this._pos += 1;
          return this.next();
        } else {
          this.emit("end");
          this._blocking = false;
        }
      }
      return null;
    };
    PSequence.prototype.reset = function() {
      this._pos = 0;
      this._blocking = true;
      var list = this.list;
      for (var i = 0, imax = list.length; i < imax; ++i) {
        if (list[i] instanceof Pattern) {
          list[i].reset();
        }
      }
    };
    
    return PSequence;
  })();

  var PShuffle = (function() {
    function PShuffle(list, repeats) {
      if (!(Array.isArray(list) || list instanceof Pattern)) {
        throw new TypeError("PShuffle: the first argument is invalid");
      }
      if (typeof repeats !== "number") {
        throw new TypeError("PShuffle: the second argument must be a Number");
      }
      list.sort(shuffle);
      PSequence.call(this, list, repeats, 0);
      this.klassName = "PShuffle";
    }
    extend(PShuffle, PSequence);
    var shuffle = function() {
      return Math.random() - 0.5;
    };
    return PShuffle;
  })();

  var PUnaryOp = (function() {
    function PUnaryOp(pattern, selector) {
      if (!Number.prototype.hasOwnProperty(selector)) {
        throw new TypeError("PUnaryOp: operator '" + selector + "' not supported");
      }
      Pattern.call(this);
      this.klassName = "PUnaryOp";
      this.pattern   = pattern;
      this.selector  = selector;
    }
    extend(PUnaryOp, Pattern);
    
    PUnaryOp.prototype.next = function() {
      if (this._blocking) {
        var val = this.pattern.next();
        if (val === null || val === undefined) {
          this.emit("end");
          this._blocking = false;
        } else {
          return val[this.selector].call(val);
        }
      }
      return null;
    };
    
    return PUnaryOp;
  })();

  var PBinaryOp = (function() {
    function PBinaryOp(pattern, selector, b) {
      if (!Number.prototype.hasOwnProperty(selector)) {
        throw new TypeError("PBinaryOp: operator '" + selector + "' not supported");
      }
      Pattern.call(this);
      this.klassName = "PBinaryOp";
      this.pattern   = pattern;
      this.selector  = selector;
      this.b = b;
    }
    extend(PBinaryOp, Pattern);
    
    PBinaryOp.prototype.next = function() {
      if (this._blocking) {
        var val = this.pattern.next();
        if (val === null || val === undefined) {
          this.emit("end");
          this._blocking = false;
        } else {
          return val[this.selector].call(val, this.b);
        }
      }
      return null;
    };
    
    return PBinaryOp;
  })();

  cc.global.PSequence = fn(function(list, repeats, offset) {
    return cc.createPSequence(list, repeats, offset);
  }).defaults("list,repeats=1,offset=0").build();
  cc.global.PShuffle = fn(function(list, repeats) {
    return cc.createPShuffle(list, repeats);
  }).defaults("list,repeats=1").build();
  
  module.exports = {
    Pattern  : Pattern,
    PSequence: PSequence,
    PShuffle : PShuffle,
    PUnaryOp : PUnaryOp,
    PBinaryOp: PBinaryOp,
    
    use: function() {
      cc.createPSequence = function(list, repeats, offset) {
        return new PSequence(list, repeats, offset);
      };
      cc.createPShuffle = function(list, repeats) {
        return new PShuffle(list, repeats);
      };
    }
  };

});
