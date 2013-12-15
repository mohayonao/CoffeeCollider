syn = SynthDef (freqs=[0,0,0,0], trig=0)->
  chord = Mix(SinOscFB.ar(freqs, feedback:0.5, mul:0.25))
  chord = chord * LFTri.kr("~bpm120 l16", mul:0.2, add:0.5)
  chord = chord * Decay.kr(trig, 5)

  arp_t = TrigImpulse.kr(trig, "~bpm120 l8")
  arp_f = Demand.kr(arp_t, 0, Drand(freqs, Infinity) )
  arp   = Saw.ar(arp_f, 0.1) * Decay.kr(arp_t, "bpm120 l4")
  arp   = arp + CombL.ar(arp, delaytime:"bpm120 l8.", decaytime:5) * 0.5
  
  Out.ar(0, (chord + arp).dup())
.play()

Task ->
  score = [
    [ F4, "M7",  0, "bpm120 l2" ]
    [ G4, "M" ,  0, "bpm120 l2" ]
    [ E4, "m7",  0, "bpm120 l2" ]
    [ A4, "m" , -1, "bpm120 l2" ]
    
    [ F4, "M7",  0, "bpm120 l2" ]
    [ G4, "M" ,  0, "bpm120 l2" ]
    [ E4, "m7",  0, "bpm120 l2" ]
    [ A4, "m" , -1, "bpm120 l4" ]
    [ E4, "M7",  0, "bpm120 l4" ]
  ]
  Pseq(score, Infinity).do syncblock ([tone, chordname, inv, dur])->
    syn.set trig:1, freqs:tone.midichord(chordname, inversion:inv, length:4).midicps()
    dur.wait()
.start()
