synth = SynthDef (freq=440, gate=0)->
  vco = LFSaw.ar(freq, mul:0.25)
  vcf = RLPF.ar(vco, freq * 8, EnvGen.kr(Env([1, 1, 0.1], [0, 0.5], -2), gate))
  vca = EnvGen.kr(Env.adsr(), gate)
  Out.ar(0, (vcf * vca).dup())
.play()

Message.on "keyboard", ({midi, gate})->
  synth.set freq:midi.midicps(), gate:gate
