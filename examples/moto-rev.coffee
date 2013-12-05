# origin: SuperCollider/examples/demonstrations/SC2-examples_1.scd

(->
  RLPF.ar(LFPulse.ar(SinOsc.kr(0.2, 0, 10, 21), 0.1), 100, 0.1).clip2(0.4) 
).play()

# // moto rev
# {
#   RLPF.ar(LFPulse.ar(SinOsc.kr(0.2, 0, 10, 21), 0.1), 100, 0.1).clip2(0.4) 
# }.play
