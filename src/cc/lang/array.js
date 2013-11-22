define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var fn = require("./fn");
  var ops   = require("../common/ops");
  var utils = require("./utils");
  var slice = [].slice;

  var setupUnaryOp = function(selector) {
    fn.definePrototypeProperty(Array, selector, function() {
      return this.map(function(x) { return x[selector](); });
    });
  };

  setupUnaryOp("__plus__");
  setupUnaryOp("__minus__");
  ops.UNARY_OP_UGEN_MAP.forEach(function(selector) {
    if (/^[a-z][a-zA-Z0-9_]*$/.test(selector)) {
      setupUnaryOp(selector);
    }
  });
  
  var foldAt = function(list, index) {
    var len = list.length;
    index = index % (len * 2 - 2);
    if (index >= len) {
      index = 2 * (len - 1) - index;
    }
    return list[index];
  };
  var calc_with_adverb = function(selector, a, b, adverb) {
    var sort = a.length - b.length;
    switch (adverb) {
    case C.SHORT:
      if (sort > 0) {
        a.splice(b.length);
      } else if (sort < 0) {
        b.splice(a.length);
      }
      break;
    case C.FOLD:
      if (sort > 0) {
        return a.map(function(a, i) {
          return a[selector](foldAt(b, i));
        });
      } else if (sort < 0) {
        return b.map(function(b, i) {
          return foldAt(a, i)[selector](b);
        });
      }
      break;
    case C.TABLE:
    case C.FLAT:
      var table = a.map(function(a) {
        return b.map(function(b) {
          return a[selector](b);
        });
      });
      return (adverb === C.FLAT) ? utils.flatten(table) : table;
    }
    if (a.length === b.length) {
      return a.map(function(a, index) {
        return a[selector](b[index]);
      });
    } else if (a.length > b.length) {
      return a.map(function(a, index) {
        return a[selector](b[index % b.length]);
      });
    } else {
      return b.map(function(b, index) {
        return a[index % a.length][selector](b);
      });
    }
  };

  var setupBinaryOp = function(selector) {
    var ugenSelector;
    if (ops.UGEN_OP_ALIASES.hasOwnProperty(selector)) {
      ugenSelector = ops.UGEN_OP_ALIASES[selector];
    } else {
      ugenSelector = selector;
    }
    fn.definePrototypeProperty(Array, selector, function(b, adverb) {
      if (Array.isArray(b)) {
        return calc_with_adverb(selector, this, b, adverb);
      } else if (cc.instanceOfUGen(b)) {
        return this.map(function(a) {
          return cc.createBinaryOpUGen(ugenSelector, a, b);
        });
      }
      return this.map(function(a) {
        return a[selector](b);
      });
    });
  };

  setupBinaryOp("__add__");
  setupBinaryOp("__sub__");
  setupBinaryOp("__mul__");
  setupBinaryOp("__div__");
  setupBinaryOp("__mod__");
  fn.definePrototypeProperty(Array, "__and__", function(b) {
    return cc.createTaskWaitLogic("and", this.concat(b));
  });
  fn.definePrototypeProperty(Array, "__or__", function(b) {
    return cc.createTaskWaitLogic("or", this.concat(b));
  });
  ops.BINARY_OP_UGEN_MAP.forEach(function(selector) {
    if (/^[a-z][a-zA-Z0-9_]*$/.test(selector)) {
      setupBinaryOp(selector);
    }
  });

  var COMMON_FUNCTIONS = ops.COMMON_FUNCTIONS;
  Object.keys(COMMON_FUNCTIONS).forEach(function(selector) {
    fn.definePrototypeProperty(Array, selector, fn(function() {
      var args = slice.call(arguments);
      return this.map(function(_in) {
        if (_in[selector]) {
          return _in[selector].apply(_in, args);
        }
        return _in;
      });
    }).defaults(COMMON_FUNCTIONS[selector]).multiCall().build());
  });
  
  cc.global.SHORT = C.SHORT;
  cc.global.FOLD  = C.FOLD;
  cc.global.TABLE = C.TABLE;
  cc.global.FLAT  = C.FLAT;

  // utils
  var cc_func = function(func) {
    if (typeof func === "function") {
      return func;
    }
    return function() {
      return func;
    };
  };
  
  // array class methods
  Array.series = fn(function(size, start, step) {
    size |= 0;
    var a = new Array(size);
    var value = start;
    for (var i = 0, imax = a.length; i < imax; i++) {
      a[i] = value;
      value += step;
    }
    return a;
  }).defaults("size=0,start=0,step=1").build();

  Array.geom = fn(function(size, start, grow) {
    size |= 0;
    var a = new Array(size);
    var value = start;
    for (var i = 0, imax = a.length; i < imax; i++) {
      a[i] = value;
      value *= grow;
    }
    return a;
  }).defaults("size=0,start=1,grow=2").build();

  Array.fill = fn(function(size, func) {
    size |= 0;
    var a = new Array(size);
    func  = cc_func(func);
    for (var i = 0, imax = a.length; i < imax; ++i) {
      a[i] = func(i);
    }
    return a;
  }).defaults("size=0,func=0").build();

  Array.fill2D = fn(function(rows, cols, func) {
    rows |= 0;
    cols |= 0;
    func = cc_func(func);
    var a, a2, row, col;
    a = new Array(rows);
    for (row = 0; row < rows; ++row) {
      a2 = a[row] = new Array(cols);
      for (col = 0; col < cols; ++col) {
        a2[col] = func(row, col);
      }
    }
    return a;
  }).defaults("rows=0,cols=0,func=0").build();

  Array.fillND = (function() {
    var fillND = function(dimensions, func, args) {
      var n, a, argIndex, i;
      n = dimensions[0];
      a = [];
      argIndex = args.length;
      args = args.concat(0);
      if (dimensions.length <= 1) {
        for (i = 0; i < n; ++i) {
          args[argIndex] = i;
          a.push(func.apply(null, args));
        }
      } else {
        dimensions = dimensions.slice(1);
        for (i = 0; i < n; ++i) {
          args[argIndex] = i;
          a.push(fillND(dimensions, func, args));
        }
      }
      return a;
    };
    return fn(function(dimensions, func) {
      return fillND(dimensions, cc_func(func), []);
    }).defaults("dimensions=[],func=0").build();
  })();

  Array.fib = fn(function(size, x, y) {
    var a = new Array(size|0);
    for (var t, i = 0, imax = a.length; i < imax; i++) {
      a[i] = y;
      t = y;
      y = x + y;
      x = t;
    }
    return a;
  }).defaults("size=0,a=0,b=1").build();

  Array.rand = fn(function(size, minVal, maxVal) {
    var a = new Array(size|0);
    for (var i = 0, imax = a.length; i < imax; i++) {
      a[i] = minVal.rrand(maxVal);
    }
    return a;
  }).defaults("size=0,minVal=0,maxVal=1").build();

  Array.rand2 = fn(function(size, val) {
    var a = new Array(size|0);
    for (var i = 0, imax = a.length; i < imax; i++) {
      a[i] = val.rand2();
    }
    return a;
  }).defaults("size=0,val=1").build();

  Array.linrand = fn(function(size, minVal, maxVal) {
    var a = new Array(size|0);
    for (var i = 0, imax = a.length; i < imax; i++) {
      a[i] = minVal.linrand(maxVal);
    }
    return a;
  }).defaults("size=0,minVal=0,maxVal=1").build();

  Array.exprand = fn(function(size, minVal, maxVal) {
    var a = new Array(size|0);
    for (var i = 0, imax = a.length; i < imax; i++) {
      a[i] = minVal.exprand(maxVal);
    }
    return a;
  }).defaults("size=0,minVal=0.001,maxVal=1").build();
  
  Array.interpolation = fn(function(size, start, end) {
    if (size === 1) {
      return [start];
    }
    var a = new Array(size|0);
    var step = (end - start) / (size - 1);
    for (var i = 0, imax = a.length; i < imax; i++) {
      a[i] = start + (i * step);
    }
    return a;
  }).defaults("size=0,start=0,end=1").build();
  
  
  // array instance methods
  var ifold = function(index, len) {
    var len2 = len * 2 - 2;
    index = (index|0) % len2;
    if (index < 0) {
      index += len2;
    }
    if (len <= index) {
      index = len2 - index;
    }
    return index;
  };
  
  fn.definePrototypeProperty(Array, "size", function() {
    return this.length;
  });
  
  var minItem = function(func) {
    var i, imax, val, minVal, minItem;
    if (func) {
      func = cc_func(func);
      minItem = this[0];
      minVal  = func(this[0], 0);
      for (i = 1, imax = this.length; i < imax; ++i) {
        val = func(this[i], i);
        if (val < minVal) {
          minItem = this[i];
          minVal = val;
        }
      }
    } else {
      minItem = this[0];
      for (i = 1, imax = this.length; i < imax; ++i) {
        if (this[i] < minItem) {
          minItem = this[i];
        }
      }
    }
    return minItem;
  };
  
  fn.definePrototypeProperty(Array, "minItem" , minItem);
  fn.definePrototypeProperty(Array, "minValue", minItem);
  
  var maxItem = function(func) {
    var i, imax, val, maxVal, maxItem;
    if (func) {
      func = cc_func(func);
      maxItem = this[0];
      maxVal  = func(this[0], 0);
      for (i = 1, imax = this.length; i < imax; ++i) {
        val = func(this[i], i);
        if (maxVal < val) {
          maxItem = this[i];
          maxVal = val;
        }
      }
    } else {
      maxItem = this[0];
      for (i = 1, imax = this.length; i < imax; ++i) {
        if (maxItem < this[i]) {
          maxItem = this[i];
        }
      }
    }
    return maxItem;
  };
  
  fn.definePrototypeProperty(Array, "maxItem" , maxItem);
  fn.definePrototypeProperty(Array, "maxValue", maxItem);
  
  fn.definePrototypeProperty(Array, "at", fn(function(index) {
    return this[index|0];
  }).multiCall().build());

  fn.definePrototypeProperty(Array, "clipAt", fn(function(index) {
    return this[Math.max(0, Math.min(index, this.length-1))|0];
  }).multiCall().build());

  fn.definePrototypeProperty(Array, "wrapAt", fn(function(index) {
    index = (index|0) % this.length;
    if (index < 0) {
      index += this.length;
    }
    return this[index];
  }).multiCall().build());

  fn.definePrototypeProperty(Array, "foldAt", fn(function(index) {
    return this[ifold(index, this.length)];
  }).multiCall().build());
  

  fn.definePrototypeProperty(Array, "put", function(index, item) {
    if (Array.isArray(index)) {
      index.forEach(function(index) {
        this.put(index, item);
      }, this);
    } else {
      index |= 0;
      if (0 <= index && index < this.length) {
        this[index] = item;
      }
    }
    return this;
  });

  fn.definePrototypeProperty(Array, "clipPut", function(index, item) {
    if (Array.isArray(index)) {
      index.forEach(function(index) {
        this.clipPut(index, item);
      }, this);
    } else {
      this[Math.max(0, Math.min(index, this.length-1))|0] = item;
    }
    return this;
  });

  fn.definePrototypeProperty(Array, "wrapPut", function(index, item) {
    if (Array.isArray(index)) {
      index.forEach(function(index) {
        this.wrapPut(index, item);
      }, this);
    } else {
      index = (index|0) % this.length;
      if (index < 0) {
        index += this.length;
      }
      this[index] = item;
    }
    return this;
  });
  
  fn.definePrototypeProperty(Array, "foldPut", function(index, item) {
    if (Array.isArray(index)) {
      index.forEach(function(index) {
        this.foldPut(index, item);
      }, this);
    } else {
      this[ifold(index, this.length)] = item;
    }
    return this;
  });

  fn.definePrototypeProperty(Array, "insert", function(index, item) {
    this.splice(Math.max(0, index), 0, item);
    return this;
  });
  
  fn.definePrototypeProperty(Array, "swap", function(i, j) {
    i |= 0;
    j |= 0;
    if (0 <= i && i < this.length && 0 <= j && j < this.length) {
      var t = this[i];
      this[i] = this[j];
      this[j] = t;
    }
    return this;
  });

  fn.definePrototypeProperty(Array, "clipSwap", function(i, j) {
    i = Math.max(0, Math.min(i, this.length-1))|0;
    j = Math.max(0, Math.min(j, this.length-1))|0;
    return this.swap(i, j);
  });
  
  fn.definePrototypeProperty(Array, "wrapSwap", function(i, j) {
    i = (i|0) % this.length;
    if (i < 0) {
      i += this.length;
    }
    j = (j|0) % this.length;
    if (j < 0) {
      j += this.length;
    }
    return this.swap(i, j);
  });
  
  fn.definePrototypeProperty(Array, "foldSwap", function(i, j) {
    i = ifold(i, this.length);
    j = ifold(j, this.length);
    return this.swap(i, j);
  });

  fn.definePrototypeProperty(Array, "sum", function() {
    var value = 0;
    for (var i = 0, imax = this.length; i < imax; ++i) {
      value += this[i];
    }
    return value;
  });
  
  fn.definePrototypeProperty(Array, "normalize", fn(function(min, max) {
    var minItem = this.minItem();
    var maxItem = this.maxItem();
    return this.map(function(item) {
      return item.linlin(minItem, maxItem, min, max);
    });
  }).defaults("min=0,max=1").build());

  fn.definePrototypeProperty(Array, "normalizeSum", function() {
    var sum = this.sum();
    return this.map(function(item) {
      return item / sum;
    });
  });
  
  
  fn.definePrototypeProperty(Array, "mirror", function() {
    var size = this.length * 2 - 1;
    if (size < 2) {
      return this.slice(0);
    }
    var i, j, imax, a = new Array(size);
    for (i = 0, imax = this.length; i < imax; ++i) {
      a[i] = this[i];
    }
    for (j = imax - 2, imax = size; i < imax; ++i, --j) {
      a[i] = this[j];
    }
    return a;
  });

  fn.definePrototypeProperty(Array, "mirror1", function() {
    var size = this.length * 2 - 2;
    if (size < 2) {
      return this.slice(0);
    }
    var i, j, imax, a = new Array(size);
    for (i = 0, imax = this.length; i < imax; ++i) {
      a[i] = this[i];
    }
    for (j = imax - 2, imax = size; i < imax; ++i, --j) {
      a[i] = this[j];
    }
    return a;
  });

  fn.definePrototypeProperty(Array, "mirror2", function() {
    var size = this.length * 2;
    if (size < 2) {
      return this.slice(0);
    }
    var i, j, imax, a = new Array(size);
    for (i = 0, imax = this.length; i < imax; ++i) {
      a[i] = this[i];
    }
    for (j = imax - 1, imax = size; i < imax; ++i, --j) {
      a[i] = this[j];
    }
    return a;
  });

  fn.definePrototypeProperty(Array, "stutter", fn(function(n) {
    n = Math.max(0, n)|0;
    var a = new Array(this.length * n);
    for (var i = 0, j = 0, imax = this.length; i < imax; ++i) {
      for (var k = 0; k < n; ++k, ++j) {
        a[j] = this[i];
      }
    }
    return a;
  }).defaults("n=2").build());

  fn.definePrototypeProperty(Array, "rotate", fn(function(n) {
    n = Math.max(0, n)|0;
    var a = new Array(this.length);
    var size = a.length;
    n %= size;
    if (n < 0) {
      n = size + n;
    }
    for (var i = 0, j = n; i < size; ++i) {
      a[j] = this[i];
      if (++j >= size) {
        j = 0;
      }
    }
    return a;
  }).defaults("n=1").build());

  fn.definePrototypeProperty(Array, "sputter", fn(function(probability, maxlen) {
    var a = [], i = 0, j = 0, size = this.length;
    while (i < size && j < maxlen) {
      a[j++] = this[i];
      if (probability < Math.random()) {
        i += 1;
      }
    }
    return a;
  }).defaults("probability=0.25,maxlen=100").build());

  fn.definePrototypeProperty(Array, "clipExtend", function(size) {
    size = Math.max(0, size|0);
    if (this.length < size) {
      var a = new Array(size);
      for (var i = 0, imax = this.length; i< imax; ++i) {
        a[i] = this[i];
      }
      for (var b = a[i-1]; i < size; ++i) {
        a[i] = b;
      }
      return a;
    } else {
      return this.slice(0, size);
    }
  });

  fn.definePrototypeProperty(Array, "wrapExtend", function(size) {
    size = Math.max(0, size|0);
    if (this.length < size) {
      var a = new Array(size);
      for (var i = 0; i < size; ++i) {
        a[i] = this[i % this.length];
      }
      return a;
    } else {
      return this.slice(0, size);
    }
  });

  fn.definePrototypeProperty(Array, "foldExtend", function(size) {
    size = Math.max(0, size|0);
    if (this.length < size) {
      var a = new Array(size);
      for (var i = 0; i < size; ++i) {
        a[i] = this[ifold(i, this.length)];
      }
      return a;
    } else {
      return this.slice(0, size);
    }
  });

  fn.definePrototypeProperty(Array, "resamp0", function(newSize) {
    var factor = (this.length - 1) / (newSize - 1);
    var a = new Array(newSize);
    for (var i = 0; i < newSize; ++i) {
      a[i] = this[Math.round(i * factor)];
    }
    return a;
  });

  fn.definePrototypeProperty(Array, "resamp1", function(newSize) {
    var factor = (this.length - 1) / (newSize - 1);
    var a = new Array(newSize);
    for (var i = 0; i < newSize; ++i) {
      a[i] = this.blendAt(i * factor);
    }
    return a;
  });

  var scramble = function() {
    return Math.random() - 0.5;
  };
  fn.definePrototypeProperty(Array, "scramble", function() {
    return this.sort(scramble);
  });
  fn.definePrototypeProperty(Array, "shuffle", function() {
    return this.sort(scramble);
  });
  
  fn.definePrototypeProperty(Array, "choose", function() {
    return this[(Math.random() * this.length)|0];
  });
  
  module.exports = {};

});
