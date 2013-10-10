define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var fn = require("./fn");

  describe("fn", function() {
    var Foo, Bar;
    before(function() {
      Foo = (function() {
        function Foo() {}
        Foo.prototype.$new1 = function() {
          this.name = "Foo";
          return this;
        };
        Foo.prototype.$create = function(value) {
          return this.new1().setValue(value);
        };
        Foo.prototype.setValue = function(value) {
          this.value = value;
          return this;
        };
        fn.classmethod(Foo);
        return Foo;
      })();
      Bar = (function() {
        function Bar() {}
        fn.extend(Bar, Foo);
        Bar.prototype.$new1 = function() {
          this.name = "Bar";
          return this;
        };
        Bar.prototype.setValue = function(value) {
          this.value = value * 100;
          return this;
        };
        fn.classmethod(Bar);
        return Bar;
      })();
    });
    describe("Fn", function() {
      it("defaults", function() {
        var madd = fn(function(val, mul, add) {
          return val * mul + add;
        }).defaults("val=0,mul=1,add=0").build();
        assert.equal(10, madd(10));
        assert.equal(20, madd(10, 2));
        assert.equal(30, madd(10, {add:20}));
      });
    });
    it("extend", function() {
      assert.instanceOf(new Bar(), Foo);
    });
    describe("classmethod", function() {
      it("create", function() {
        var f = Foo.create(1000);
        assert.instanceOf(f, Foo);
        assert.equal(f.value, 1000);
        assert.equal(f.name , "Foo");
      });
      it("extend", function() {
        var b = Bar.create(1000);
        assert.instanceOf(b, Bar);
        assert.instanceOf(b, Foo);
        assert.equal(b.value, 1000 * 100);
        assert.equal(b.name , "Bar");
      });
    });
    it("isDictionary", function() {
      var __ = new (function() {})();
      assert.equal(true , fn.isDictionary({}));
      assert.equal(false, fn.isDictionary([]));
      assert.equal(false, fn.isDictionary(__));
      assert.equal(false, fn.isDictionary(null));
    });
  });
  
});
