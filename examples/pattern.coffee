synth = SynthDef((freq, trig)->
  Out.ar(0, Pulse.ar([freq, freq * 2], 0.25) * Decay2.kr(trig, 0.05, 1.5))
, [0.1]).play()

base = [0, 4, 7, 10] + 60

p = Pseq(Pseq(base, 2).concat(Pshuf(base, 2)), Infinity)

Task ->
  p.midicps().do syncblock (x)->
    synth.set freq:x, trig:1
    "bpm120 l8".wait()
.start()
