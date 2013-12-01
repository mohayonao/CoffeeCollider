tone = SynthDef (freq=440, amp=1)->
  amp *= Line.kr(0.4, 0, dur:2.5, doneAction:2)
  Out.ar(2, Pulse.ar([freq, freq * 0.5.midiratio()]) * amp)
.build()  

SynthDef ->
  Out.ar(0, CombL.ar(In.ar([2, 3]), decaytime:2.5))
.play()
 
Task ->
  Infinity.do ->
    root  = rrand(220, 880)
    synth = Synth(tone)
    [ 1, 4, 3, 2, 8, 4, 3, 2 ].do (x, i)->
      freq = root * x
      amp  = 1 - (i / 8)
      synth.set freq:freq, amp:amp
      "bpm132 l16".wait()
      synth.set freq:freq * 1.midiratio()
      "bpm132 l16".wait()
.start()
