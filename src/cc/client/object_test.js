define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;

  var cc   = require("../cc");
  var ugen = require("./ugen/ugen");
  var object = require("./object");
  var sched  = require("./sched");
  
  describe("object.js", function() {
    var n = 3, a = [ 1, 2 ], b = true, s = "str", d = new Date(), f = function(x) {
      return x + 1;
    };
    before(function() {
      ugen.use();
      sched.use();
      object.exports();
    });
    
    it("__plus__", function() {
      var actual   = [-1, 0, 1,true ,false,"str","2","", d, f];
      var expected = [-1, 0, 1,1    ,0    ,NaN  ,2  ,0 ,+d,+f];
      actual = actual.__plus__();
      assert.deepEqual(actual, expected);
    });
    it("__minus__", function() {
      var actual   = [-1, 0, 1,true ,false,"str","2","", d, f];
      var expected = [ 1,-0,-1,-1   ,-0   ,NaN  ,-2 ,-0,-d,-f];
      actual = actual.__minus__();
      assert.deepEqual(actual, expected);
    });
    
    it("__add__", function() {
      [n,a,b,s,d,f].forEach(function($1) {
        [n,a,b,s,d,f].forEach(function($2) {
          var actual = $1.__add__($2);
          var expected = $1 + $2;
          if (Array.isArray($1)) {
            if (Array.isArray($2)) {
              expected = $1.map(function($1, i) {
                return $1 + $2[i];
              });
            } else {
              expected = $1.map(function($1) {
                return $1 + $2;
              });
            }
          } else if (Array.isArray($2)) {
            expected = $2.map(function($2) {
              return $1 + $2;
            });
          }
          assert.deepEqual(actual, expected, $1 + " + " + $2);
        });
      });
    });
    
    it("__sub__", function() {
      [n,a,b,s,d,f].forEach(function($1) {
        [n,a,b,s,d,f].forEach(function($2) {
          var actual = $1.__sub__($2);
          var expected = $1 - $2;
          if (Array.isArray($1)) {
            if (Array.isArray($2)) {
              expected = $1.map(function($1, i) {
                return $1 - $2[i];
              });
            } else {
              expected = $1.map(function($1) {
                return $1 - $2;
              });
            }
          } else if (Array.isArray($2)) {
            expected = $2.map(function($2) {
              return $1 - $2;
            });
          }
          assert.deepEqual(actual, expected, $1 + " - " + $2);
        });
      });
    });
    
    it("__mul__", function() {
      [n,a,b,s,d,f].forEach(function($1) {
        [n,a,b,s,d,f].forEach(function($2) {
          var actual = $1.__mul__($2);
          var expected = $1 * $2;
          if (Array.isArray($1)) {
            if (Array.isArray($2)) {
              expected = $1.map(function($1, i) {
                return $1 * $2[i];
              });
            } else {
              expected = $1.map(function($1) {
                return $1 * $2;
              });
            }
          } else if (Array.isArray($2)) {
            expected = $2.map(function($2) {
              return $1 * $2;
            });
          }
          if ($1 === s) {
            if ($2 === n) {
              expected = s + s + s;
            } else if ($2 === a) {
              expected = [ s, s + s ];
            }
          } else if ($1 === f && $2 === f) {
            actual = actual(10);
            expected = f(f(10));
          }
          assert.deepEqual(actual, expected, $1 + " * " + $2);
        });
      });
    });
    
    it("__div__", function() {
      [n,a,b,s,d,f].forEach(function($1) {
        [n,a,b,s,d,f].forEach(function($2) {
          var actual = $1.__div__($2);
          var expected = $1 / $2;
          if (Array.isArray($1)) {
            if (Array.isArray($2)) {
              expected = $1.map(function($1, i) {
                return $1 / $2[i];
              });
            } else {
              expected = $1.map(function($1) {
                return $1 / $2;
              });
            }
          } else if (Array.isArray($2)) {
            expected = $2.map(function($2) {
              return $1 / $2;
            });
          }
          if ($1 === s) {
            if ($2 === n) {
              expected = [ "s", "t", "r" ];
            } else if ($2 === a) {
              expected = [ [ "str" ], [ "st", "r" ] ];
            }
          }
          assert.deepEqual(actual, expected, $1 + " / " + $2);
        });
      });
    });
    
    it("__mod__", function() {
      [n,a,b,s,d,f].forEach(function($1) {
        [n,a,b,s,d,f].forEach(function($2) {
          var actual = $1.__mod__($2);
          var expected = $1 % $2;
          if (Array.isArray($1)) {
            if (Array.isArray($2)) {
              expected = $1.map(function($1, i) {
                return $1 % $2[i];
              });
            } else {
              expected = $1.map(function($1) {
                return $1 % $2;
              });
            }
          } else if (Array.isArray($2)) {
            expected = $2.map(function($2) {
              return $1 % $2;
            });
          }
          if ($1 === s) {
            if ($2 === n) {
              expected = [ "str" ];
            } else if ($2 === a) {
              expected = [ [ "s", "t", "r" ], [ "st", "r" ] ];
            }
          }
          assert.deepEqual(actual, expected, $1 + " % " + $2);
        });
      });
    });

    it("__and__", function() {
      [n,a,b,f].forEach(function($1) {
        [n,a,b,f].forEach(function($2) {
          var actual = $1.__and__($2);
          assert.ok(cc.instanceOfWaitToken(actual));
        });
      })
    });
    it("__or__", function() {
      [n,a,b,f].forEach(function($1) {
        [n,a,b,f].forEach(function($2) {
          var actual = $1.__or__($2);
          assert.ok(cc.instanceOfWaitToken(actual));
        });
      })
    });
    
  });

});
