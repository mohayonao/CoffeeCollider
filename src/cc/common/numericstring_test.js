define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;
  var cc = require("../cc");
  var numericstring = require("./numericstring");

  var calcNote  = numericstring.calcNote;
  var calcBeat  = numericstring.calcBeat;
  var calcTicks = numericstring.calcTicks;
  
  describe("common/numericstring.js", function() {
    before(function() {
      cc.sampleRate = 44100;    
    });
    it("hz", function() {
      assert.equal(numericstring.hz("50hz")   , 1/50);
      assert.equal(numericstring.hz("50.5hz"), 1/50.5);
      assert.isNull(numericstring.hz("hz"));
    });
    it("ms", function() {
      assert.equal(numericstring.time("50ms")    , 50/1000);
      assert.equal(numericstring.time("50.5m")   , 50.5/1000);
      assert.equal(numericstring.time("50.5msec"), 50.5/1000);
      assert.isNull(numericstring.time("ms"));
    });
    it("sec", function() {
      assert.equal(numericstring.time("50sec")   , 50);
      assert.equal(numericstring.time("50.5secs"), 50.5);
      assert.isNull(numericstring.time("sec"));
    });
    it("min", function() {
      assert.equal(numericstring.time("50min")   , 50 * 60);
      assert.equal(numericstring.time("50.5mins"), 50.5 * 60);
      assert.isNull(numericstring.time("min"));
    });
    it("hhmmss", function() {
      assert.equal(numericstring.hhmmss("1:2:3.4"), (1 * 3600) + (2 * 60) + 3 + 0.4);
      assert.equal(numericstring.hhmmss("1:2:3")  , (1 * 3600) + (2 * 60) + 3);
      assert.equal(numericstring.hhmmss("1:02")   , (1 * 60) + 2);
      assert.equal(numericstring.hhmmss("61:02")  , (61 * 60) + 2);
      
      assert.equal(numericstring.hhmmss("1:00")    , 60);
      assert.equal(numericstring.hhmmss("1:02.3"  ), 62.3);
      assert.equal(numericstring.hhmmss("1:02.345"), 62.345);
      assert.equal(numericstring.hhmmss("1:02:03") , 3723);
      assert.equal(numericstring.hhmmss("1.234")   , 1.234);
      assert.equal(numericstring.hhmmss("1234")    , 1234);
      
      assert.equal(numericstring.hhmmss("0:00:00.500"), 0.5);
    });
    it("samples", function() {
      assert.equal(numericstring.samples("1000samples"), 1000 / cc.sampleRate);
      assert.equal(numericstring.samples("1000samples/8000hz"), 1000 / 8000);
      assert.isNull(numericstring.samples("samples"));
    });
    it("note", function() {
      assert.equal(numericstring.note("bpm140 l8"), calcNote(140, 8, 0));
      assert.equal(numericstring.note("bpm100 l16.."), calcNote(100, 16, 2));
      assert.equal(numericstring.note("bpm100.5 L16"), calcNote(100.5, 16, 0));
      assert.equal(numericstring.note("bpm100 l16....."), calcNote(100, 16, 5));
      assert.isNull(numericstring.note("bpm100.5"));
    });
    it("beat", function() {
      assert.equal(numericstring.beat("bpm140 1.0.0")    , calcBeat(140, 1, 0, 0));
      assert.equal(numericstring.beat("bpm150.5 0.2.240"), calcBeat(150.5, 0, 2, 240));
      assert.isNull(numericstring.beat("bpm150.5"));
    });
    it("ticks", function() {
      assert.equal(numericstring.ticks("bpm120 480ticks"), calcTicks(120, 480));
      assert.equal(numericstring.ticks("bpm150.5 120ticks"), calcTicks(150.5, 120));
      assert.isNull(numericstring.ticks("bpm150.5"));
    });
    it("timevalue", function() {
      assert.equal(numericstring.timevalue("str")     , "str");
      
      assert.equal(numericstring.timevalue("50hz")    , 1/50);
      assert.equal(numericstring.timevalue("50.5hz")  , 1/50.5);
      assert.equal(numericstring.timevalue("50ms")    , 50/1000);
      assert.equal(numericstring.timevalue("50.5m")   , 50.5/1000);
      assert.equal(numericstring.timevalue("50sec")   , 50);
      assert.equal(numericstring.timevalue("50.5secs"), 50.5);
      assert.equal(numericstring.timevalue("50min")   , 50 * 60);
      assert.equal(numericstring.timevalue("50.5mins"), 50.5 * 60);
      assert.equal(numericstring.timevalue("1:00")    , 60);
      assert.equal(numericstring.timevalue("1:02.3"  ), 62.3);
      assert.equal(numericstring.timevalue("1:02.345"), 62.345);
      assert.equal(numericstring.timevalue("1:02:03") , 3723);
      assert.equal(numericstring.timevalue("1000samples")       , 1000 / cc.sampleRate);
      assert.equal(numericstring.timevalue("1000samples/8000hz"), 1000 / 8000);
      assert.equal(numericstring.timevalue("bpm140 l8")   , calcNote(140, 8, 0));
      assert.equal(numericstring.timevalue("bpm100 l16.."), calcNote(100, 16, 2));
      assert.equal(numericstring.timevalue("bpm100.5 L16"), calcNote(100.5, 16, 0));
      assert.equal(numericstring.timevalue("bpm140 1.0.0")    , calcBeat(140, 1, 0, 0));
      assert.equal(numericstring.timevalue("bpm150.5 0.2.240"), calcBeat(150.5, 0, 2, 240));
      assert.equal(numericstring.timevalue("bpm120 480ticks")  , calcTicks(120, 480));
      assert.equal(numericstring.timevalue("bpm150.5 120ticks"), calcTicks(150.5, 120));
    });
    it("timevalue (freq)", function() {
      assert.equal(numericstring.timevalue("~0hz")     , 0);
      
      assert.equal(numericstring.timevalue("~50hz")    , 1/(1/50));
      assert.equal(numericstring.timevalue("~50.5hz")  , 1/(1/50.5));
      assert.equal(numericstring.timevalue("~50ms")    , 1/(50/1000));
      assert.equal(numericstring.timevalue("~50.5m")   , 1/(50.5/1000));
      assert.equal(numericstring.timevalue("~50sec")   , 1/50);
      assert.equal(numericstring.timevalue("~50.5secs"), 1/(50.5));
      assert.equal(numericstring.timevalue("~50min")   , 1/(50 * 60));
      assert.equal(numericstring.timevalue("~50.5mins"), 1/(50.5 * 60));
      assert.equal(numericstring.timevalue("~1:00")    , 1/60);
      assert.equal(numericstring.timevalue("~1:02.3"  ), 1/62.3);
      assert.equal(numericstring.timevalue("~1:02.345"), 1/62.345);
      assert.equal(numericstring.timevalue("~1:02:03") , 1/3723);
      assert.equal(numericstring.timevalue("~1000samples"), 1/(1000 / cc.sampleRate));
      assert.equal(numericstring.timevalue("~1000samples/8000hz"), 1/(1000 / 8000));
      assert.equal(numericstring.timevalue("~bpm140 l8")   , 1/calcNote(140, 8, 0));
      assert.equal(numericstring.timevalue("~bpm100 l16.."), 1/calcNote(100, 16, 2));
      assert.equal(numericstring.timevalue("~bpm100.5 L16"), 1/calcNote(100.5, 16, 0));
      assert.equal(numericstring.timevalue("~bpm140 1.0.0")    , 1/calcBeat(140, 1, 0, 0));
      assert.equal(numericstring.timevalue("~bpm150.5 0.2.240"), 1/calcBeat(150.5, 0, 2, 240));
      assert.equal(numericstring.timevalue("~bpm120 480ticks")  , 1/calcTicks(120, 480));
      assert.equal(numericstring.timevalue("~bpm150.5 120ticks"), 1/calcTicks(150.5, 120));
    });
    it("notevalue", function() {
      assert.equal(numericstring.notevalue("str"), "str");
      
      assert.equal(numericstring.notevalue("A4"), 69);
      assert.equal(numericstring.notevalue("C0"), 12);
      assert.equal(numericstring.notevalue("D1"), 26);
      assert.equal(numericstring.notevalue("E2"), 40);
      assert.equal(numericstring.notevalue("F3"), 53);
      assert.equal(numericstring.notevalue("G4"), 67);
      assert.equal(numericstring.notevalue("A5"), 81);
      assert.equal(numericstring.notevalue("B6"), 95);
      assert.equal(numericstring.notevalue("A+7"), 106);
      assert.equal(numericstring.notevalue("A#8"), 118);
      assert.equal(numericstring.notevalue("A-9"), 128);
      assert.equal(numericstring.notevalue("Ab9"), 128);
    });
  });

});
