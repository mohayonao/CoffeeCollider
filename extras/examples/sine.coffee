SynthDef ->
  Out.ar(0, SinOsc.ar([440, 441], mul:0.5))
.play()
