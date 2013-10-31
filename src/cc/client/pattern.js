define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var fn = require("./fn");
  var extend  = require("../common/extend");
  var emitter = require("../common/emitter");
  
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
  
  
  module.exports = {
    Pattern  : Pattern,
    PSequence: PSequence,
    
    use: function() {
      cc.createPSequence = function(list, repeats, offset) {
        return new PSequence(list, repeats, offset);
      };
    },
    exports: function() {
      global.PSequence = fn(function(list, repeats, offset) {
        return cc.createPSequence(list, repeats, offset);
      }).defaults("list,repeats=1,offset=0").build();
    }
  };

});
