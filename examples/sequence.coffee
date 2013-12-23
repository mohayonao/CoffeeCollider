$pattern = [
  'xxxx xxxx xxxx xxxx  Xx-- x-x- --x- x-xx'
  'x--- x-x- x-x- x---  x--- x-x- -xx- ----'
  '---- x--x ---- x---  ---- x--x --x- x---'
  'x--- --x- ---x ----  x--- --x- -x-- x---'
].map (x)-> (x.replace /\s+/g, '').split ''

(
  seq1 = SynthDef (freq=880, fb=0.45, dur="bpm132 l16")->
    osc = SinOscFB.ar([freq, freq * 1.025], fb) * Line.kr(0.25, 0, dur:dur, doneAction:2)
    Out.ar(2, osc)
  .send()

  seq2 = SynthDef ->
    osc = Saw.ar(XLine.kr(880 * 4, 220, 0.1))
    osc *= EnvGen.kr(Env.perc(releaseTime:0.3, level:0.5), doneAction:2)
    Out.ar(2, Pan2.ar(osc, LFCub.kr(1) * 0.75))
  .send()

  drum = SynthDef (t_hh, t_sd, t_bd)->
    hh = RHPF.ar(WhiteNoise.ar(), freq:8000, rq:0.05)
    hh *= EnvGen.kr(Env.perc(releaseTime:0.05, level:0.05), t_hh)
    
    sd = RLPF.ar(PinkNoise.ar(), freq:4000, rq:0.75)
    sd *= EnvGen.kr(Env.perc(releaseTime:0.25, level:0.25), t_sd)
    
    bd = LPF.ar(ClipNoise.ar(8), freq:40, rq:0.5)
    bd *= EnvGen.kr(Env.perc(releaseTime:0.25, level:2.5), t_bd)
    
    Out.ar(0, Pan2.ar(hh + sd + bd, 0))
  .play()

  efx = SynthDef ->
    Out.ar(0, FreeVerb.ar(In.ar([2, 3]), room:0.75))
  .play()
  
  
  Task ->
    freqs = [ 880, 440, 880*2, 220, 880*2, 660, 880*2, 660 ]
    Infinity.do syncblock (i)->
      switch $pattern[0].wrapAt(i)
        when 'x' then Synth(seq1, freq:freqs.wrapAt(i))
        when 'X' then Synth(seq2)
      switch $pattern[1].wrapAt(i)
        when 'x' then drum.set t_hh:1
      switch $pattern[2].wrapAt(i)
        when 'x' then drum.set t_sd:1
      switch $pattern[3].wrapAt(i)
        when 'x' then drum.set t_bd:1
      "bpm132 l16".wait()
  .start()
)