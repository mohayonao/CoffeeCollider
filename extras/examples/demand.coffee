(->
  freq = Demand.ar(Impulse.ar(1), 0, Dseq([60..72].midicps(), Infinity))
  SinOsc.ar(freq)
).play()
