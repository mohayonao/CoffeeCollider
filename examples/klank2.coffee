# Klank - excited by noise bursts
(->
  n = 5 # number of simultaneous instruments
  p = 8 # number of partials per instrument
  exciter = Decay.ar(Dust.ar(0.6, 0.01), 3.1, WhiteNoise.ar())
  spec = Array.fill(2, ->
    $([
      Array.fill(p, (-> 80 + 10000.linrand() ))
      null,
      Array.fill(p, (-> 0.2 + 4.0.rand() ))
    ])
  )
  Klank.ar(spec, exciter)
).play()
