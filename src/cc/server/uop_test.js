define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var uop = require("./uop");

  describe("uop:", function() {
    var cc = {};
    before(function() {
      uop.install(cc);
    });
    it("num", function() {
      var actual   = [-1, 0, 1,true ,false,"str","2",""].num();
      var expected = [-1, 0, 1,1    ,0    ,NaN  ,2  ,0 ];
      assert.deepEqual(actual, expected);
    });
    it("neg", function() {
      var actual   = [-1, 0, 1,true ,false,"str","2",""].neg();
      var expected = [ 1,-0,-1,-1   ,-0   ,NaN  ,-2 ,-0];
      assert.deepEqual(actual, expected);
    });
    it("not", function() {
      var actual   = [-1   ,0   , 1   ,true ,false,"str",""  ].not();
      var expected = [false,true,false,false,true ,true ,true];
      assert.deepEqual(actual, expected);
    });
    it("tilde", function() {
      var actual   = [ -1, 0, 1,true,false,"str",""].tilde();
      var expected = [~-1,~0,~1,-2  ,-1   ,-1,  -1 ];
      assert.deepEqual(actual, expected);
    });
  });  

});
