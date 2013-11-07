def = SynthDef (freq=440, amp=1)->
  amp *= Line.kr(0.5, 0, 2.5)
  Out.ar(2, SinOsc.ar([freq, freq * 1.25]) * amp)
.build()  

SynthDef ->
  Out.ar(0, CombL.ar(In.ar([2, 3], decaytime:5)))
.play()
 
Task.loop ->
  root  = 880.rand() + 220
  synth = def.play().on "done", ->
    @stop()
  task  = Task.each [1,4,3,2,8,4,3,2], (x, i)->
    freq = root * x
    amp  = 1 - (i / 8)
    synth.set freq:freq, amp:amp
    @wait 125
    synth.set freq:freq * 1.midiratio()
    @wait 125
  .play()
  @wait task
.play()
