# origin: SuperCollider/examples/demonstrations/Theremin.scd

theremin = SynthDef (mod=7, detune=0)->
  f = MouseY.kr(4000, 200, 'exponential', 0.8) + detune
  a = SinOsc.ar(f + (f * SinOsc.ar(mod,0,0.02)), mul:MouseX.kr(0, 0.9))
  z = Mix.ar([a])
  Out.ar(0, z) + Out.ar(1, z)
.add()


Synth(theremin)
