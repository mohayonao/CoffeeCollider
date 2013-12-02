decayPink = SynthDef (outBus=0, effectBus=0, direct=0.5)->
  # Decaying pulses of PinkNoise. We'll add reverb later.
  source = Decay2.ar(Impulse.ar(1, 0.25), 0.01, 0.2, PinkNoise.ar())
  # this will be our main output
  Out.ar(outBus, source * direct)
  # this will be our effects output
  Out.ar(effectBus, source * (1 - direct))
.send()

decaySin = SynthDef (outBus=0, effectBus=0, direct=0.5)->
  # Decaying pulses of a modulating Sine wave. We'll add reverb later.
  source = Decay2.ar(Impulse.ar(0.3, 0.25), 0.3, 1, SinOsc.ar(SinOsc.kr(0.2, 0, 110, 440)))
  # this will be our main output
  Out.ar(outBus, source * direct)
  # this will be our effects output
  Out.ar(effectBus, source * (1 - direct))
.send()

reverb = SynthDef (outBus=0, inBus=0)->
  input = In.ar(inBus, 1)
  # a low rent reverb
  # aNumber.do will evaluate it's function argument 
  # a corresponding number of times
  # (->).dup(n) will evaluate the function n times, 
  # and return an Array of the results
  # The default for n is 2, so this makes a stereo reverb    
  for i in [0...16]
    input = AllpassC.ar(input, 0.04, (-> Rand(0.001, 0.04)).dup(), 3)
    Out.ar(outBus, input)
.send()

x = Synth(reverb, {inBus:0})
y = Synth.before(x, decayPink, {effectBus:0})
z = Synth.before(x, decaySin , {effectBus:0, outBus:1})
