define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var testTools = require("../../testTools");

  var cc = require("./cc");
  var buffer = require("./buffer");

  describe("server/buffer.js", function() {
    var instance, actual, expected;
    
    testTools.mock("server");
    
    describe("Buffer", function() {
      it("create", function() {
        instance = cc.createServerBuffer(0, 16, 2);
        assert.instanceOf(instance, buffer.Buffer);
      });
      it("new", function() {
        instance = new buffer.Buffer(0, 16, 2);
        assert.equal(instance.bufnum, 0);
        assert.equal(instance.frames, 16);
        assert.equal(instance.channels, 2);
        assert.equal(instance.sampleRate, 44100);
        assert.equal(instance.samples.length, 32);
      });
      it("bind", function() {
        instance = new buffer.Buffer(0, 16, 2);
        instance.bind(8000, 4, 16, null);
        assert.equal(instance.frames, 16);
        assert.equal(instance.channels, 4);
        assert.equal(instance.sampleRate, 8000);
        assert.equal(instance.samples, null);
        
      });
      it("set", function() {
        instance = new buffer.Buffer(0, 16, 2);
        instance.set([
          0, 1,
          1, "not number",
          8, [2, 3, 4, 5, NaN, "not number"],
          1, NaN,
          -1, -1, // out of range
          16, 6,
          32, 32, // out of range
          30, [ 7, 8, 9 ], // out of range
        ]);
        actual   = instance.samples;
        expected = new Float32Array([
          1, 0, 0, 0, 0, 0, 0, 0,
          2, 3, 4, 5, 0, 0, 0, 0,
          6, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 7, 8
        ]);
        assert.deepEqual(actual, expected);
      });
      it("zero", function() {
        instance = new buffer.Buffer(0, 16, 2);
        for (var i = 0; i < instance.samples.length; i++) {
          instance.samples[0] = Math.random();
        }
        instance.zero();
        actual   = instance.samples;
        expected = new Float32Array([
          0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0
        ]);
        assert.deepEqual(actual, expected);
      });
      it("gen(sine1)", function() {
        instance = new buffer.Buffer(0, 16, 1);
        instance.gen("sine1", 0, [1, 2, 0]);
        actual   = instance.samples;
        expected = new Float32Array([ 0, 1.7968969345093, 2.7071068286896, 2.3380930423737, 1, -0.49033406376839, -1.2928931713104, -1.0315301418304, -3.6739402930577e-16, 1.0315301418304, 1.2928931713104, 0.49033406376839, -1, -2.3380930423737, -2.7071068286896, -1.7968969345093 ]);
        assert.deepCloseTo(actual, expected, 1e-6);
      });
      it("gen(sine1) normalize", function() {
        instance = new buffer.Buffer(0, 16, 1);
        instance.gen("sine1", 1, [1, 2]);
        actual   = instance.samples;
        expected = new Float32Array([ 0, 0.66377025842667, 1, 0.86368703842163, 0.36939805746078, -0.18112844228745, -0.47759222984314, -0.38104522228241, -1.3571463636396e-16, 0.38104522228241, 0.47759222984314, 0.18112844228745, -0.36939805746078, -0.86368703842163, -1, -0.66377025842667 ]);
        assert.deepCloseTo(actual, expected, 1e-6);
      });
      it("gen(sine1) wavetable", function() {
        instance = new buffer.Buffer(0, 16, 1);
        instance.gen("sine1", 2, [1, 2, 0]);
        actual   = instance.samples;
        expected = new Float32Array([ -2.7071068286896, 3.3708770275116, 5.4142136573792, -0.84341979026794, 3.6622912883759, -2.4740216732025, -3.063378572464, 0.91184794902802, -1.2928932905197, 1.6739385128021, 4.0633788108826, -2.1117646694183, 0.33770871162415, -2.5707938671112, -6.4142136573792, 2.0433366298676 ]);
      });
      it("gen(sine1) clear", function() {
        instance = new buffer.Buffer(0, 16, 1);
        instance.gen("sine1", 0, [1, 2]);
        instance.gen("sine1", 4, [1, 2]);
        actual   = instance.samples;
        expected = new Float32Array([ 0, 1.7968969345093, 2.7071068286896, 2.3380930423737, 1, -0.49033406376839, -1.2928931713104, -1.0315301418304, -3.6739402930577e-16, 1.0315301418304, 1.2928931713104, 0.49033406376839, -1, -2.3380930423737, -2.7071068286896, -1.7968969345093 ]);
        assert.deepCloseTo(actual, expected, 1e-6);
      });
      it("gen(sine1) normalize/wavetable/clear", function() {
        instance = new buffer.Buffer(0, 16, 1);
        instance.gen("sine1", 7, [1, 2]);
        actual   = instance.samples;
        expected = new Float32Array([ -0.99999994039536, 0.99999994039536, 1.6306017637253, -0.63060182332993, 1.2163882255554, -0.84699022769928, -0.95518440008163, 0.47759220004082, -0.47759222984314, 0.47759222984314, 1.3245824575424, -0.84699022769928, 0.26120385527611, -0.63060188293457, -1.9999998807907, 0.99999994039536 ]);
        assert.deepCloseTo(actual, expected, 1e-6);
      });
      
      it("gen(sine2)", function() {
        instance = new buffer.Buffer(0, 16, 1);
        instance.gen("sine2", 4, [1, 0.5, 2, 0.25]);
        actual   = instance.samples;
        expected = new Float32Array([ 0, 0.3681184053421, 0.60355341434479, 0.63871645927429, 0.5, 0.2851630449295, 0.10355338454247, 0.014565018005669, 2.6718908186453e-24, -0.014565018005669, -0.10355338454247, -0.2851630449295, -0.5, -0.63871645927429, -0.60355341434479, -0.3681184053421 ]);
        assert.deepCloseTo(actual, expected, 1e-6);
      });
      it("gen(sine2) wavetable", function() {
        instance = new buffer.Buffer(0, 16, 1);
        instance.gen("sine2", 6, [1, 0.5, 2, 0.25]);
        actual   = instance.samples;
        expected = new Float32Array([ -0.60355341434479, 0.60355341434479, 0.70710676908493, -0.10355338454247, 0.89644658565521, -0.39644661545753, 0.20710676908493, -0.10355338454247, 0.10355338454247, -0.10355338454247, 0.29289320111275, -0.39644661545753, -0.39644658565521, -0.10355338454247, -1.2071068286896, 0.60355335474014 ]);
        assert.deepCloseTo(actual, expected, 1e-6);
      });
      it("gen(sine3)", function() {
        instance = new buffer.Buffer(0, 16, 1);
        instance.gen("sine3", 4, [1, 0.5, 0, 2, 0.25, 0.785]);
        actual   = instance.samples;
        expected = new Float32Array([ 0.17670629918575, 0.44134169816971, 0.53040045499802, 0.46203929185867, 0.32329368591309, 0.21193976700306, 0.17670632898808, 0.19124217331409, 0.17670629918575, 0.058658268302679, -0.17670632898808, -0.46184021234512, -0.67670631408691, -0.7119397521019, -0.53040045499802, -0.19144125282764 ]);
        assert.deepCloseTo(actual, expected, 1e-6);
      });
      it("gen(sine3) wavetable", function() {
        instance = new buffer.Buffer(0, 16, 1);
        instance.gen("sine3", 6, [1, 0.5, 0, 2, 0.25, 0.785]);
        actual   = instance.samples;
        expected = new Float32Array([ -0.17698784172535, 0.3536941409111, 0.73750722408295, -0.20710675418377, 0.46988105773926, -0.14658737182617, 0.17670634388924, -2.1970631536306e-08, 0.53011894226074, -0.35341262817383, 0.32329365611076, -0.49999997019768, -0.82301211357117, 0.1463058590889, -1.2375072240829, 0.70710676908493 ]);
        assert.deepCloseTo(actual, expected, 1e-6);
      });
      it("gen(cheby)", function() {
        instance = new buffer.Buffer(0, 16, 1);
        instance.gen("cheby", 4, [1, 0, 1, 1, 0, 1]);
        actual   = instance.samples;
        expected = new Float32Array([ 0, -2.3592529296875, -1.5234375, -0.0164794921875, 1, 1.2432861328125, 0.9140625, 0.3887939453125, 0, -0.0955810546875, 0.0390625, 0.1651611328125, -4.4408920985006e-16, -0.5633544921875, -1.1484375, -0.4998779296875 ]);
        assert.deepCloseTo(actual, expected, 1e-6);
      });
      it("gen(cheby) wavetable", function() {
        instance = new buffer.Buffer(0, 16, 1);
        instance.gen("cheby", 6, [1, 0, 1, 1, 0, 1]);
        actual   = instance.samples;
        expected = new Float32Array([ 1.5234375, -1.5234375, -4.046875, 2.5234375, 1.0859375, -0.0859375, 1.828125, -0.9140625, -0.0390625, 0.0390625, 0.078125, -0.0390625, 1.1484375, -1.1484375, -6.296875, 5.1484375 ]);
        assert.deepCloseTo(actual, expected, 1e-6);
      });
      it("gen(unknown)", function() {
        instance = new buffer.Buffer(0, 16, 2);
        instance.gen("unknown", 0, [1, 2, 3, 4, 5, 6, 7]);
        actual   = instance.samples;
        expected = new Float32Array([
          0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0
        ]);
        assert.deepEqual(actual, expected);
      });
    });
    describe("private methods", function() {
      var data, w_data;
      beforeEach(function() {
        data   = new Float32Array([10, 5, 0, -5, -10]);
        w_data = new Float32Array([10, 0, 5, 0, 0, 0, -5, 0, -10, 0]);
      });
      it("normalize", function() {
        buffer.normalize_samples(5, data, 1);
        actual   = data;
        expected = new Float32Array([1, 0.5, 0, -0.5, -1]);
        assert.deepCloseTo(actual, expected, 1e-6);
      });
      it("normalize_w", function() {
        buffer.normalize_wsamples(10, w_data, 1);
        actual   = w_data;
        expected = new Float32Array([1, 0, 0.5, 0, 0, 0, -0.5, 0, -1, 0]);
        assert.deepCloseTo(actual, expected, 1e-6);
      });
    });
  });

});
