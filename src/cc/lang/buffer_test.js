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
        var array = [1, 2, 3, 4, 5, 6, 7, 8];
        instance = cc.global.Buffer(array);
        assert.equal(instance.frames, 8);
        assert.deepEqual(cc.lang.pushToTimeline.result, [
          ["/b_new" , instance.bufnum, instance.frames, instance.channels]
        ]);
        var uint8 = new Uint8Array(C.BUFSRC_HEADER_SIZE + array.length * 4);
        var int16 = new Uint16Array(uint8.buffer);
        var int32 = new Uint32Array(uint8.buffer);
        var f32   = new Float32Array(uint8.buffer);
        int16[0] = C.BINARY_CMD_SET_BUFSRC;
        int16[1] = instance.bufnum;
        int16[3] = 1;
        int32[2] = cc.lang.sampleRate;
        int32[3] = array.length;
        for (var i = 0; i < array.length; ++i) {
          f32[i + 4] = array[i];
        }
        assert.deepEqual(cc.lang.sendToServer.result, [uint8]);
      });
      describe("*read", function() {
        var data = {
          sampleRate : 44100,
          numChannels: 2,
          numFrames  : 4,
          samples: new Float32Array([1, 2, 3, 4, 5, 6, 7, 8])
        };
        before(function() {
          cc.lang.requestBuffer = function(path, callback) {
            callback(data);
          };
        });
        it("read(empty)", function() {
          // cc.lang.requestBuffer = function() {
          // };
          instance = cc.global.Buffer.read("id");
          assert.deepEqual(cc.lang.pushToTimeline.result, [
            ["/b_new" , instance.bufnum, instance.frames, instance.channels],
          ]);
          // assert.deepEqual(cc.lang.sendToServer.result, []);
        });
        it("read(buffer)", function() {
          instance = cc.global.Buffer.read("id");
          var uint8 = new Uint8Array(C.BUFSRC_HEADER_SIZE + 8 * 4);
          var int16 = new Uint16Array(uint8.buffer);
          var int32 = new Uint32Array(uint8.buffer);
          var f32   = new Float32Array(uint8.buffer);
          int16[0] = C.BINARY_CMD_SET_BUFSRC;
          int16[1] = instance.bufnum;
          int16[3] = 2;
          int32[2] = 44100;
          int32[3] = 4;
          f32[ 4] = 1;
          f32[ 5] = 2;
          f32[ 6] = 3;
          f32[ 7] = 4;
          f32[ 8] = 5;
          f32[ 9] = 6;
          f32[10] = 7;
          f32[11] = 8;
          assert.deepEqual(cc.lang.pushToTimeline.result, [
            ["/b_new" , instance.bufnum, instance.frames, instance.channels],
          ]);
          assert.deepEqual(cc.lang.sendToServer.result, [uint8]);
        });
        it("read:range(0, 2)", function() {
          instance = cc.global.Buffer.read("id", 0, 2);
          var uint8 = new Uint8Array(C.BUFSRC_HEADER_SIZE + 2 * 2 * 4);
          var int16 = new Uint16Array(uint8.buffer);
          var int32 = new Uint32Array(uint8.buffer);
          var f32   = new Float32Array(uint8.buffer);
          int16[0] = C.BINARY_CMD_SET_BUFSRC;
          int16[1] = instance.bufnum;
          int16[3] = 2;
          int32[2] = 44100;
          int32[3] = 2;
          f32[ 4] = 1;
          f32[ 5] = 2;
          f32[ 6] = 3;
          f32[ 7] = 4;
          assert.deepEqual(cc.lang.pushToTimeline.result, [
            ["/b_new" , instance.bufnum, 0, instance.channels],
          ]);
          assert.deepEqual(cc.lang.sendToServer.result, [uint8]);
        });
        it("read:range(1, 2)", function() {
          instance = cc.global.Buffer.read("id", 1, 2);
          var uint8 = new Uint8Array(C.BUFSRC_HEADER_SIZE + 2 * 2 * 4);
          var int16 = new Uint16Array(uint8.buffer);
          var int32 = new Uint32Array(uint8.buffer);
          var f32   = new Float32Array(uint8.buffer);
          int16[0] = C.BINARY_CMD_SET_BUFSRC;
          int16[1] = instance.bufnum;
          int16[3] = 2;
          int32[2] = 44100;
          int32[3] = 2;
          f32[ 4] = 3;
          f32[ 5] = 4;
          f32[ 6] = 5;
          f32[ 7] = 6;
          assert.deepEqual(cc.lang.pushToTimeline.result, [
            ["/b_new" , instance.bufnum, 0, instance.channels],
          ]);
          assert.deepEqual(cc.lang.sendToServer.result, [uint8]);
        });
        it("read:range(2, -1)", function() {
          instance = cc.global.Buffer.read("id", 2, -1);
          var uint8 = new Uint8Array(C.BUFSRC_HEADER_SIZE + 2 * 2 * 4);
          var int16 = new Uint16Array(uint8.buffer);
          var int32 = new Uint32Array(uint8.buffer);
          var f32   = new Float32Array(uint8.buffer);
          int16[0] = C.BINARY_CMD_SET_BUFSRC;
          int16[1] = instance.bufnum;
          int16[3] = 2;
          int32[2] = 44100;
          int32[3] = 2;
          f32[ 4] = 5;
          f32[ 5] = 6;
          f32[ 6] = 7;
          f32[ 7] = 8;
          assert.deepEqual(cc.lang.pushToTimeline.result, [
            ["/b_new" , instance.bufnum, 0, instance.channels],
          ]);
          assert.deepEqual(cc.lang.sendToServer.result, [uint8]);
        });
        it("error", function() {
          assert.throws(function() {
            instance = cc.global.Buffer.read(null);
          });
        });
      });
      it("#free", function() {
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
      it("#asString", function() {
        actual = instance.asString();
        expected = "Buffer(#bufnum, 0, 1, 44100, null)";
        expected = expected.replace("#bufnum", instance.bufnum);
        assert.equal(actual, expected);
      });
    });
  });

});
