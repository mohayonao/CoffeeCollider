def = Synth.def (freq=440, amp=1)->
  amp *= Line.kr(0.5, 0, 2.5)
  Out.ar(2, SinOsc.ar([freq, freq * 1.25]) * amp)

Synth.def ->
  Out.ar(0, CombL.ar(In.ar([2, 3], decaytime:5)))
.play()
 
Task.loop ->
  freq = Math.random() * 880 + 220
  s = def.play().on "done", ->
    s.stop()
  t = Task.each [1,4,3,2,8,4,3,2], (x, i)->
    s.set freq:freq * x, amp:1-(i/8)
    @wait 125
  .play()
  @wait t
.play()
