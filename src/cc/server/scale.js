define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var fn = require("./fn");
  
  var ratiomidi = function(list) {
    return list.map(function(x) {
      return Math.log(x) * Math.LOG2E * 12;
    });
  };
  var range = function(to) {
    var list = new Array(to);
    for (var i = 0; i <= to; ++i) {
      list[i] = i;
    }
    return list;
  };
  
  var Tuning = (function() {
    function Tuning(tuning, octaveRatio, name) {
      this.klassName = "Tuning";
      this._tuning = tuning;
      this._octaveRatio = octaveRatio;
      this.name = name;
    }
    fn.extend(Tuning, cc.Object);
    Tuning.prototype.semitones = function() {
      return this._tuning.slice();
    };
    Tuning.prototype.cents = function() {
      return this._tuning.map(function(x) {
        return x * 100;
      });
    };
    Tuning.prototype.ratios = function() {
      return this._tuning.map(function(x) {
        return Math.pow(2, x * 1/12);
      });
    };
    Tuning.prototype.at = fn(function(index) {
      return this._tuning[index];
    }).multiCall().build();
    Tuning.prototype.wrapAt = fn(function(index) {
      index = index % this._tuning.length;
      if (index < 0) {
        index = this._tuning.length + index;
      }
      return this._tuning[index];
    }).multiCall().build();
    Tuning.prototype.octaveRatio = function() {
      return this._octaveRatio;
    };
    Tuning.prototype.size = function() {
      return this._tuning.length;
    };
    Tuning.prototype.stepsPerOctave = function() {
      return Math.log(this._octaveRatio) * Math.LOG2E * 12;
    };
    Tuning.prototype.tuning = function() {
      return this._tuning;
    };
    Tuning.prototype.equals = function(that) {
      return (that instanceof Tuning) &&
        (this._octaveRatio === that._octaveRatio) &&
        this._tuning.every(function(x, i) {
          return x === that._tuning[i];
        }, this);
    };
    Tuning.prototype.copy = function() {
      return new Tuning(this._tuning.slice(0), this._octaveRatio, this.name);
    };
    return Tuning;
  })();
  
  var tuningInfo = {
    et12: [
      (
        [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11 ]
      ), 2, "ET12"
    ],
    pythagorean: [
      ratiomidi(
        [ 1, 256/243, 9/8, 32/27, 81/64, 4/3, 729/512, 3/2, 128/81, 27/16, 16/9, 243/128 ]
      ), 2, "Pythagorean"
    ],
    just: [
      ratiomidi(
        [ 1, 16/15, 9/8, 6/5, 5/4, 4/3, 45/32, 3/2, 8/5, 5/3, 9/5, 15/8 ]
      ), 2, "Limit Just Intonation"
    ],
    sept1: [
      ratiomidi(
        [ 1, 16/15, 9/8, 6/5, 5/4, 4/3, 7/5, 3/2, 8/5, 5/3, 9/5, 15/8 ]
      ), 2, "Septimal Tritone Just Intonation"
    ],
    sept2: [
      ratiomidi(
        [ 1, 16/15, 9/8, 6/5, 5/4, 4/3, 7/5, 3/2, 8/5, 5/3, 7/4, 15/8 ]
      ), 2, "7-Limit Just Intonation"
    ],
    mean4: [
      (
        [ 0, 0.755, 1.93, 3.105, 3.86, 5.035, 5.79, 6.965, 7.72, 8.895, 10.07, 10.82 ]
      ), 2, "Meantone, 1/4 Syntonic Comma"
    ],
    mean5: [
      (
        [ 0, 0.804, 1.944, 3.084, 3.888, 5.028, 5.832, 6.972, 7.776, 8.916, 10.056, 10.86 ]
      ), 2, "Meantone, 1/5 Pythagorean Comma"
    ],
    mean6: [
      (
        [ 0, 0.86, 1.96, 3.06, 3.92, 5.02, 5.88, 6.98, 7.84, 8.94, 10.04, 10.9 ]
      ), 2, "Meantone, 1/6 Pythagorean Comma"
    ],
    kirnberger: [
      ratiomidi(
        [ 1, 256/243, Math.sqrt(5)/2, 32/27, 5/4, 4/3, 45/32, Math.pow(5, 0.25), 128/81, Math.pow(5, 0.75)/2, 16/9, 15/8 ]
      ), 2, "Kirnberger III"
    ],
    werckmeister: [
      (
        [ 0, 0.92, 1.93, 2.94, 3.915, 4.98, 5.9, 6.965, 7.93, 8.895, 9.96, 10.935 ]
      ), 2, "Werckmeister III"
    ],
    vallotti: [
      (
        [ 0, 0.94135, 1.9609, 2.98045, 3.92180, 5.01955, 5.9218, 6.98045, 7.9609, 8.94135, 10, 10.90225 ]
      ), 2, "Vallotti"
    ],
    young: [
      (
        [ 0, 0.9, 1.96, 2.94, 3.92, 4.98, 5.88, 6.98, 7.92, 8.94, 9.96, 10.9 ]
      ), 2, "Young"
    ],
    reinhard: [
      ratiomidi(
        [ 1, 14/13, 13/12, 16/13, 13/10, 18/13, 13/9, 20/13, 13/8, 22/13, 13/7, 208/105 ]
      ), 2, "Mayumi Reinhard"
    ],
    wcHarm: [
      ratiomidi(
        [ 1, 17/16, 9/8, 19/16, 5/4, 21/16, 11/8, 3/2, 13/8, 27/16, 7/4, 15/8 ]
      ), 2, "Wendy Carlos Harmonic"
    ],
    wcSJ: [
      ratiomidi(
        [ 1, 17/16, 9/8, 6/5, 5/4, 4/3, 11/8, 3/2, 13/8, 5/3, 7/4, 15/8 ]
      ), 2, "Wendy Carlos Super Just"
    ],
    lu: [
      ratiomidi(
        [ 1, 2187/2048, 9/8, 19683/16384, 81/64, 177147/131072, 729/612, 3/2, 6561/4096, 27/16, 59049/32768, 243/128 ]
      ), 2, "Chinese Shi-er-lu scale"
    ],
    et19: [
      range(18).map(function(x) {
        return x * 12 / 19;
      }), 2, "ET19"
    ],
    et22: [
      range(22).map(function(x) {
        return x * 12 / 22;
      }), 2, "ET22"
    ],
    et24: [
      range(24).map(function(x) {
        return x * 12 / 24;
      }), 2, "ET24"
    ],
    et31: [
      range(31).map(function(x) {
        return x * 12 / 31;
      }), 2, "ET31"
    ],
    et41: [
      range(41).map(function(x) {
        return x * 12 / 41;
      }), 2, "ET41"
    ],
    et53: [
      range(53).map(function(x) {
        return x * 12 / 53;
      }), 2, "ET53"
    ],
    johnston: [
      ratiomidi(
        [ 1, 25/24, 135/128, 16/15, 10/9, 9/8, 75/64, 6/5, 5/4, 81/64, 32/25, 4/3, 27/20, 45/32, 36/25, 3/2, 25/16, 8/5, 5/3, 27/16, 225/128, 16/9, 9/5, 15/8, 48/25 ]
      ), 2, "Ben Johnston"
    ],
    partch: [
      ratiomidi(
        [ 1, 81/80, 33/32, 21/20, 16/15, 12/11, 11/10, 10/9, 9/8, 8/7, 7/6, 32/27, 6/5, 11/9, 5/4, 14/11, 9/7, 21/16, 4/3, 27/20, 11/8, 7/5, 10/7, 16/11, 40/27, 3/2, 32/21, 14/9, 11/7, 8/5, 18/11, 5/3, 27/16, 12/7, 7/4, 16/9, 9/5, 20/11, 11/6, 15/8, 40/21, 64/33, 160/81 ]
      ), 2, "Harry Partch"
    ],
    catler: [
      ratiomidi(
        [ 1, 33/32, 16/15, 9/8, 8/7, 7/6, 6/5, 128/105, 16/13, 5/4, 21/16, 4/3, 11/8, 45/32, 16/11, 3/2, 8/5, 13/8, 5/3, 27/16, 7/4, 16/9, 24/13, 15/8 ]
      ), 2, "Jon Catler"
    ],
    chalmers: [
      ratiomidi(
        [ 1, 21/20, 16/15, 9/8, 7/6, 6/5, 5/4, 21/16, 4/3, 7/5, 35/24, 3/2, 63/40, 8/5, 5/3, 7/4, 9/5, 28/15, 63/32 ]
      ), 2, "John Chalmers"
    ],
    harrison: [
      ratiomidi(
        [ 1, 16/15, 10/9, 8/7, 7/6, 6/5, 5/4, 4/3, 17/12, 3/2, 8/5, 5/3, 12/7, 7/4, 9/5, 15/8 ]
      ), 2, "Lou Harrison"
    ],
    sruti: [
      ratiomidi(
        [ 1, 256/243, 16/15, 10/9, 9/8, 32/27, 6/5, 5/4, 81/64, 4/3, 27/20, 45/32, 729/512, 3/2, 128/81, 8/5, 5/3, 27/16, 16/9, 9/5, 15/8, 243/128 ]
      ), 2, "Sruti"
    ],
    parret: [
      ratiomidi(
        [1, 21/20, 35/32, 9/8, 7/6, 6/5, 5/4, 21/16, 4/3, 7/5, 35/24, 3/2, 63/40, 8/5, 5/3, 7/4, 9/5, 15/8, 63/32]
      ), 2, "Wilfrid Perret"
    ],
    michael_harrison: [
      ratiomidi(
        [1, 28/27, 135/128, 16/15, 243/224, 9/8, 8/7, 7/6, 32/27, 6/5, 135/112, 5/4, 81/64, 9/7, 21/16, 4/3, 112/81, 45/32, 64/45, 81/56, 3/2, 32/21, 14/9, 128/81, 8/5, 224/135, 5/3, 27/16, 12/7, 7/4, 16/9, 15/8, 243/128, 27/14 ]
      ), 2, "Michael Harrison 24 tone 7-limit"
    ],
    harmonic: [
      ratiomidi(
        range(24).slice(1)
      ), 2, "Harmonic Series 24"
    ],
    bp: [
      ratiomidi(range(12).map(function(x) {
        return x * 19.019550008654 / 13;
      })
      ), 3, "Bohlen-Pierce"
    ],
    wcAlpha: [
      range(14).map(function(x) {
        return x * 0.78;
      }), 1.9656411970852, "Wendy Carlos Alpha"
    ],
    wcBeta: [
      range(18).map(function(x) {
        return x * 0.638;
      }), 2.0141437696805, "Wendy Carlos Beta"
    ],
    wcGamma: [
      range(33).map(function(x) {
        return x * 0.351;
      }), 1.9923898962606, "Wendy Carlos Gamma"
    ]
  };
  
  var TuningInterface = fn(function(tuning, octaveRatio, name) {
    if (!Array.isArray(tuning)) {
      tuning = [0,1,2,3,4,5,6,7,8,9,10,11];
    }
    if (typeof octaveRatio !== "number") {
      octaveRatio = 2;
    }
    if (typeof name !== "string") {
      name = "Unknown Tuning";
    }
    return new Tuning(tuning, octaveRatio, name);
  }).defaults("tuning,octaveRatio,name").build();
  var tunings = {};
  Object.keys(tuningInfo).forEach(function(key) {
    var params = tuningInfo[key];
    tunings[key] = new Tuning(params[0], params[1], params[2]);
    TuningInterface[key] = tunings[key];
  });
  TuningInterface.at = function(key) {
    var t = tunings[key];
    if (t) {
      t = t.copy();
    }
    return t;
  };
  TuningInterface.choose = fn(function(size) {
    if (typeof size !== "number") {
      size = 12;
    }
    var candidates = [];
    var keys = Object.keys(tunings);
    var t;
    for (var i = 0, imax = keys.length; i < imax; ++i) {
      t = tunings[keys[i]];
      if (t._tuning.length === size) {
        candidates.push(t);
      }
    }
    t = candidates[(Math.random() * candidates.length)|0];
    if (t) {
      return t.copy();
    }
  }).multiCall().build();
  TuningInterface.et = function(pitchesPerOctave) {
    var list = new Array(pitchesPerOctave);
    for (var i = 0; i < pitchesPerOctave; ++i) {
      list[i] = i * (12 / pitchesPerOctave);
    }
    return new Tuning(list, 2, "ET" + pitchesPerOctave);
  };
  TuningInterface.names = function() {
    return Object.keys(tunings).sort();
  };
  
  var Scale = (function() {
    function Scale(degrees, pitchesPerOctave, tuning, name) {
      this.klassName = "Scale";
      this._degrees = degrees;
      this._pitchesPerOctave = pitchesPerOctave;
      this.name = name;
      this.tuning(tuning);
    }
    fn.extend(Scale, cc.Object);
    Scale.prototype.tuning = function(inTuning) {
      if (arguments.length === 0) {
        return this._tuning;
      }
      if (inTuning === null) {
        inTuning = TuningInterface["default"](this._pitchesPerOctave);
      } else if (typeof inTuning === "string") {
        inTuning = tunings[inTuning];
      }
      if (!(inTuning instanceof Tuning)) {
        throw new TypeError("Scale: arguments[2] should be a tuning.");
      }
      if (this._pitchesPerOctave !== inTuning.size()) {
        throw new TypeError("Scale steps per octave " + this._pitchesPerOctave + " does not match tuning size.");
      }
      this._tuning = inTuning;
      return inTuning;
    };
    Scale.prototype.semitones = function() {
      return this._degrees.map(function(i) {
        return this._tuning.wrapAt(i);
      }, this);
    };
    Scale.prototype.cents = function() {
      return this.semitones().map(function(x) {
        return x * 100;
      });
    };
    Scale.prototype.ratios = function() {
      return this.semitones().map(function(x) {
        return Math.pow(2, x * 1/12);
      });
    };
    Scale.prototype.size = function() {
      return this._degrees.length;
    };
    Scale.prototype.pitchesPerOctave = function() {
      return this._pitchesPerOctave;
    };
    Scale.prototype.stepsPerOctave = function() {
      return Math.log(this.octaveRatio()) * Math.LOG2E * 12;
    };
    Scale.prototype.at = fn(function(index) {
      index = index % this._degrees.length;
      if (index < 0) {
        index = this._degrees.length + index;
      }
      return this._tuning.at(this._degrees[index]);
    }).multiCall().build();
    Scale.prototype.wrapAt = fn(function(index) {
      index = index % this._degrees.length;
      if (index < 0) {
        index = this._degrees.length + index;
      }
      return this._tuning.wrapAt(this._degrees[index]);
    }).multiCall().build();
    Scale.prototype.degreeToFreq = fn(function(degree, rootFreq, octave) {
      return degreeToRatio(this, degree, octave) * rootFreq;
    }).defaults("degree=0,rootFreq=0,octave=0").multiCall().build();
    Scale.prototype.degreeToRatio = fn(function(degree, octave) {
      return degreeToRatio(this, degree, octave);
    }).defaults("degree=0,octave=0").multiCall().build();
    Scale.prototype.degrees = function() {
      return this._degrees;
    };
    Scale.prototype.octaveRatio = function() {
      return this._tuning.octaveRatio();
    };
    Scale.prototype.equals = function(that) {
      return (that instanceof Scale) &&
        this._degrees.every(function(x, i) {
          return x === that._degrees[i];
        }) && this._tuning.equals(that._tuning);
    };
    Scale.prototype.copy = function() {
      return new Scale(
        this._degrees.slice(),
        this._pitchesPerOctave,
        this._tuning.copy(),
        this.name
      );
    };
    var degreeToRatio = function(that, degree, octave) {
      octave += (degree / that._degrees.length)|0;
      var ratios = that.ratios();
      var index  = degree % ratios.length;
      if (index < 0) {
        index = ratios.length + index;
      }
      return ratios[index] * Math.pow(that.octaveRatio(), octave);
    };
    return Scale;
  })();
  
  var guessPPO = function(degrees) {
    var i, max = degrees[0] || 0;
    for (i = degrees.length; i--; ) {
      if (max < degrees[i]) {
        max = degrees[i];
      }
    }
    var etTypes = [53,24,19,12];
    for (i = etTypes.length; i--; ) {
      if (max < etTypes[i]) {
        return etTypes[i];
      }
    }
    return 128;
  };
  
  var scaleInfo = {
    major: [
      [ 0, 2, 4, 5, 7, 9, 11 ], 12, 0, "Major"
    ],
    minor: [
      [ 0, 2, 3, 5, 7, 8, 10 ], 12, 0, "Natural Minor"
    ],
    minorPentatonic: [
      [ 0, 3, 5, 7, 10 ], 12, 0, "Minor Pentatonic"
    ],
    majorPentatonic: [
      [ 0, 2, 4, 7, 9 ], 12, 0, "Major Pentatonic"
    ],
    ritusen: [
      [ 0, 2, 5, 7, 9 ], 12, 0, "Ritusen"
    ],
    egyptian: [
      [ 0, 2, 5, 7, 10 ], 12, 0, "Egyptian"
    ],
    kumoi: [
      [ 0, 2, 3, 7, 9 ], 12, 0, "Kumoi"
    ],
    hirajoshi: [
      [ 0, 2, 3, 7, 8 ], 12, 0, "Hirajoshi"
    ],
    iwato: [
      [ 0, 1, 5, 6, 10 ], 12, 0, "Iwato"
    ],
    ryukyu: [
      [ 0, 4, 5, 7, 11 ], 12, 0, "Ryukyu"
    ],
    chinese: [
      [ 0, 4, 6, 7, 11 ], 12, 0, "Chinese"
    ],
    indian: [
      [ 0, 4, 5, 7, 10 ], 12, 0, "Indian"
    ],
    pelog: [
      [ 0, 1, 3, 7, 8 ], 12, 0, "Pelog"
    ],
    prometheus: [
      [ 0, 2, 4, 6, 11 ], 12, 0, "Prometheus"
    ],
    scriabin: [
      [ 0, 1, 4, 7, 9 ], 12, 0, "Scriabin"
    ],
    gong: [
      [ 0, 2, 4, 7, 9 ], 12, 0, "Gong"
    ],
    shang: [
      [ 0, 2, 5, 7, 10 ], 12, 0, "Shang"
    ],
    jiao: [
      [ 0, 3, 5, 8, 10 ], 12, 0, "Jiao"
    ],
    zhi: [
      [ 0, 2, 5, 7, 9 ], 12, 0, "Zhi"
    ],
    yu: [
      [ 0, 3, 5, 7, 10 ], 12, 0, "Yu"
    ],
    whole: [
      [ 0, 2, 4, 6, 8, 10 ], 12, 0, "Whole Tone"
    ],
    augmented: [
      [ 0, 3, 4, 7, 8, 11 ], 12, 0, "Augmented"
    ],
    augmented2: [
      [ 0, 1, 4, 5, 8, 9 ], 12, 0, "Augmented 2"
    ],
    partch_o1: [
      [ 0, 8, 14, 20, 25, 34], 43, "partch", "Partch Otonality 1"
    ],
    partch_o2: [
      [ 0, 7, 13, 18, 27, 35 ], 43, "partch", "Partch Otonality 2"
    ],
    partch_o3: [
      [ 0, 6, 12, 21, 29, 36 ], 43, "partch", "Partch Otonality 3"
    ],
    partch_o4: [
      [ 0, 5, 15, 23, 30, 37 ], 43, "partch", "Partch Otonality 4"
    ],
    partch_o5: [
      [ 0, 10, 18, 25, 31, 38 ], 43, "partch", "Partch Otonality 5"
    ],
    partch_o6: [
      [ 0, 9, 16, 22, 28, 33 ], 43, "partch", "Partch Otonality 6"
    ],
    partch_u1: [
      [ 0, 9, 18, 23, 29, 35 ], 43, "partch", "Partch Utonality 1"
    ],
    partch_u2: [
      [ 0, 8, 16, 25, 30, 36 ], 43, "partch", "Partch Utonality 2"
    ],
    partch_u3: [
      [ 0, 7, 14, 22, 31, 37 ], 43, "partch", "Partch Utonality 3"
    ],
    partch_u4: [
      [ 0, 6, 13, 20, 28, 38 ], 43, "partch", "Partch Utonality 4"
    ],
    partch_u5: [
      [ 0, 5, 12, 18, 25, 33 ], 43, "partch", "Partch Utonality 5"
    ],
    partch_u6: [
      [ 0, 10, 15, 21, 27, 34 ], 43, "partch", "Partch Utonality 6"
    ],
    hexMajor7: [
      [ 0, 2, 4, 7, 9, 11 ], 12, 0, "Hex Major 7"
    ],
    hexDorian: [
      [ 0, 2, 3, 5, 7, 10 ], 12, 0, "Hex Dorian"
    ],
    hexPhrygian: [
      [ 0, 1, 3, 5, 8, 10 ], 12, 0, "Hex Phrygian"
    ],
    hexSus: [
      [ 0, 2, 5, 7, 9, 10 ], 12, 0, "Hex Sus"
    ],
    hexMajor6: [
      [ 0, 2, 4, 5, 7, 9 ], 12, 0, "Hex Major 6"
    ],
    hexAeolian: [
      [ 0, 3, 5, 7, 8, 10 ], 12, 0, "Hex Aeolian"
    ],
    ionian: [
      [ 0, 2, 4, 5, 7, 9, 11 ], 12, 0, "Ionian"
    ],
    dorian: [
      [ 0, 2, 3, 5, 7, 9, 10 ], 12, 0, "Dorian"
    ],
    phrygian: [
      [ 0, 1, 3, 5, 7, 8, 10 ], 12, 0, "Phrygian"
    ],
    lydian: [
      [ 0, 2, 4, 6, 7, 9, 11 ], 12, 0, "Lydian"
    ],
    mixolydian: [
      [ 0, 2, 4, 5, 7, 9, 10 ], 12, 0, "Mixolydian"
    ],
    aeolian: [
      [ 0, 2, 3, 5, 7, 8, 10 ], 12, 0, "Aeolian"
    ],
    locrian: [
      [ 0, 1, 3, 5, 6, 8, 10 ], 12, 0, "Locrian"
    ],
    harmonicMinor: [
      [ 0, 2, 3, 5, 7, 8, 11 ], 12, 0, "Harmonic Minor"
    ],
    harmonicMajor: [
      [ 0, 2, 4, 5, 7, 8, 11 ], 12, 0, "Harmonic Major"
    ],
    melodicMinor: [
      [ 0, 2, 3, 5, 7, 9, 11 ], 12, 0, "Melodic Minor"
    ],
    melodicMinorDesc: [
      [ 0, 2, 3, 5, 7, 8, 10 ], 12, 0, "Melodic Minor Descending"
    ],
    melodicMajor: [
      [ 0, 2, 4, 5, 7, 8, 10 ], 12, 0, "Melodic Major"
    ],
    bartok: [
      [ 0, 2, 4, 5, 7, 8, 10 ], 12, 0, "Bartok"
    ],
    hindu: [
      [ 0, 2, 4, 5, 7, 8, 10 ], 12, 0, "Hindu"
    ],
    todi: [
      [ 0, 1, 3, 6, 7, 8, 11 ], 12, 0, "Todi"
    ],
    purvi: [
      [ 0, 1, 4, 6, 7, 8, 11 ], 12, 0, "Purvi"
    ],
    marva: [
      [ 0, 1, 4, 6, 7, 9, 11 ], 12, 0, "Marva"
    ],
    bhairav: [
      [ 0, 1, 4, 5, 7, 8, 11 ], 12, 0, "Bhairav"
    ],
    ahirbhairav: [
      [ 0, 1, 4, 5, 7, 9, 10 ], 12, 0,"Ahirbhairav"
    ],
    superLocrian: [
      [ 0, 1, 3, 4, 6, 8, 10 ], 12, 0, "Super Locrian"
    ],
    romanianMinor: [
      [ 0, 2, 3, 6, 7, 9, 10 ], 12, 0, "Romanian Minor"
    ],
    hungarianMinor: [
      [ 0, 2, 3, 6, 7, 8, 11 ], 12, 0, "Hungarian Minor"
    ],
    neapolitanMinor: [
      [ 0, 1, 3, 5, 7, 8, 11 ], 12, 0, "Neapolitan Minor"
    ],
    enigmatic: [
      [ 0, 1, 4, 6, 8, 10, 11 ], 12, 0, "Enigmatic"
    ],
    spanish: [
      [ 0, 1, 4, 5, 7, 8, 10 ], 12, 0, "Spanish"
    ],
    leadingWhole: [
      [ 0, 2, 4, 6, 8, 10, 11 ], 12, 0, "Leading Whole Tone"
    ],
    lydianMinor: [
      [ 0, 2, 4, 6, 7, 8, 10 ], 12, 0, "Lydian Minor"
    ],
    neapolitanMajor: [
      [ 0, 1, 3, 5, 7, 9, 11 ], 12, 0, "Neapolitan Major"
    ],
    locrianMajor: [
      [ 0, 2, 4, 5, 6, 8, 10 ], 12, 0, "Locrian Major"
    ],
    diminished: [
      [ 0, 1, 3, 4, 6, 7, 9, 10 ], 12, 0, "Diminished"
    ],
    diminished2: [
      [ 0, 2, 3, 5, 6, 8, 9, 11 ], 12, 0, "Diminished 2"
    ],
    chromatic: [
      [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11 ], 12, 0, "Chromatic"
    ],
    chromatic24: [
      range(23), 24, 0, "Chromatic 24"
    ],
    ajam: [
      [ 0, 4, 8, 10, 14, 18, 22 ], 24, 0, "Ajam"
    ],
    jiharkah: [
      [ 0, 4, 8, 10, 14, 18, 21 ], 24, 0, "Jiharkah"
    ],
    shawqAfza: [
      [ 0, 4, 8, 10, 14, 16, 22 ], 24, 0, "Shawq Afza"
    ],
    sikah: [
      [ 0, 3, 7, 11, 14, 17, 21 ], 24, 0, "Sikah"
    ],
    sikahDesc: [
      [ 0 , 3 , 7, 11, 13, 17, 21 ], 24, 0, "Sikah Descending"
    ],
    huzam: [
      [ 0, 3, 7, 9, 15, 17, 21 ], 24, 0, "Huzam"
    ],
    iraq: [
      [ 0, 3, 7, 10, 13, 17, 21 ], 24, 0, "Iraq"
    ],
    bastanikar: [
      [ 0, 3, 7, 10, 13, 15, 21 ], 24, 0, "Bastanikar"
    ],
    mustar: [
      [ 0, 5, 7, 11, 13, 17, 21 ], 24, 0, "Mustar"
    ],
    bayati: [
      [ 0, 3, 6, 10, 14, 16, 20 ], 24, 0, "Bayati"
    ],
    karjighar: [
      [ 0, 3, 6, 10, 12, 18, 20 ], 24, 0, "Karjighar"
    ],
    husseini: [
      [ 0, 3, 6, 10, 14, 17, 21 ], 24, 0, "Husseini"
    ],
    nahawand: [
      [ 0, 4, 6, 10, 14, 16, 22 ], 24, 0, "Nahawand"
    ],
    nahawandDesc: [
      [ 0, 4, 6, 10, 14, 16, 20 ], 24, 0, "Nahawand Descending"
    ],
    farahfaza: [
      [ 0, 4, 6, 10, 14, 16, 20 ], 24, 0, "Farahfaza"
    ],
    murassah: [
      [ 0, 4, 6, 10, 12, 18, 20 ], 24, 0, "Murassah"
    ],
    ushaqMashri: [
      [ 0, 4, 6, 10, 14, 17, 21 ], 24, 0, "Ushaq Mashri"
    ],
    rast: [
      [ 0, 4, 7, 10, 14, 18, 21 ], 24, 0, "Rast"
    ],
    rastDesc: [
      [ 0, 4, 7, 10, 14, 18, 20 ], 24, 0, "Rast Descending"
    ],
    suznak: [
      [ 0, 4, 7, 10, 14, 16, 22 ], 24, 0, "Suznak"
    ],
    nairuz: [
      [ 0, 4, 7, 10, 14, 17, 20 ], 24, 0, "Nairuz"
    ],
    yakah: [
      [ 0, 4, 7, 10, 14, 18, 21 ], 24, 0, "Yakah"
    ],
    yakahDesc: [
      [ 0, 4, 7, 10, 14, 18, 20 ], 24, 0, "Yakah Descending"
    ],
    mahur: [
      [ 0, 4, 7, 10, 14, 18, 22 ], 24, 0, "Mahur"
    ],
    hijaz: [
      [ 0, 2, 8, 10, 14, 17, 20 ], 24, 0, "Hijaz"
    ],
    hijazDesc: [
      [ 0, 2, 8, 10, 14, 16, 20 ], 24, 0, "Hijaz Descending"
    ],
    zanjaran: [
      [ 0, 2, 8, 10, 14, 16, 22 ], 24, 0, "Zanjaran"
    ],
    saba: [
      [ 0, 3, 6, 8, 12, 16, 20 ], 24, 0, "Saba"
    ],
    zamzam: [
      [ 0, 2, 6, 8, 14, 16, 20 ], 24, 0, "Zamzam"
    ],
    kurd: [
      [ 0, 2, 6, 10, 14, 16, 20 ], 24, 0, "Kurd"
    ],
    kijazKarKurd: [
      [ 0, 2, 8, 10, 14, 16, 22 ], 24, 0, "Kijaz Kar Kurd"
    ],
    nawaAthar: [
      [ 0, 4, 6, 12, 14, 16, 22 ], 24, 0, "Nawa Athar"
    ],
    nikriz: [
      [ 0, 4, 6, 12, 14, 18, 20 ], 24, 0, "Nikriz"
    ],
    atharKurd: [
      [ 0, 2, 6, 12, 14, 16, 22 ], 24, 0, "Athar Kurd"
    ]
  };
  
  var ScaleInterface = fn(function(degrees, pitchesPerOctave, tuning, name) {
    if (!Array.isArray(degrees)) {
      degrees = [0,2,4,5,7,9,11]; // ionian
    }
    if (typeof pitchesPerOctave !== "number") {
      pitchesPerOctave = guessPPO(degrees);
    }
    if (typeof tuning === "string") {
      tuning = tunings[tuning];
    }
    if (!(tuning instanceof Tuning)) {
      tuning = tunings.et12;
    }
    if (typeof name !== "string") {
      name = "Unknown Scale";
    }
    return new Scale(degrees, pitchesPerOctave, tuning, name);
  }).defaults("degrees,pitchesPerOctave,tuning,name").build();
  var scales = {};
  Object.keys(scaleInfo).forEach(function(key) {
    var params = scaleInfo[key];
    if (params[2]) {
      params[2] = tunings[params[2]].copy();
    } else {
      params[2] = TuningInterface.et(params[1]);
    }
    scales[key] = new Scale(params[0], params[1], params[2], params[3]);
    ScaleInterface[key] = scales[key];
  });
  ScaleInterface.at = function(key, tuning) {
    var s = scales[key];
    if (s) {
      s = s.copy();
      if (tuning) {
        s.tuning(tuning);
      }
    }
    return s;
  };
  ScaleInterface.choose = fn(function(size, pitchesPerOctave) {
    if (typeof size !== "number") {
      size = 7;
    }
    if (typeof pitchesPerOctave !== "number") {
      pitchesPerOctave = 12;
    }
    var candidates = [];
    var keys = Object.keys(scales);
    var s;
    for (var i = 0, imax = keys.length; i < imax; ++i) {
      s = scales[keys[i]];
      if (s._degrees.length === size && s._pitchesPerOctave === pitchesPerOctave) {
        candidates.push(s);
      }
    }
    s = candidates[(Math.random() * candidates.length)|0];
    if (s) {
      return s.copy();
    }
  }).multiCall().build();
  ScaleInterface.names = function() {
    return Object.keys(scales).sort();
  };
  
  var install = function() {
    global.Scale  = ScaleInterface;
    global.Tuning = TuningInterface;
  };
  
  module.exports = {
    Scale  : Scale,
    Tuning : Tuning,
    install: install
  };

});
