ex5 = SynthDef (gate=1, amp=1)->
  env = EnvGen.kr(Env([0, 1, 0], [1, 4], [4, -4], 1), gate, doneAction:2)
  src = WhiteNoise.ar()
  trigger = Impulse.kr(Rand(2, 5))
  pitchbase = IRand(4, 9) * 12
  freq = TIRand.kr(pitchbase, pitchbase + 12, trigger).midicps()
  rq   = LFDNoise3.kr(Rand(0.3, 0.8)).range(0.01, 0.005)
  filt = Resonz.ar(src, Lag2.kr(freq), rq)
  Out.ar(0, Pan2.ar(filt, LFNoise1.kr(0.1)) * env * amp)
.send()

a = Synth(ex5)
