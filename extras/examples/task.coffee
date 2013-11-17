tone = SynthDef (freq=440, amp=1)->
  amp *= Line.kr(0.4, 0, dur:2.5)
  Out.ar(2, Pulse.ar([freq, freq * 0.5.midiratio()]) * amp)
.build()  

SynthDef ->
  Out.ar(0, CombL.ar(In.ar([2, 3]), decaytime:2.5))
.play()
 
Task.loop ->
  root  = rrand(220, 880)
  synth = Synth(tone).on "done", ->
    synth.stop()
  task  = Task.each [1,4,3,2,8,4,3,2], (x, i)->
    freq = root * x
    amp  = 1 - (i / 8)
    synth.set freq:freq, amp:amp
    @wait "bpm132 l16"
    synth.set freq:freq * 1.midiratio()
    @wait "bpm132 l16"
  .play()
  @wait task
.play()
