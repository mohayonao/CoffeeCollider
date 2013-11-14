(->
  freq = LFNoise1.ar
    freq: 3
    mul : 24
    add : LFSaw.ar([5, 5.123], 0, 3, 80)
  osc = Pulse.ar(midicps(freq), mul:0.4)
  CombN.ar(osc, maxdelaytime:1, delaytime:0.3, decaytime:2)
).play()
