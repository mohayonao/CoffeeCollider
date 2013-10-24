define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var object = require("./object");

  describe("object.js", function() {
    var n = 3, a = [ 1, 2 ], b = true, s = "str", d = new Date(), f = function(x) {
      return x + 1;
    };
    before(function() {
      object.install();
    });
    it("__plus__", function() {
      var actual   = [-1, 0, 1,true ,false,"str","2","", d, f];
      var expected = [-1, 0, 1,1    ,0    ,NaN  ,2  ,0 ,+d,+f];
      actual = actual.map(function(x) {
        return x.__plus__();
      });
      assert.deepEqual(actual, expected);
    });
    it("__minus__", function() {
      var actual   = [-1, 0, 1,true ,false,"str","2","", d, f];
      var expected = [ 1,-0,-1,-1   ,-0   ,NaN  ,-2 ,-0,-d,-f];
      actual = actual.map(function(x) {
        return x.__minus__();
      });
      assert.deepEqual(actual, expected);
    });
    it("__add__", function() {
      [n,a,b,s,d,f].forEach(function($1) {
        [n,a,b,s,d,f].forEach(function($2) {
          var actual = $1.__add__($2);
          var expected = $1 + $2;
          assert.deepEqual(actual, expected);
        });
      });
    });
    it("__sub__", function() {
      [n,a,b,s,d,f].forEach(function($1) {
        [n,a,b,s,d,f].forEach(function($2) {
          var actual = $1.__sub__($2);
          var expected = $1 - $2;
          assert.deepEqual(actual, expected);
        });
      });
    });
    it("__mul__", function() {
      [n,a,b,s,d,f].forEach(function($1) {
        [n,a,b,s,d,f].forEach(function($2) {
          var actual = $1.__mul__($2);
          var expected = $1 * $2;
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
          assert.deepEqual(actual, expected);
        });
      });
    });
    it("__div__", function() {
      [n,a,b,s,d,f].forEach(function($1) {
        [n,a,b,s,d,f].forEach(function($2) {
          var actual = $1.__div__($2);
          var expected = $1 / $2;
          if ($1 === s) {
            if ($2 === n) {
              expected = [ "s", "t", "r" ];
            } else if ($2 === a) {
              expected = [ [ "str" ], [ "st", "r" ] ];
            }
          }
          assert.deepEqual(actual, expected);
        });
      });
    });
    it("__mod__", function() {
      [n,a,b,s,d,f].forEach(function($1) {
        [n,a,b,s,d,f].forEach(function($2) {
          var actual = $1.__mod__($2);
          var expected = $1 % $2;
          if ($1 === s) {
            if ($2 === n) {
              expected = [ "str" ];
            } else if ($2 === a) {
              expected = [ [ "s", "t", "r" ], [ "st", "r" ] ];
            }
          }
          assert.deepEqual(actual, expected);
        });
      });
    });
    it("next", function() {
      [n,a,b,s,d,f].forEach(function($1) {
        var actual = $1.next();
        var expected = $1;
        assert.equal(actual, expected);
      });
    });
  });

});
