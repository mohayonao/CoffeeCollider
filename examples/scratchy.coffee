# origin: SuperCollider/examples/demonstrations/SC2-examples_1.scd

(->
  RHPF.ar(BrownNoise.ar([0.5, 0.5], -0.49).max(0) * 20, 5000, 1)
).play()

# // scratchy
# play({  RHPF.ar(BrownNoise.ar([0.5,0.5], -0.49).max(0) * 20, 5000, 1)  })
