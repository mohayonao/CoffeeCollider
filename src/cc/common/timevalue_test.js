define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;
  var cc = require("../cc");
  var timevalue = require("./timevalue");

  var calcNote  = timevalue.calcNote;
  var calcBeat  = timevalue.calcBeat;
  var calcTicks = timevalue.calcTicks;
  
  describe("common/timevlaue.js", function() {
    before(function() {
      cc.sampleRate = 44100;    
    });
    it("hz", function() {
      assert.equal(timevalue.hz("50hz")   , 1/50);
      assert.equal(timevalue.hz("50.5hz"), 1/50.5);
      assert.isNull(timevalue.hz("hz"));
    });
    it("ms", function() {
      assert.equal(timevalue.time("50ms")   , 50/1000);
      assert.equal(timevalue.time("50.5m"), 50.5/1000);
      assert.isNull(timevalue.time("ms"));
    });
    it("sec", function() {
      assert.equal(timevalue.time("50sec")   , 50);
      assert.equal(timevalue.time("50.5secs"), 50.5);
      assert.isNull(timevalue.time("sec"));
    });
    it("min", function() {
      assert.equal(timevalue.time("50min")   , 50 * 60);
      assert.equal(timevalue.time("50.5mins"), 50.5 * 60);
      assert.isNull(timevalue.time("min"));
    });
    it("hhmmss", function() {
      assert.equal(timevalue.hhmmss("1:00"), 60);
      assert.equal(timevalue.hhmmss("1:02.3"  ), 62.3);
      assert.equal(timevalue.hhmmss("1:02.345"), 62.345);
      assert.equal(timevalue.hhmmss("1:02:03"), 3723);
      assert.isNull(timevalue.hhmmss("65:43"));
      assert.isNull(timevalue.hhmmss("1.234"));
    });
    it("samples", function() {
      assert.equal(timevalue.samples("1000samples"), 1000 / cc.sampleRate);
      assert.equal(timevalue.samples("1000samples/8000hz"), 1000 / 8000);
      assert.isNull(timevalue.samples("samples"));
    });
    it("note", function() {
      assert.equal(timevalue.note("bpm140 l8"), calcNote(140, 8, 0));
      assert.equal(timevalue.note("bpm100 l16.."), calcNote(100, 16, 2));
      assert.equal(timevalue.note("bpm100.5 L16"), calcNote(100.5, 16, 0));
      assert.isNull(timevalue.note("bpm100.5"));
    });
    it("beat", function() {
      assert.equal(timevalue.beat("bpm140 1.0.0")    , calcBeat(140, 1, 0, 0));
      assert.equal(timevalue.beat("bpm150.5 0.2.240"), calcBeat(150.5, 0, 2, 240));
      assert.isNull(timevalue.beat("bpm150.5"));
    });
    it("ticks", function() {
      assert.equal(timevalue.ticks("bpm120 480ticks"), calcTicks(120, 480));
      assert.equal(timevalue.ticks("bpm150.5 120ticks"), calcTicks(150.5, 120));
      assert.isNull(timevalue.ticks("bpm150.5"));
    });
    it("timevalue", function() {
      assert.equal(timevalue.calc("50hz")    , 1/50);
      assert.equal(timevalue.calc("50.5hz")  , 1/50.5);
      assert.equal(timevalue.calc("50ms")    , 50/1000);
      assert.equal(timevalue.calc("50.5m")   , 50.5/1000);
      assert.equal(timevalue.calc("50sec")   , 50);
      assert.equal(timevalue.calc("50.5secs"), 50.5);
      assert.equal(timevalue.calc("50min")   , 50 * 60);
      assert.equal(timevalue.calc("50.5mins"), 50.5 * 60);
      assert.equal(timevalue.calc("1:00")    , 60);
      assert.equal(timevalue.calc("1:02.3"  ), 62.3);
      assert.equal(timevalue.calc("1:02.345"), 62.345);
      assert.equal(timevalue.calc("1:02:03") , 3723);
      assert.equal(timevalue.calc("1000samples")       , 1000 / cc.sampleRate);
      assert.equal(timevalue.calc("1000samples/8000hz"), 1000 / 8000);
      assert.equal(timevalue.calc("bpm140 l8")   , calcNote(140, 8, 0));
      assert.equal(timevalue.calc("bpm100 l16.."), calcNote(100, 16, 2));
      assert.equal(timevalue.calc("bpm100.5 L16"), calcNote(100.5, 16, 0));
      assert.equal(timevalue.calc("bpm140 1.0.0")    , calcBeat(140, 1, 0, 0));
      assert.equal(timevalue.calc("bpm150.5 0.2.240"), calcBeat(150.5, 0, 2, 240));
      assert.equal(timevalue.calc("bpm120 480ticks")  , calcTicks(120, 480));
      assert.equal(timevalue.calc("bpm150.5 120ticks"), calcTicks(150.5, 120));
    });
    it("freqvalue", function() {
      assert.equal(timevalue.calc("~50hz")    , 1/(1/50));
      assert.equal(timevalue.calc("~50.5hz")  , 1/(1/50.5));
      assert.equal(timevalue.calc("~50ms")    , 1/(50/1000));
      assert.equal(timevalue.calc("~50.5m")   , 1/(50.5/1000));
      assert.equal(timevalue.calc("~50sec")   , 1/50);
      assert.equal(timevalue.calc("~50.5secs"), 1/(50.5));
      assert.equal(timevalue.calc("~50min")   , 1/(50 * 60));
      assert.equal(timevalue.calc("~50.5mins"), 1/(50.5 * 60));
      assert.equal(timevalue.calc("~1:00")    , 1/60);
      assert.equal(timevalue.calc("~1:02.3"  ), 1/62.3);
      assert.equal(timevalue.calc("~1:02.345"), 1/62.345);
      assert.equal(timevalue.calc("~1:02:03") , 1/3723);
      assert.equal(timevalue.calc("~1000samples"), 1/(1000 / cc.sampleRate));
      assert.equal(timevalue.calc("~1000samples/8000hz"), 1/(1000 / 8000));
      assert.equal(timevalue.calc("~bpm140 l8")   , 1/calcNote(140, 8, 0));
      assert.equal(timevalue.calc("~bpm100 l16.."), 1/calcNote(100, 16, 2));
      assert.equal(timevalue.calc("~bpm100.5 L16"), 1/calcNote(100.5, 16, 0));
      assert.equal(timevalue.calc("~bpm140 1.0.0")    , 1/calcBeat(140, 1, 0, 0));
      assert.equal(timevalue.calc("~bpm150.5 0.2.240"), 1/calcBeat(150.5, 0, 2, 240));
      assert.equal(timevalue.calc("~bpm120 480ticks")  , 1/calcTicks(120, 480));
      assert.equal(timevalue.calc("~bpm150.5 120ticks"), 1/calcTicks(150.5, 120));
    });
  });

});
