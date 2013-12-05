# origin: SuperCollider/examples/pieces/DrummerSynthDef.scd

# (thor magnusson) (2006)

# An instrumentalist inside a synthdef.

drummer = SynthDef (out=0, tempo=4)->
  tempo = Impulse.ar(tempo); # for a drunk drummer replace Impulse with Dust !!!
  
  snare = WhiteNoise.ar(Decay2.ar(PulseDivider.ar(tempo, 4, 2), 0.005, 0.5))
  base  = SinOsc.ar(Line.ar(120, 60, 1), 0, Decay2.ar(PulseDivider.ar(tempo, 4, 0), 0.005, 0.5))
  hihat = HPF.ar(WhiteNoise.ar(1), 10000) * Decay2.ar(tempo, 0.005, 0.5)

  Out.ar(out, ((snare + base + hihat) * 0.4).dup())
.add()

Synth(drummer, tempo:6)
