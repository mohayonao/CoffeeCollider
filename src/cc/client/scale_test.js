define(function(require, exports, module) {

  var assert = require("chai").assert;

  var scale = require("./scale");
  var _Scale  = scale.Scale;
  var _Tuning = scale.Tuning;

  assert.deepCloseTo = function(expected, actual, delta) {
    expected.forEach(function(x, i) {
      assert.closeTo(x, actual[i], delta);
    });
  };
  
  describe("scale.js", function() {
    before(function() {
      scale.exports();
    });
    describe("Tuning", function() {
      var et12, just, expected, actual;
      before(function() {
        et12 = Tuning.et12;
        just = Tuning.just;
      });
      it("create", function() {
        var list = [0,1,2,3,4,5,6,7,8,9,10,11];
        var t = Tuning(list, 2, "test");
        assert.instanceOf(t, _Tuning);
        assert.equal(t.name, "test");
      });
      it("semitones", function() {
        actual = et12.semitones();
        expected = [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11 ];
        assert.deepEqual(actual, expected);

        actual = just.semitones();
        expected = [ 0, 1.1173128526978, 2.0391000173077, 3.1564128700055, 3.8631371386483, 4.9804499913461, 5.9022371559561, 7.0195500086539, 8.1368628613517, 8.8435871299945, 10.175962878659, 10.882687147302 ];
        assert.deepCloseTo(actual, expected, 1e-6);
      });
      it("cents", function() {
        actual = et12.cents();
        expected = [ 0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100 ];
        assert.deepEqual(actual, expected);

        actual = just.cents();
        expected = [ 0, 111.73128526978, 203.91000173077, 315.64128700055, 386.31371386483, 498.04499913461, 590.22371559561, 701.95500086539, 813.68628613517, 884.35871299945, 1017.5962878659, 1088.2687147302 ];
        assert.deepCloseTo(actual, expected, 1e-6);
      });
      it("ratios", function() {
        actual = et12.ratios();
        expected = [ 1, 1.0594630943591, 1.1224620483089, 1.1892071150019, 1.2599210498937, 1.3348398541685, 1.4142135623711, 1.4983070768743, 1.5874010519653, 1.6817928305039, 1.7817974362766, 1.8877486253586 ];
        assert.deepCloseTo(actual, expected, 1e-6);

        actual = just.ratios();
        expected = [ 1, 1.0666666666664, 1.1249999999995, 1.1999999999991, 1.2499999999989, 1.3333333333318, 1.4062499999981, 1.4999999999976, 1.599999999997, 1.6666666666633, 1.7999999999958, 1.8749999999953 ];
        assert.deepCloseTo(actual, expected, 1e-6);
      });
      it("at", function() {
        assert.equal(et12.at(0), 0);
        assert.equal(et12.at(1), 1);
        assert.equal(et12.at(2), 2);
        assert.deepEqual(et12.at([3, 4, 5]), [3, 4, 5]);
        assert.isUndefined(et12.at(12));
        assert.isUndefined(et12.at(-1));
      });
      it("wrapAt", function() {
        assert.equal(et12.wrapAt(0), 0);
        assert.equal(et12.wrapAt(1), 1);
        assert.equal(et12.wrapAt(2), 2);
        assert.equal(et12.wrapAt(12), 0);
        assert.equal(et12.wrapAt(-1), 11);
      });
      it("octaveRatio", function() {
        assert.equal(et12.octaveRatio(), 2);
      });
      it("size", function() {
        assert.equal(et12.size(), 12);
      });
      it("stepsPerOctave", function() {
        assert.equal(et12.stepsPerOctave(), 12);
      });
      it("tuning", function() {
        actual = et12.tuning();
        expected = [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11 ];
        assert.deepEqual(actual, expected);

        actual = just.tuning();
        expected = [ 0, 1.1173128526978, 2.0391000173077, 3.1564128700055, 3.8631371386483, 4.9804499913461, 5.9022371559561, 7.0195500086539, 8.1368628613517, 8.8435871299945, 10.175962878659, 10.882687147302 ];
        assert.deepCloseTo(actual, expected, 1e-6);
      });
      it("equals / copy", function() {
        var copied = just.copy();
        assert.notEqual(copied, just);
        assert.ok(just.equals(copied));
      });
    });
    describe("Scale", function() {
      var major, kumoi, expected, actual;
      before(function() {
        major = Scale.major;
        kumoi = Scale.kumoi;
      });
      it("create", function() {
        var list = [0,2,4,5,7,9,11];
        var s = Scale(list, 12, null, "test");
        assert.instanceOf(s, _Scale);
        assert.equal(s.name, "test");
      });
      it("tuning", function() {
        major.tuning(Tuning.just);
        assert.notOk(major.tuning().equals(Tuning.et12));
        major.tuning(Tuning.at("et12"));
        assert.notEqual(major.tuning(), Tuning.et12);
        assert.ok(major.tuning().equals(Tuning.et12));
      });
      it("semitones", function() {
        actual = major.semitones();
        expected = [ 0, 2, 4, 5, 7, 9, 11 ];
        assert.deepEqual(actual, expected);

        actual = kumoi.semitones();
        expected = [ 0, 2, 3, 7, 9 ];
        assert.deepEqual(actual, expected);
      });
      it("cents", function() {
        actual = major.cents();
        expected = [ 0, 200, 400, 500, 700, 900, 1100 ];
        assert.deepEqual(actual, expected);

        actual = kumoi.cents();
        expected = [ 0, 200, 300, 700, 900 ];
        assert.deepEqual(actual, expected);
      });
      it("ratios", function() {
        actual = major.ratios();
        expected = [ 1, 1.1224620483089, 1.2599210498937, 1.3348398541685, 1.4983070768743, 1.6817928305039, 1.8877486253586 ];
        assert.deepCloseTo(actual, expected, 1e-6);

        actual = kumoi.ratios();
        expected = [ 1, 1.1224620483089, 1.1892071150019, 1.4983070768743, 1.6817928305039 ];[ 0, 200, 300, 700, 900 ];
        assert.deepCloseTo(actual, expected, 1e-6);
      });
      it("size", function() {
        actual = major.size();
        expected = 7;
        assert.equal(actual, expected);

        actual = kumoi.size();
        expected = 5;
        assert.equal(actual, expected);
      });
      it("pitchesPerOctave", function() {
        actual = major.pitchesPerOctave();
        expected = 12;
        assert.equal(actual, expected);

        actual = kumoi.pitchesPerOctave();
        expected = 12;
        assert.equal(actual, expected);
      });
      it("stepsPerOctave", function() {
        actual = major.stepsPerOctave();
        expected = 12;
        assert.equal(actual, expected);

        actual = kumoi.stepsPerOctave();
        expected = 12;
        assert.equal(actual, expected);
      });
      it("at", function() {
        assert.equal(major.at(0), 0);
        assert.equal(major.at(1), 2);
        assert.equal(major.at(2), 4);
        assert.deepEqual(major.at([3,4,5]), [5,7,9]);
        assert.equal(major.at(12), 9);
        assert.equal(major.at(-1), 11);
      });
      it("wrapAt", function() {
        assert.equal(major.wrapAt(0), 0);
        assert.equal(major.wrapAt(1), 2);
        assert.equal(major.wrapAt(2), 4);
        assert.deepEqual(major.wrapAt([3,4,5]), [5,7,9]);
        assert.equal(major.wrapAt(12), 9);
        assert.equal(major.wrapAt(-1), 11);
      });
      it("degreeToFreq", function() {
        actual   = major.degreeToFreq(5, 440, 0);
        expected = 739.98884542173;
        assert.closeTo(actual, expected, 1e-6);

        actual   = kumoi.degreeToFreq([1,2,3], 440, [0, 1, -1]);
        expected = [ 493.8833012559, 1046.5022612017, 329.62755691234 ];
        assert.deepCloseTo(actual, expected, 1e-6);
      });
      it("degreeToRatio", function() {
        actual   = major.degreeToRatio(5, 1);
        expected = 3.3635856610079;
        assert.closeTo(actual, expected, 1e-6);

        actual   = kumoi.degreeToRatio([1,2,3], [0,1,-1]);
        expected = [ 1.1224620483089, 2.3784142300038, 0.74915353843713 ];
        assert.deepCloseTo(actual, expected, 1e-6);
      });
      it("degrees", function() {
        actual   = major.degrees();
        expected = [ 0, 2, 4, 5, 7, 9, 11 ];
        assert.deepEqual(actual, expected);

        actual   = kumoi.degrees();
        expected = [ 0, 2, 3, 7, 9 ];
        assert.deepEqual(actual, expected);
      });
      it("octaveRatio", function() {
        actual   = major.octaveRatio();
        expected = 2;
        assert.equal(actual, expected);

        actual   = kumoi.octaveRatio();
        expected = 2;
        assert.equal(actual, expected);
      });
      it("equals", function() {
        var copied = major.copy();
        assert.notEqual(copied, major);
        assert.ok(major.equals(copied));
      });
    });
  });

});
