bpm = "bpm120 l8"

synth = SynthDef (out, freq)->
  vco = SinOscFB.ar(freq, XLine.kr(2, 0, bpm * 2)) * 0.5
  vca = EnvGen.kr(Env.perc(attackTime:0.125, releaseTime:bpm), doneAction:2)
  Out.ar(out, vco * vca)
.add()

arp = (score, out, interval)->
  Task -> Infinity.do syncblock (i)->
    Synth synth, out:out, freq:score.wrapAt(i).midicps()
    interval.wait()

score = Scale.kumoi.degrees() + A4
score = score.wrapExtend(16).scramble()

arp(score, 0, bpm            ).start()
arp(score, 1, bpm * (199/200)).start()
