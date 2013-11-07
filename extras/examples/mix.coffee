SynthDef ->
  Out.ar(0, Mix.fill 24, (i)->
    SinOsc.ar(i.midiratio() * 440) * 1/12
  )
.play()
