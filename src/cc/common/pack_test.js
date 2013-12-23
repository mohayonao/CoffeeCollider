define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;
  var pack = require("./pack");
  
  describe("common/pack.js", function() {
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
      var object = function() {
      };
      var actual = pack.pack(object);
      var expected = {
        klassName:"Function"
      };
      assert.deepEqual(actual, expected);
    });
    it("null", function() {
      var actual   = pack.unpack(pack.pack(null));
      var expected = null;
      assert.equal(actual, expected);
    });
    it("ArrayBuffer", function() {
      var actual   = pack.unpack(pack.pack(new Float32Array([1,2,3])));
      var expected = new Float32Array([1,2,3]);
      assert.deepEqual(actual, expected);
    });
  });

});
