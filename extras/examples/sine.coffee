SynthDef ->
  Out.ar(0, Mix.fill(24, (i)->
    SinOsc.ar(440 * (i).midiratio())
  ) * 1 / 12)
.play()
