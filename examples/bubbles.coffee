# origin: SuperCollider/examples/demonstrations/SC2-examples_1.scd

(->
  f = LFSaw.kr(0.4, 0, 24, LFSaw.kr([8,7.23], 0, 3, 80)).midicps() # glissando function
  CombN.ar(SinOsc.ar(f, 0, 0.04), 0.2, 0.2, 4) # echoing sine wave
).play()


# // analog bubbles
# {
#   f = LFSaw.kr(0.4, 0, 24, LFSaw.kr([8,7.23], 0, 3, 80)).midicps; // glissando function
#   CombN.ar(SinOsc.ar(f, 0, 0.04), 0.2, 0.2, 4) // echoing sine wave
# }.play
