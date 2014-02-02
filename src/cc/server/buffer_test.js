define(function(require, exports, module) {
  "use strict";

  var assert = require("chai").assert;
  var testTools = require("../../testTools");

  var cc = require("./cc");
  var buffer = require("./buffer");

  describe("server/buffer.js", function() {
    var buf, actual, expected;
    
    testTools.mock("server");
    
    describe("Buffer", function() {
      it("create", function() {
        buf = cc.createServerBuffer(0, 0, 16, 2);
        assert.instanceOf(buf, buffer.Buffer);
      });
      it("new", function() {
        buf = new buffer.Buffer(null, 0, 16, 2);
        assert.equal(buf.bufnum, 0);
        assert.equal(buf.frames, 16);
        assert.equal(buf.channels, 2);
        assert.equal(buf.sampleRate, 44100);
        assert.equal(buf.samples.length, 32);
      });
      describe("#bind", function() {
        it("normal", function() {
          buf = new buffer.Buffer(null, 0, 16, 2);
          buf.bind(8000, 4, 16, null);
          assert.equal(buf.frames, 16);
          assert.equal(buf.channels, 4);
          assert.equal(buf.sampleRate, 8000);
          assert.equal(buf.samples, null);
        });
      });
      describe("#zero", function() {
        it("normal", function() {
          buf = new buffer.Buffer(null, 0, 16, 2);
          for (var i = 0; i < buf.samples.length; i++) {
            buf.samples[0] = Math.random();
          }
          buf.zero();
          actual   = buf.samples;
          expected = new Float32Array([
            0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0
          ]);
          assert.deepEqual(actual, expected);
        });
      });
      describe("#fill", function() {
        it("normal", function() {
          buf = new buffer.Buffer(null, 0, 16, 1);
          buf.fill([1, 2, 1, 5, 3, 2, 15, 10, 3]);
          actual   = buf.samples;
          expected = new Float32Array([ 0, 1, 1, 0, 0, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 3 ]);
          assert.deepEqual(actual, expected);
        });
        it("lack params", function() {
          buf = new buffer.Buffer(null, 0, 16, 1);
          buf.fill([10, 2]);
          actual   = buf.samples;
          expected = new Float32Array([ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ]);
          assert.deepEqual(actual, expected);
        });
      });
      describe("#set", function() {
        it("normal", function() {
          buf = new buffer.Buffer(null, 0, 16, 2);
          buf.set([
            0, 1,
            1, "not number",
            8, [2, 3, 4, 5, NaN, "not number"],
            1, NaN,
              -1, -1, // out of range
            16, 6,
            32, 32, // out of range
            30, [ 7, 8, 9 ], // out of range
          ]);
          actual   = buf.samples;
          expected = new Float32Array([
            1, 0, 0, 0, 0, 0, 0, 0,
            2, 3, 4, 5, 0, 0, 0, 0,
            6, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 7, 8
          ]);
          assert.deepEqual(actual, expected);
        });
      });
      describe("#get", function() {
        it("normal", function() {
          buf = new buffer.Buffer(null, 0, 16, 1);
          buf.samples = new Float32Array([ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 ]);
          buf.get(14, 1);
          assert.deepEqual(cc.server.sendToLang.result, [
            [ "/b_get", 1, 14 ]
          ]);
        });
        it("out of index", function() {
          buf = new buffer.Buffer(null, 0, 16, 1);
          buf.samples = new Float32Array([ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 ]);
          buf.get(20, 2);
          assert.deepEqual(cc.server.sendToLang.result, [
            [ "/b_get", 2, 0 ]
          ]);
        });
      });
      describe("#getn", function() {
        it("normal", function() {
          buf = new buffer.Buffer(null, 0, 16, 1);
          buf.samples = new Float32Array([ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 ]);
          buf.getn(1, 4, 1);
          assert.deepEqual(cc.server.sendToLang.result, [
            [ "/b_getn", 1, 1, 2, 3, 4 ]
          ]);
        });
        it("out of index", function() {
          buf = new buffer.Buffer(null, 0, 16, 1);
          buf.samples = new Float32Array([ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 ]);
          buf.getn(20, 4, 1);
          assert.deepEqual(cc.server.sendToLang.result, [
            [ "/b_getn", 1, 0, 0, 0, 0 ]
          ]);
        });
      });
      describe("#gen", function() {
        it("copy", function() {
          var world = { buffers:[] };
          world.buffers[0] = {
            samples: new Float32Array([ 1, 2, 3, 4, 5 ])
          };
          buf = new buffer.Buffer(world, 0, 4, 1);
          buf.gen("copy", 0, [0, 1, 2, -1 ]);
          actual   = buf.samples;
          expected = new Float32Array([ 0, 3, 4, 5 ]);
          assert.deepCloseTo(actual, expected, 1e-6);
        });
        it("copy (with length)", function() {
          var world = { buffers:[] };
          world.buffers[0] = {
            samples: new Float32Array([ 1, 2, 3, 4, 5 ])
          };
          buf = new buffer.Buffer(world, 0, 4, 1);
          buf.gen("copy", 0, [0, 1, 2, 2 ]);
          actual   = buf.samples;
          expected = new Float32Array([ 0, 3, 4, 0 ]);
          assert.deepCloseTo(actual, expected, 1e-6);
        });
        it("copy (missing)", function() {
          var world = { buffers:[] };
          world.buffers[0] = {
            samples: new Float32Array([ 1, 2, 3, 4, 5 ])
          };
          buf = new buffer.Buffer(world, 0, 4, 1);
          buf.gen("copy", 0, [10, 1, 2, -1 ]);
          actual   = buf.samples;
          expected = new Float32Array([ 0, 0, 0, 0 ]);
          assert.deepCloseTo(actual, expected, 1e-6);
        });
        
        it("normalize", function() {
          buf = new buffer.Buffer(null, 0, 16, 1);
          buf.samples = new Float32Array([ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16 ]);
          buf.gen("normalize", 0, [2]);
          actual   = buf.samples;
          expected = new Float32Array([ 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1, 1.125, 1.25, 1.375, 1.5, 1.625, 1.75, 1.875, 2 ]);
          assert.deepCloseTo(actual, expected, 1e-6);
        });
        it("normalize (wavetable)", function() {
          buf = new buffer.Buffer(null, 0, 16, 1);
          buf.samples = new Float32Array([ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16 ]);
          buf.gen("normalize", 2, [2]);
          actual   = buf.samples;
          expected = new Float32Array([ 0.064516127109528, 0.12903225421906, 0.19354838132858, 0.25806450843811, 0.32258063554764, 0.38709676265717, 0.45161288976669, 0.51612901687622, 0.58064514398575, 0.64516127109528, 0.7096773982048, 0.77419352531433, 0.83870965242386, 0.90322577953339, 0.96774190664291, 1.0322580337524 ]);
          assert.deepCloseTo(actual, expected, 1e-6);
        });
        it("normalize (do nothing)", function() {
          buf = new buffer.Buffer(null, 0, 16, 1);
          buf.samples = new Float32Array([ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16 ]);
          buf.gen("normalize", 0, [16]);
          actual   = buf.samples;
          expected = new Float32Array([ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16 ]);
          assert.deepCloseTo(actual, expected, 1e-6);
        });
        it("normalize (wavetable, do nothing)", function() {
          buf = new buffer.Buffer(null, 0, 16, 1);
          buf.samples = new Float32Array([ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16 ]);
          buf.gen("normalize", 2, [31]);
          actual   = buf.samples;
          expected = new Float32Array([ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16 ]);
          assert.deepCloseTo(actual, expected, 1e-6);
        });
        it("sine1", function() {
          buf = new buffer.Buffer(null, 0, 16, 1);
          buf.gen("sine1", 4, [1, 2, 0]);
          actual   = buf.samples;
          expected = new Float32Array([ 0, 1.7968969345093, 2.7071068286896, 2.3380930423737, 1, -0.49033406376839, -1.2928931713104, -1.0315301418304, -3.6739402930577e-16, 1.0315301418304, 1.2928931713104, 0.49033406376839, -1, -2.3380930423737, -2.7071068286896, -1.7968969345093 ]);
          assert.deepCloseTo(actual, expected, 1e-6);
        });
        it("sine1 (normalize)", function() {
          buf = new buffer.Buffer(null, 0, 16, 1);
          buf.gen("sine1", 5, [1, 2]);
          actual   = buf.samples;
          expected = new Float32Array([ 0, 0.66377025842667, 1, 0.86368703842163, 0.36939805746078, -0.18112844228745, -0.47759222984314, -0.38104522228241, -1.3571463636396e-16, 0.38104522228241, 0.47759222984314, 0.18112844228745, -0.36939805746078, -0.86368703842163, -1, -0.66377025842667 ]);
          assert.deepCloseTo(actual, expected, 1e-6);
        });
        it("sine1 (wavetable)", function() {
          buf = new buffer.Buffer(null, 0, 16, 1);
          buf.gen("sine1", 6, [1, 2, 0]);
          actual   = buf.samples;
          expected = new Float32Array([ -2.7071068286896, 3.3708770275116, 5.4142136573792, -0.84341979026794, 3.6622912883759, -2.4740216732025, -3.063378572464, 0.91184794902802, -1.2928932905197, 1.6739385128021, 4.0633788108826, -2.1117646694183, 0.33770871162415, -2.5707938671112, -6.4142136573792, 2.0433366298676 ]);
        });
        it("sine1 (not clear)", function() {
          buf = new buffer.Buffer(null, 0, 16, 1);
          buf.samples[0] = 10;
          buf.gen("sine1", 0, [1, 2]);
          actual   = buf.samples;
          expected = new Float32Array([ 10, 1.7968969345093, 2.7071068286896, 2.3380930423737, 1, -0.49033406376839, -1.2928931713104, -1.0315301418304, -3.6739402930577e-16, 1.0315301418304, 1.2928931713104, 0.49033406376839, -1, -2.3380930423737, -2.7071068286896, -1.7968969345093 ]);
          assert.deepCloseTo(actual, expected, 1e-6);
        });
        it("sine1 (all)", function() {
          buf = new buffer.Buffer(null, 0, 16, 1);
          buf.gen("sine1", 7, [1, 2]);
          actual   = buf.samples;
          expected = new Float32Array([ -0.99999994039536, 0.99999994039536, 1.6306017637253, -0.63060182332993, 1.2163882255554, -0.84699022769928, -0.95518440008163, 0.47759220004082, -0.47759222984314, 0.47759222984314, 1.3245824575424, -0.84699022769928, 0.26120385527611, -0.63060188293457, -1.9999998807907, 0.99999994039536 ]);
          assert.deepCloseTo(actual, expected, 1e-6);
        });
        it("sine2", function() {
          buf = new buffer.Buffer(null, 0, 16, 1);
          buf.gen("sine2", 4, [1, 0.5, 2, 0.25]);
          actual   = buf.samples;
          expected = new Float32Array([ 0, 0.3681184053421, 0.60355341434479, 0.63871645927429, 0.5, 0.2851630449295, 0.10355338454247, 0.014565018005669, 2.6718908186453e-24, -0.014565018005669, -0.10355338454247, -0.2851630449295, -0.5, -0.63871645927429, -0.60355341434479, -0.3681184053421 ]);
          assert.deepCloseTo(actual, expected, 1e-6);
        });
        it("sine2 (normalize)", function() {
          buf = new buffer.Buffer(null, 0, 16, 1);
          buf.gen("sine2", 5, [1, 0.5, 2, 0.25]);
          actual   = buf.samples;
          expected = new Float32Array([ 0, 0.57634091377258, 0.94494736194611, 1, 0.78281998634338, 0.44646266102791, 0.16212731599808, 0.022803574800491, 4.1832189398603e-24, -0.022803574800491, -0.16212731599808, -0.44646266102791, -0.78281998634338, -1, -0.94494736194611, -0.57634091377258 ]);
          assert.deepCloseTo(actual, expected, 1e-6);
        });
        it("sine2 (wavetable)", function() {
          buf = new buffer.Buffer(null, 0, 16, 1);
          buf.gen("sine2", 6, [1, 0.5, 2, 0.25]);
          actual   = buf.samples;
          expected = new Float32Array([ -0.60355341434479, 0.60355341434479, 0.70710676908493, -0.10355338454247, 0.89644658565521, -0.39644661545753, 0.20710676908493, -0.10355338454247, 0.10355338454247, -0.10355338454247, 0.29289320111275, -0.39644661545753, -0.39644658565521, -0.10355338454247, -1.2071068286896, 0.60355335474014 ]);
          assert.deepCloseTo(actual, expected, 1e-6);
        });
        it("sine2 (not clear)", function() {
          buf = new buffer.Buffer(null, 0, 16, 1);
          buf.samples[0] = 10;
          buf.gen("sine2", 0, [1, 0.5, 2, 0.25]);
          actual   = buf.samples;
          expected = new Float32Array([ 10, 0.3681184053421, 0.60355341434479, 0.63871645927429, 0.5, 0.2851630449295, 0.10355338454247, 0.014565018005669, 2.6718908186453e-24, -0.014565018005669, -0.10355338454247, -0.2851630449295, -0.5, -0.63871645927429, -0.60355341434479, -0.3681184053421 ]);
          assert.deepCloseTo(actual, expected, 1e-6);
        });
        it("sine2 (all)", function() {
          buf = new buffer.Buffer(null, 0, 16, 1);
          buf.gen("sine2", 7, [1, 0.5, 2, 0.25]);
          actual   = buf.samples;
          expected = new Float32Array([ -0.99999988079071, 0.99999988079071, 1.1715726852417, -0.17157284915447, 1.4852811098099, -0.65685415267944, 0.34314569830894, -0.17157284915447, 0.17157284915447, -0.17157284915447, 0.48528128862381, -0.65685415267944, -0.65685415267944, -0.17157284915447, -1.9999997615814, 0.99999982118607 ]);
          assert.deepCloseTo(actual, expected, 1e-6);
        });
        it("sine3", function() {
          buf = new buffer.Buffer(null, 0, 16, 1);
          buf.gen("sine3", 4, [1, 0.5, 0, 2, 0.25, 0.785]);
          actual   = buf.samples;
          expected = new Float32Array([ 0.17670629918575, 0.44134169816971, 0.53040045499802, 0.46203929185867, 0.32329368591309, 0.21193976700306, 0.17670632898808, 0.19124217331409, 0.17670629918575, 0.058658268302679, -0.17670632898808, -0.46184021234512, -0.67670631408691, -0.7119397521019, -0.53040045499802, -0.19144125282764 ]);
          assert.deepCloseTo(actual, expected, 1e-6);
        });
        it("sine3 (normalize)", function() {
          buf = new buffer.Buffer(null, 0, 16, 1);
          buf.gen("sine3", 5, [1, 0.5, 0, 2, 0.25, 0.785]);
          actual   = buf.samples;
          expected = new Float32Array([ 0.24820400774479, 0.61991441249847, 0.74500751495361, 0.64898651838303, 0.45410260558128, 0.29769340157509, 0.24820405244827, 0.26862129569054, 0.24820400774479, 0.082392178475857, -0.24820405244827, -0.64870691299438, -0.95051068067551, -1, -0.74500751495361, -0.2689009308815 ]);
          assert.deepCloseTo(actual, expected, 1e-6);
        });
        it("sine3 (wavetable)", function() {
          buf = new buffer.Buffer(null, 0, 16, 1);
          buf.gen("sine3", 6, [1, 0.5, 0, 2, 0.25, 0.785]);
          actual   = buf.samples;
          expected = new Float32Array([ -0.17698784172535, 0.3536941409111, 0.73750722408295, -0.20710675418377, 0.46988105773926, -0.14658737182617, 0.17670634388924, -2.1970631536306e-08, 0.53011894226074, -0.35341262817383, 0.32329365611076, -0.49999997019768, -0.82301211357117, 0.1463058590889, -1.2375072240829, 0.70710676908493 ]);
          assert.deepCloseTo(actual, expected, 1e-6);
        });
        it("sine3 (not clear)", function() {
          buf = new buffer.Buffer(null, 0, 16, 1);
          buf.samples[0] = 10;
          buf.gen("sine3", 0, [1, 0.5, 0, 2, 0.25, 0.785]);
          actual   = buf.samples;
          expected = new Float32Array([ 10.17670629918575, 0.44134169816971, 0.53040045499802, 0.46203929185867, 0.32329368591309, 0.21193976700306, 0.17670632898808, 0.19124217331409, 0.17670629918575, 0.058658268302679, -0.17670632898808, -0.46184021234512, -0.67670631408691, -0.7119397521019, -0.53040045499802, -0.19144125282764 ]);
          assert.deepCloseTo(actual, expected, 1e-6);
        });
        it("sine3 (all)", function() {
          buf = new buffer.Buffer(null, 0, 16, 1);
          buf.gen("sine3", 7, [1, 0.5, 0, 2, 0.25, 0.785]);
          actual   = buf.samples;
          expected = new Float32Array([ -0.26154306530952, 0.52267009019852, 1.0898483991623, -0.30605116486549, 0.69436484575272, -0.21661891043186, 0.26112708449364, -3.2467013966198e-08, 0.78338116407394, -0.52225410938263, 0.47774592041969, -0.73887294530869, -1.2162028551102, 0.21620289981365, -1.8287214040756, 1.0449242591858 ]);
          assert.deepCloseTo(actual, expected, 1e-6);
        });
        it("cheby", function() {
          buf = new buffer.Buffer(null, 0, 16, 1);
          buf.gen("cheby", 4, [1, 0, 1, 1, 0, 1]);
          actual   = buf.samples;
          expected = new Float32Array([ 0, -2.3592529296875, -1.5234375, -0.0164794921875, 1, 1.2432861328125, 0.9140625, 0.3887939453125, 0, -0.0955810546875, 0.0390625, 0.1651611328125, -4.4408920985006e-16, -0.5633544921875, -1.1484375, -0.4998779296875 ]);
          assert.deepCloseTo(actual, expected, 1e-6);
        });
        it("cheby (normalize)", function() {
          buf = new buffer.Buffer(null, 0, 16, 1);
          buf.gen("cheby", 5, [1, 0, 1, 1, 0, 1]);
          actual   = buf.samples;
          expected = new Float32Array([ 0, -1, -0.64572876691818, -0.0069850469008088, 0.42386299371719, 0.52698296308517, 0.38743725419044, 0.16479536890984, 0, -0.040513273328543, 0.016557147726417, 0.070005692541599, -1.8823298196455e-16, -0.23878511786461, -0.48678016662598, -0.21187976002693 ]);
          assert.deepCloseTo(actual, expected, 1e-6);
        });
        it("cheby (wavetable)", function() {
          buf = new buffer.Buffer(null, 0, 16, 1);
          buf.gen("cheby", 6, [1, 0, 1, 1, 0, 1]);
          actual   = buf.samples;
          expected = new Float32Array([ 1.5234375, -1.5234375, -4.046875, 2.5234375, 1.0859375, -0.0859375, 1.828125, -0.9140625, -0.0390625, 0.0390625, 0.078125, -0.0390625, 1.1484375, -1.1484375, -6.296875, 5.1484375 ]);
          assert.deepCloseTo(actual, expected, 1e-6);
        });
        it("cheby (not clear)", function() {
          buf = new buffer.Buffer(null, 0, 16, 1);
          buf.samples[0] = 10;
          buf.gen("cheby", 0, [1, 0, 1, 1, 0, 1]);
          actual   = buf.samples;
          expected = new Float32Array([ 10, -2.3592529296875, -1.5234375, -0.0164794921875, 1, 1.2432861328125, 0.9140625, 0.3887939453125, 0, -0.0955810546875, 0.0390625, 0.1651611328125, -4.4408920985006e-16, -0.5633544921875, -1.1484375, -0.4998779296875 ]);
          assert.deepCloseTo(actual, expected, 1e-6);
        });
        it("cheby (all)", function() {
          buf = new buffer.Buffer(null, 0, 16, 1);
          buf.gen("cheby", 7, [1, 0, 1, 1, 0, 1]);
          actual   = buf.samples;
          expected = new Float32Array([ 1, -1, -2.6564104557037, 1.6564103364944, 0.71282052993774, -0.056410256773233, 1.2000000476837, -0.60000002384186, -0.025641025975347, 0.025641025975347, 0.051282051950693, -0.025641025975347, 0.75384616851807, -0.75384616851807, -4.1333336830139, 3.3794872760773 ]);
          assert.deepCloseTo(actual, expected, 1e-6);
        });
        it("unknown", function() {
          buf = new buffer.Buffer(null, 0, 16, 2);
          buf.gen("unknown", 0, [1, 2, 3, 4, 5, 6, 7]);
          actual   = buf.samples;
          expected = new Float32Array([
            0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0
          ]);
          assert.deepEqual(actual, expected);
        });
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
