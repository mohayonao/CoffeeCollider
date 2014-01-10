# Klank - bank of resonators excited by impulses
(->
  n = 5  # number of simultaneous instruments
  p = 15 # number of partials per instrument

  # filter bank specification :
  z = $([
    Array.fill(p, (-> 80 + 10000.linrand() )) # frequencies
    Array.fill(p, (-> 1.rand2() ))            # amplitudes
    Array.fill(p, (-> 0.2 + 8.rand() ))       # ring times
  ])

  Pan2.ar(Klank.ar(z, Dust.ar(0.7, 0.25)), 1.rand2())
).play()
