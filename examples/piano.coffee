# origin: SuperCollider/examples/demonstrations/SC2-examples_1.scd

n = 6 # number of keys playing
(->
  Mix.ar Array.fill n, ->
    # calculate delay based on a random note
    pitch = 36 + 54.rand()
    strike = Impulse.ar(0.1 + 0.4.rand(), 2.pi().rand(), 0.1); # random period for each key
    hammerEnv = Decay2.ar(strike, 0.008, 0.04) # excitation envelope
    Pan2.ar(
      # array of 3 strings per note
      Mix.ar Array.fill 3, (i)->
        # detune strings, calculate delay time :
        detune = [-0.05, 0, 0.04].at(i)
        delayTime = 1 / (pitch + detune).midicps()
        # each string gets own exciter :
        hammer = LFNoise2.ar(3000, hammerEnv); # 3000 Hz was chosen by ear..
        CombL.ar(
          hammer,     # used as a string resonator
          delayTime,  # max delay time
          delayTime,  # actual delay time
          6
        )
      , (pitch - 36) / 27 - 1 # pan position: lo notes left, hi notes right
    )
).play()


# // synthetic piano
# var n;
# n = 6;  // number of keys playing
# play({
#   Mix.ar(Array.fill(n, {  // mix an array of notes
#     var delayTime, pitch, detune, strike, hammerEnv, hammer;
  
#     // calculate delay based on a random note
#     pitch = (36 + 54.rand); 
#     strike = Impulse.ar(0.1+0.4.rand, 2pi.rand, 0.1); // random period for each key
#     hammerEnv = Decay2.ar(strike, 0.008, 0.04); // excitation envelope
#     Pan2.ar(
#       // array of 3 strings per note
#       Mix.ar(Array.fill(3, { arg i;
#         // detune strings, calculate delay time :
#         detune = #[-0.05, 0, 0.04].at(i);
#         delayTime = 1 / (pitch + detune).midicps;
#         // each string gets own exciter :
#         hammer = LFNoise2.ar(3000, hammerEnv); // 3000 Hz was chosen by ear..
#         CombL.ar(hammer, // used as a string resonator
#           delayTime,     // max delay time
#           delayTime,     // actual delay time
#           6)             // decay time of string
#       })),
#       (pitch - 36)/27 - 1 // pan position: lo notes left, hi notes right
#     )
#   }))
# })
