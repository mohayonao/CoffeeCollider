define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;

  var cc  = require("./cc");
  var ref = require("./ref");
  
  describe("lang/ref.js", function() {
    var actual, expected;
    it("create", function() {
      var value = [ 1, 2, 3 ];
      var r = cc.global.$(value);
      actual = r;
      assert.instanceOf(actual, ref.Ref);
      assert.isTrue(cc.instanceOfRef(actual));
    });
    it("#value", function() {
      var value = [ 1, 2, 3 ];
      var r = cc.global.$(value);
      actual   = r.value();
      expected = value;
      assert.equal(actual, expected);
    });
    it("#asUGenInput", function() {
      var value = [ 1, 2, 3 ];
      var r = cc.global.$(value);
      actual   = r.asUGenInput();
      expected = r;
      assert.equal(actual, expected);
    });
    it("#multichannelExpandRef", function() {
      var value = [ [1,2,3], [10,20,30], [100,200,300] ];
      var r = cc.global.$(value);
      actual   = r.multichannelExpandRef(0);
      expected = [
        new ref.Ref([1, 10, 100]),
        new ref.Ref([2, 20, 200]),
        new ref.Ref([3, 30, 300]),
      ];
      assert.deepEqual(actual, expected, "rank(0)");
      
      actual   = r.multichannelExpandRef(1);
      expected = [
        new ref.Ref([1, 10, 100]),
        new ref.Ref([2, 20, 200]),
        new ref.Ref([3, 30, 300]),
      ];
      assert.deepEqual(actual, expected, "rank(1)");
      
      actual   = r.multichannelExpandRef(2);
      expected = new ref.Ref([ [1,2,3], [10,20,30], [100,200,300] ]);
      assert.deepEqual(actual, expected, "rank(2)");
    });
  });

});
