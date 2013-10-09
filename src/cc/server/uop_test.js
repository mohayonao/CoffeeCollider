define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var uop = require("./uop");

  describe("uop:", function() {
    var cc = {};
    before(function() {
      uop.install(cc);
    });
    it("neg", function() {
      var a = [-1, 0, 1,true ,false,"str",""].neg();
      var b = [ 1,-0,-1,false,true ,"str",""];
      assert.deepEqual(a, b);
    });
    it("not", function() {
      var a = [-1   ,0   , 1   ,true ,false,"str",""  ].not();
      var b = [false,true,false,false,true ,false,true];
      assert.deepEqual(a, b);
    });
    it("tilde", function() {
      var a = [ -1, 0, 1,true,false,"str",""].tilde();
      var b = [~-1,~0,~1,true,false,"str",""];
      assert.deepEqual(a, b);
    });
  });  

});
