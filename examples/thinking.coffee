# origin: SuperCollider/examples/demonstrations/SC2-examples_1.scd

(->
  z = RLPF.ar(
    Pulse.ar(
      max( SinOsc.kr(4, 0, 1, 80),
        Decay.ar(LFPulse.ar(0.1, 0, 0.05, Impulse.ar(8, 0, 500)), 2)
      ), 
      LFNoise1.kr(0.157, 0.4, 0.5), 
      0.04),
    LFNoise1.kr(0.2, 2000, 2400),
    0.2)
  y = z * 0.6
  z + [
    CombL.ar(y, 0.06, LFNoise1.kr(0.3.rand(), 0.025, 0.035), 1) +
      CombL.ar(y, 0.06, LFNoise1.kr(0.3.rand(), 0.025, 0.035), 1)
    CombL.ar(y, 0.06, LFNoise1.kr(0.3.rand(), 0.025, 0.035), 1) +
      CombL.ar(y, 0.06, LFNoise1.kr(0.3.rand(), 0.025, 0.035), 1)
  ]
).play()


# // what was I thinking?
# {
#   z = RLPF.ar(
#     Pulse.ar(
#       max( SinOsc.kr(4, 0, 1, 80),
#         Decay.ar(LFPulse.ar(0.1, 0, 0.05, Impulse.ar(8, 0, 500)), 2)
#       ), 
#       LFNoise1.kr(0.157, 0.4, 0.5), 
#       0.04),
#     LFNoise1.kr(0.2, 2000, 2400),
#     0.2);
#   y = z * 0.6;
#   z +  [
#         CombL.ar(y, 0.06, LFNoise1.kr(0.3.rand, 0.025, 0.035), 1) 
#       + CombL.ar(y, 0.06, LFNoise1.kr(0.3.rand, 0.025, 0.035), 1)
#     ,
#         CombL.ar(y, 0.06, LFNoise1.kr(0.3.rand, 0.025, 0.035), 1)
#       + CombL.ar(y, 0.06, LFNoise1.kr(0.3.rand, 0.025, 0.035), 1)
#     ]
# }.play;
