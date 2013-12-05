# origin: SuperCollider/examples/demonstrations/SC2-examples_1.scd

(->
  f = 80  # fundamental frequency
  p = 10  # number of partials per channel
  z =  0  # start of oscil daisy chain
  trig = XLine.kr([10, 10], 0.1, 60)  # trigger probability decreases over time
  p.do (i)->
    z = FSinOsc.ar(
      f * (i+1),     # freq of partial
      0,
      Decay2.kr(
        Dust.kr(  
          trig,    # trigger rate
          0.02     # trigger amplitude
        ), 
        0.005,     # grain attack time
        0.5.rand() # grain decay time
      ),
      z
    )
  z    
).play()


# // harmonic tumbling
# play({
#   var f, p, z, trig;
#   f = 80;  // fundamental frequency
#   p = 10;  // number of partials per channel
#   z = 0.0; // start of oscil daisy chain
#   trig = XLine.kr([10,10], 0.1, 60);  // trigger probability decreases over time
#   p.do({ arg i;
#     z = FSinOsc.ar(
#         f * (i+1),     // freq of partial
#         0,
#         Decay2.kr(
#           Dust.kr(  
#             trig,   // trigger rate
#             0.02    // trigger amplitude
#           ), 
#           0.005,    // grain attack time
#           0.5.rand  // grain decay time
#         ),
#         z
#     )
#   });
#   z
# })
