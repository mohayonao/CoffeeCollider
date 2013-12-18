bpm = "bpm120 l8"

synth = SynthDef (freq)->
  vco = SinOscFB.ar(freq, XLine.kr(2, 0, bpm * 2)) * 0.25
  vca = EnvGen.kr(Env.perc(attackTime:0.125, releaseTime:bpm), doneAction:2)
  Out.ar(0, (vco * vca).dup())
.add()

arp = (score, interval)->
  Task -> Infinity.do syncblock (i)->
    Synth synth, freq:score.wrapAt(i).midicps()
    interval.wait()

score = Scale.major.degrees() + A4
score = score.wrapExtend(16).scramble()

arp(score, bpm            ).start()
arp(score, bpm * (299/300)).start()
