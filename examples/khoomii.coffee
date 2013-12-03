khoomii = SynthDef((formant=[700, 1200, 2900])->
  freq = 174.61412048339844
  freq = freq + LFPar.kr(3, mul:0.8)
  
  synth = Saw.ar(freq) * 0.5
  synth = Mix(BPF.ar(synth, formant, rq:[0.2, 0.1, 0.05]))
  
  Out.ar(0, synth)
, [0.25]).play()

Task ->
  formants = [
    [ 700, 1200, 2900 ]
    [ 300, 2700, 2700 ]
    [ 390, 1200, 2500 ]
    [ 450, 1750, 2750 ]
    [ 460,  880, 2800 ]
  ]
  Prand(formants, Infinity).do syncblock (formant)->
    khoomii.set formant:formant
    rrand(0.1, 1.0).wait()
.start()
