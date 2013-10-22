define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;
  var pack = require("./pack");
  
  describe("pack.js", function() {
    it("pack/unpack", function() {
      var object = {
        list: [ 1, 2, 3, 4, 5 ],
        dict: {
          a: 10, b: 20, c: 30
        }
      };
      var expected = {
        list: [ 1, 2, 3, 4, 5 ],
        dict: {
          a: 10, b: 20, c: 30
        }
      };
      var actual = pack.unpack(pack.pack(object));
      assert.deepEqual(actual, expected);
    });
    it("private", function() {
      var object = {
        list: [ 1, 2, 3, 4, 5 ],
        dict: {
          a: 10, b: 20, c: 30
        },
        _private: 100
      };
      var expected = {
        list: [ 1, 2, 3, 4, 5 ],
        dict: {
          a: 10, b: 20, c: 30
        }
      };
      var actual = pack.unpack(pack.pack(object));
      assert.notEqual(actual, expected);
      assert.deepEqual(actual, expected);
    });
    it("circular", function() {
      var object = {
        list: [ 1, 2, 3, 4, 5 ],
        dict: {
          a: 10, b: 20, c: 30
        }
      };
      object.circular = object;
      var expected = {
        list: [ 1, 2, 3, 4, 5 ],
        dict: {
          a: 10, b: 20, c: 30
        },
        circular: {}
      };
      var actual = pack.unpack(pack.pack(object));
      assert.deepEqual(actual, expected);
    });
    it("function", function() {
      var object = {
        list: [ 1, 2, 3, 4, 5 ],
        dict: {
          a: 10, b: 20, c: 30
        },
        func: function() {}
      };
      var actual = pack.unpack(pack.pack(object));
      assert.equal(JSON.stringify(actual), JSON.stringify(object));
      assert.isFunction(actual.func);
    });
  });

});
