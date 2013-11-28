# b = Buffer(512, 1)
# b.sine1(1.0 / [1, 2, 3, 4], true, true, true)
# b.sine2([1.0, 3], [1, 0.5])
# b.cheby([1,0,1,1,0,1])

b = Buffer([0,1,0.5,0])

(->
  Osc.ar(b, 200, 0, 0.5)
).play()
