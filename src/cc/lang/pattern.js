define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var fn = require("./fn");
  var extend  = require("../common/extend");
  var ops = require("../common/ops");
  var utils = require("./utils");
  
  var isNotNull = function(obj) {
    return obj !== null && obj !== undefined;
  };
  var valueOf = function(item) {
    if (item instanceof Pattern) {
      return item.next();
    }
    return item;
  };
  
  var Pattern = (function() {
    function Pattern() {
      this.klassName = "Pattern";
      this._finished = false;
    }
    extend(Pattern, cc.Object);

    Pattern.prototype.clone = function() {
      return this;
    };
    Pattern.prototype.next = function() {
      return null;
    };
    Pattern.prototype.nextN = function(n, inVal) {
      var a = new Array(n);
      for (var i = 0; i < n; ++i) {
        a[i] = this.next(inVal);
      }
      return a;
    };
    Pattern.prototype.reset = function() {
      return this;
    };
    Pattern.prototype.performWait = function() {
      return !this._finished;
    };
    Pattern.prototype.concat = function(item) {
      return new Pseq([this, item.clone()], 1);
    };

    Pattern.prototype["do"] = function(func) {
      var i = 0, val = true;
      if (cc.instanceOfSyncBlock(func)) {
        if (cc.currentSyncBlockHandler) {
          cc.currentSyncBlockHandler.__sync__(func, cc.createTaskArgumentsPattern(this));
        } else {
          while (val) {
            val = this.next();
            if (isNotNull(val)) {
              func.clone().perform([val, i++]);
            }
          }
        }
      } else {
        while (val) {
          val = this.next();
          if (isNotNull(val)) {
            func.clone().perform([val, i++]);
          }
        }
      }
      return this;
    };
    
    // unary operators
    ["__plus__","__minus__"].concat(Object.keys(ops.UNARY_OPS)).forEach(function(selector) {
      if (/^[a-z_][a-zA-Z0-9_]*$/.test(selector)) {
        Pattern.prototype[selector] = function() {
          return new Puop(this, selector);
        };
      }
    });

    // binary operators
    ["__add__","__sub__","__mul__","__div__","__mod__"].concat(Object.keys(ops.BINARY_OPS)).forEach(function(selector) {
      if (/^[a-z_][a-zA-Z0-9_]*$/.test(selector)) {
        Pattern.prototype[selector] = function(b) {
          return new Pbop(this, selector, b);
        };
      }
    });
    
    return Pattern;
  })();

  var Puop = (function() {
    function Puop(pattern, selector) {
      if (!Number.prototype.hasOwnProperty(selector)) {
        throw new TypeError("Puop: operator '" + selector + "' not supported");
      }
      Pattern.call(this);
      this.klassName = "Puop";
      this._pattern   = pattern;
      this._selector  = selector;
    }
    extend(Puop, Pattern);
    
    Puop.prototype.clone = function() {
      return new Puop(this._pattern.clone(), this._selector);
    };
    
    Puop.prototype.next = function() {
      if (!this._finished) {
        var val = this._pattern.next();
        if (isNotNull(val)) {
          return val[this._selector].call(val);
        }
        this._finished = true;
      }
      return null;
    };
    
    return Puop;
  })();
  
  var Pbop = (function() {
    function Pbop(pattern, selector, b) {
      if (!Number.prototype.hasOwnProperty(selector)) {
        throw new TypeError("Pbop: operator '" + selector + "' not supported");
      }
      Pattern.call(this);
      this.klassName = "Pbop";
      this._pattern   = pattern;
      this._selector  = selector;
      this._b = b;
    }
    extend(Pbop, Pattern);
    
    Pbop.prototype.clone = function() {
      return new Pbop(this._pattern.clone(), this._selector);
    };
    
    Pbop.prototype.next = function() {
      if (!this._finished) {
        var val = this._pattern.next();
        if (isNotNull(val)) {
          return val[this._selector].call(val, this._b);
        }
        this._finished = true;
      }
      return null;
    };
    
    return Pbop;
  })();
  
  var Pgeom = (function() {
    function Pgeom(start, grow, length) {
      Pattern.call(this);
      this.klassName = "Pgeom";
      this._start = utils.asNumber(start);
      this._grow  = utils.asNumber(grow);
      this._length = utils.asNumber(length);
      this._pos    = 0;
      this._value  = this._start;
    }
    extend(Pgeom, Pattern);

    Pgeom.prototype.clone = function() {
      return new Pgeom(this._start, this._grow, this._length);
    };
    
    Pgeom.prototype.next = function() {
      if (this._pos < this._length) {
        var value = this._value;
        this._value *= this._grow;
        this._pos += 1;
        return value;
      } else {
        this._pos = Infinity;
        this._finished = true;
      }
      return null;
    };

    Pgeom.prototype.reset = function() {
      this._pos = 0;
      this._value = this._start;
      this._finished = false;
      return this;
    };
    
    return Pgeom;
  })();
  
  var Pseries = (function() {
    function Pseries(start, step, length) {
      Pattern.call(this);
      this.klassName = "Pseries";
      this._start = utils.asNumber(start);
      this._step  = utils.asNumber(step);
      this._length = utils.asNumber(length);
      this._pos    = 0;
      this._value  = this._start;
    }
    extend(Pseries, Pattern);

    Pseries.prototype.clone = function() {
      return new Pseries(this._start, this._start, this._length);
    };
    
    Pseries.prototype.next = function() {
      if (this._pos < this._length) {
        var value = this._value;
        this._value += this._step;
        this._pos += 1;
        return value;
      } else {
        this._pos = Infinity;
        this._finished = true;
      }
      return null;
    };

    Pseries.prototype.reset = function() {
      this._pos = 0;
      this._value = this._start;
      this._finished = false;
      return this;
    };
    
    return Pseries;
  })();

  var Pwhite = (function() {
    function Pwhite(lo, hi, length) {
      Pattern.call(this);
      this.klassName = "Pwhite";
      this._lo = utils.asNumber(lo);
      this._hi = utils.asNumber(hi);
      this._length = utils.asNumber(length);
      this._pos    = 0;
    }
    extend(Pwhite, Pattern);

    Pwhite.prototype.clone = function() {
      return new Pwhite(this._lo, this._hi, this._length);
    };
    
    Pwhite.prototype.next = function() {
      if (this._pos < this._length) {
        this._pos += 1;
        return Math.random() * (this._hi - this._lo) + this._lo;
      } else {
        this._pos = Infinity;
        this._finished = true;
      }
      return null;
    };
    
    return Pwhite;
  })();
  
  var ListPattern = (function() {
    function ListPattern(list, repeats, offset) {
      Pattern.call(this);
      this.klassName = "ListPattern";
      this.list    = utils.asArray(list);
      this.repeats = utils.asNumber(repeats);
      this.offset  = utils.asNumber(offset);
      this._pos = 0;
      this._posMax = this.repeats;
      this._list   = this.list;
    }
    extend(ListPattern, Pattern);
    
    ListPattern.prototype.clone = function() {
      return new this.constructor(this.list, this.repeats, this.offset);
    };
    
    ListPattern.prototype.next = function() {
      if (this._pos < this._posMax) {
        var index = this._calcIndex();
        var item  = this._list[index];
        var val   = valueOf(item);
        if (isNotNull(val)) {
          if (!(item instanceof Pattern)) {
            this._pos += 1;
          }
          return val;
        }
        if (item instanceof Pattern) {
          item.reset();
        }
        this._pos += 1;
        return this.next();
      } else {
        this._pos = Infinity;
        this._finished = true;
      }
      return null;
    };
    
    ListPattern.prototype.reset = function() {
      this._pos = 0;
      this._finished = false;
      var list = this.list;
      for (var i = 0, imax = list.length; i < imax; ++i) {
        if (list[i] instanceof Pattern) {
          list[i].reset();
        }
      }
      return this;
    };
    
    return ListPattern;
  })();
  
  var Pser = (function() {
    function Pser(list, repeats, offset) {
      ListPattern.call(this, list, repeats, offset);
      this.klassName = "Pser";
    }
    extend(Pser, ListPattern);
    
    Pser.prototype._calcIndex = function() {
      return (this._pos + this.offset) % this.list.length;
    };
    
    return Pser;
  })();
  
  var Pseq = (function() {
    function Pseq(list, repeats, offset) {
      Pser.call(this, list, repeats, offset);
      this.klassName = "Pseq";
      this._posMax = this.repeats * this.list.length;
    }
    extend(Pseq, Pser);
    
    return Pseq;
  })();
  
  var Pshuf = (function() {
    function Pshuf(list, repeats) {
      Pseq.call(this, list, repeats, 0);
      this.klassName = "Pshuf";
      this._list = this.list.slice().sort(shuffle);
    }
    extend(Pshuf, Pseq);
    
    var shuffle = function() { return Math.random() - 0.5; };
    
    return Pshuf;
  })();

  var Prand = (function() {
    function Prand(list, repeats) {
      ListPattern.call(this, list, repeats, 0);
      this.klassName = "Prand";
    }
    extend(Prand, ListPattern);
    
    Prand.prototype._calcIndex = function() {
      return (this.list.length * Math.random())|0;
    };
    
    return Prand;
  })();
  
  cc.global.Pgeom = fn(function(start, grow, length) {
    return new Pgeom(start, grow, length);
  }).defaults("start=0,grow=1,length=Infinity").build();
  
  cc.global.Pseries = fn(function(start, step, length) {
    return new Pseries(start, step, length);
  }).defaults("start=0,step=1,length=Infinity").build();
  
  cc.global.Pwhite = fn(function(lo, hi, length) {
    return new Pwhite(lo, hi, length);
  }).defaults("lo=0,hi=1,length=Infinity").build();
  
  cc.global.Pser = fn(function(list, repeats, offset) {
    return new Pser(list, repeats, offset);
  }).defaults("list=[],repeats=1,offset=0").build();
  
  cc.global.Pseq = fn(function(list, repeats, offset) {
    return new Pseq(list, repeats, offset);
  }).defaults("list,repeats=1,offset=0").build();

  cc.global.Pshuf = fn(function(list, repeats) {
    return new Pshuf(list, repeats);
  }).defaults("list=[],repeats=1").build();
  
  cc.global.Prand = fn(function(list, repeats) {
    return new Prand(list, repeats);
  }).defaults("list=[],repeats=1").build();
  
  module.exports = {
    Pattern: Pattern,
    Puop   : Puop,
    Pbop   : Pbop,
    
    Pgeom  : Pgeom,
    Pseries: Pseries,
    Pwhite : Pwhite,
    
    ListPattern: ListPattern,
    Pser : Pser,
    Pseq : Pseq,
    Pshuf: Pshuf,
    Prand: Prand,
  };

});
