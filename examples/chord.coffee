syn = SynthDef (freqs=[0,0,0,0], trig=0)->
  freqs = freqs.midicps()
  chord = Mix(SinOscFB.ar(freqs, feedback:0.5, mul:0.25))
  chord = chord * LFTri.kr("~bpm120 l16", mul:0.2, add:0.5)
  chord = chord * Decay.kr(trig, 2.5)
  
  Out.ar(0, chord)
.play()

Task ->
  score = [
    [ "F4", "M7", "bpm120 l2" ]
    [ "G4", "M" , "bpm120 l2" ]
    [ "E4", "m7", "bpm120 l2" ]
    [ "A4", "m" , "bpm120 l2" ]
  ]
  Pseq(score, Infinity).do syncblock (items)->
    [tone, chordname, dur] = items
    syn.set trig:1, freqs:tone.chord chordname
    dur.wait()
.start()

