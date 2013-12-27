define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var testTools = require("../../testTools");
  
  var buffer = require("./buffer");
  var cc = require("./cc");
  
  describe("lang/buffer.js", function() {
    var instance, actual, expected;
    testTools.mock("lang");
    
    describe("Buffer", function() {
      it("create", function() {
        instance = cc.global.Buffer();
        assert.instanceOf(instance, buffer.Buffer);
        assert.isTrue(cc.instanceOfBuffer(instance));
        assert.deepEqual(cc.lang.pushToTimeline.result, [
          ["/b_new", instance.bufnum, instance.frames, instance.channels]
        ]);
      });
      it("create with array", function() {
        instance = cc.global.Buffer([1, 2, 3, 4, 5, 6, 7, 8]);
        assert.equal(instance.frames, 8);
        assert.deepEqual(cc.lang.pushToTimeline.result, [
          ["/b_new" , instance.bufnum, instance.frames, instance.channels],
        ]);
      });
      describe("*read", function() {
        it("read", function() {
          instance = cc.global.Buffer.read("id");
          assert.deepEqual(cc.lang.pushToTimeline.result, [
            ["/b_new" , instance.bufnum, instance.frames, instance.channels],
          ]);
        });
        it("error", function() {
          assert.throws(function() {
            instance = cc.global.Buffer.read(null);
          });
        });
      });
      it( "#free", function() {
        instance = cc.global.Buffer();
        actual   = instance.free();
        expected = instance;
        assert.equal(actual, expected);
        assert.deepEqual(cc.lang.pushToTimeline.result, [
          ["/b_new" , instance.bufnum, instance.frames, instance.channels],
          ["/b_free", instance.bufnum]
        ]);
      });
      it("#zero", function() {
        instance = cc.global.Buffer();
        actual   = instance.zero();
        expected = instance;
        assert.equal(actual, expected);
        assert.deepEqual(cc.lang.pushToTimeline.result, [
          ["/b_new" , instance.bufnum, instance.frames, instance.channels],
          ["/b_zero", instance.bufnum]
        ]);
      });
      it("#set", function() {
        instance = cc.global.Buffer();
        actual   = instance.set(1, 2, 3, [4]);
        expected = instance;
        assert.equal(actual, expected);
        assert.deepEqual(cc.lang.pushToTimeline.result, [
          ["/b_new", instance.bufnum, instance.frames, instance.channels],
          ["/b_set", instance.bufnum, [1, 2, 3, [4]] ]
        ]);
      });
      it("#set (empty)", function() {
        instance = cc.global.Buffer();
        actual   = instance.set();
        expected = instance;
        assert.equal(actual, expected);
        assert.deepEqual(cc.lang.pushToTimeline.result, [
          ["/b_new", instance.bufnum, instance.frames, instance.channels],
        ]);
      });
      it("#sine1", function() {
        instance = cc.global.Buffer();
        actual   = instance.sine1([1, 2], true, true, true);
        expected = instance;
        assert.equal(actual, expected);
        assert.deepEqual(cc.lang.pushToTimeline.result, [
          ["/b_new", instance.bufnum, instance.frames, instance.channels],
          ["/b_gen", instance.bufnum, "sine1", 7, 1, 2]
        ]);
      });
      it("#sine2", function() {
        instance = cc.global.Buffer();
        actual   = instance.sine2([1, 2], [0.5], true, true, false);
        expected = instance;
        assert.equal(actual, expected);
        assert.deepEqual(cc.lang.pushToTimeline.result, [
          ["/b_new", instance.bufnum, instance.frames, instance.channels],
          ["/b_gen", instance.bufnum, "sine2", 3, 1, 0.5, 2, 0.5]
        ]);
      });
      it("#sine3", function() {
        instance = cc.global.Buffer();
        actual   = instance.sine3([1, 2], [0.5], [0.1, 0.2], true, false, true);
        expected = instance;
        assert.equal(actual, expected);
        assert.deepEqual(cc.lang.pushToTimeline.result, [
          ["/b_new", instance.bufnum, instance.frames, instance.channels],
          ["/b_gen", instance.bufnum, "sine3", 5, 1, 0.5, 0.1, 2, 0.5, 0.2]
        ]);
      });
      it("#cheby", function() {
        instance = cc.global.Buffer();
        actual   = instance.cheby([1, 0, 1, 1, 0, 1], false, true, true);
        expected = instance;
        assert.equal(actual, expected);
        assert.deepEqual(cc.lang.pushToTimeline.result, [
          ["/b_new", instance.bufnum, instance.frames, instance.channels],
          ["/b_gen", instance.bufnum, "cheby", 6, 1, 0, 1, 1, 0, 1]
        ]);
      });
      it("#asUGenInput", function() {
        instance = cc.global.Buffer();
        actual   = instance.asUGenInput();
        expected = instance.bufnum;
        assert.equal(actual, expected);
      });
    });
  });

});
