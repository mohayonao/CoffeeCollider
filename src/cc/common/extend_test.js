define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var extend = require("./extend");

  describe("common/extend.js", function() {
    it("extend", function() {
      var Foo = (function() {
        function Foo() {}
        return Foo;
      })();
      var Bar = (function() {
        function Bar() {}
        extend(Bar, Foo);
        return Bar;
      })();
      assert.instanceOf(new Bar(), Foo);
    });
  });

});
