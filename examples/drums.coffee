# origin: SuperCollider/examples/demonstrations/DrumSynths.scd

# SOS Drums by Renick Bell, renick_at_gmail.com
# recipes from Gordon Reid in his Sound on Sound articles

# SOSdrums


# SOSkick -------
# http://www.soundonsound.com/sos/jan02/articles/synthsecrets0102.asp
# increase mod_freq and mod_index for interesting electronic percussion
SOSkick = SynthDef (out=0, freq=50, mod_freq=5, mod_index=5, sustain=0.4, amp=0.8, beater_noise_level=0.025)->
  pitch_contour = Line.kr(freq * 2, freq, 0.02)
  drum_osc = PMOsc.ar(
    pitch_contour,
    mod_freq,
    mod_index / 1.3,
    mul: 1,
    add: 0
  )
  drum_lpf = LPF.ar(in:drum_osc, freq:1000, mul:1, add:0)
  drum_env = drum_lpf * EnvGen.ar(Env.perc(0.005, sustain), 1, doneAction:2)
  beater_source = WhiteNoise.ar(beater_noise_level)
  beater_hpf = HPF.ar(in:beater_source, freq:500, mul:1, add:0)
  lpf_cutoff_contour = Line.kr(6000, 500, 0.03)
  beater_lpf = LPF.ar(in:beater_hpf, freq:lpf_cutoff_contour, mul:1, add:0)
  beater_env = beater_lpf * EnvGen.ar(Env.perc(), 1, doneAction:2)
  kick_mix = Mix.new([drum_env, beater_env]) * 2 * amp
  Out.ar(out, [kick_mix, kick_mix])
.add()


# SOSsnare -------
# http://www.soundonsound.com/sos/Mar02/articles/synthsecrets0302.asp
SOSsnare = SynthDef (out=0, sustain=0.1, drum_mode_level=0.25, snare_level=40, snare_tightness=1000, freq=405, amp=0.8)->
  drum_mode_env = EnvGen.ar(Env.perc(0.005, sustain), 1, doneAction:2)
  drum_mode_sin_1 = SinOsc.ar(freq * 0.53, 0, drum_mode_env * 0.5)
  drum_mode_sin_2 = SinOsc.ar(freq, 0, drum_mode_env * 0.5)
  drum_mode_pmosc = PMOsc.ar(
    Saw.ar(freq * 0.85),
    184,
    0.5 / 1.3,
    mul: drum_mode_env * 5,
    add: 0
  )
  drum_mode_mix = Mix([
    drum_mode_sin_1, drum_mode_sin_2, drum_mode_pmosc
  ]) * drum_mode_level
  
  # choose either noise source below
  # snare_noise = Crackle.ar(2.01, 1)
  snare_noise = LFNoise0.ar(20000, 0.1)
  snare_env = EnvGen.ar(Env.perc(0.005, sustain), 1, doneAction:2)
  snare_brf_1 = BRF.ar(in:snare_noise, freq:8000, mul:0.5, rq:0.1)
  snare_brf_2 = BRF.ar(in:snare_brf_1, freq:5000, mul:0.5, rq:0.1)
  snare_brf_3 = BRF.ar(in:snare_brf_2, freq:3600, mul:0.5, rq:0.1)
  snare_brf_4 = BRF.ar(in:snare_brf_3, freq:2000, mul:snare_env, rq:0.0001)
  snare_reson = Resonz.ar(snare_brf_4, snare_tightness, mul:snare_level)
  snare_drum_mix = Mix.new([drum_mode_mix, snare_reson]) * 5 * amp
  Out.ar(out, [snare_drum_mix, snare_drum_mix])
.add()


# SOShats -------
# http://www.soundonsound.com/sos/Jun02/articles/synthsecrets0602.asp
SOShats = SynthDef (out=0, freq=6000, sustain=0.1, amp=0.8)->
  root_cymbal_square = Pulse.ar(freq, 0.5, mul:1)
  root_cymbal_pmosc = PMOsc.ar(
    root_cymbal_square,
    [freq * 1.34, freq * 2.405, freq * 3.09, freq * 1.309],
    [310 / 1.3, 26 / 0.5, 11 / 3.4, 0.72772]
  )
  
  root_cymbal = Mix.new(root_cymbal_pmosc)
  initial_bpf_contour = Line.kr(15000, 9000, 0.1)
  initial_env = EnvGen.ar(Env.perc(0.005, 0.1), 1)
  initial_bpf = BPF.ar(root_cymbal, initial_bpf_contour, mul:initial_env)
  body_env = EnvGen.ar(Env.perc(0.005, sustain, 1, -2), 1, doneAction:2)
  body_hpf = HPF.ar(in:root_cymbal, freq:Line.kr(9000, 12000, sustain), mul:body_env)
  cymbal_mix = Mix.new([initial_bpf, body_hpf]) * amp
  Out.ar(out, [ cymbal_mix, cymbal_mix ])
.add()

# SOStom -------
# http://www.soundonsound.com/sos/Mar02/articles/synthsecrets0302.asp
SOStom = SynthDef (out=0, sustain=0.4, drum_mode_level=0.25, freq=90, drum_timbre=1, amp=0.8)->
  drum_mode_env = EnvGen.ar(Env.perc(0.005, sustain), 1, doneAction:2)
  drum_mode_sin_1 = SinOsc.ar(freq * 0.8, 0, drum_mode_env * 0.5)
  drum_mode_sin_2 = SinOsc.ar(freq, 0, drum_mode_env * 0.5)
  drum_mode_pmosc = PMOsc.ar(
    Saw.ar(freq * 0.9),
    freq * 0.85,
    drum_timbre / 1.3,
    mul: drum_mode_env * 5
  )
  drum_mode_mix = Mix.new([
    drum_mode_sin_1, drum_mode_sin_2, drum_mode_pmosc
    ]) * drum_mode_level
  stick_noise = Crackle.ar(2.01, 1)
  stick_env = EnvGen.ar(Env.perc(0.005, 0.01), 1) * 3
  tom_mix = Mix.new([drum_mode_mix, stick_env]) * 2 * amp
  Out.ar(out, [ tom_mix, tom_mix ])
.add()


# sequencer
pattern = [
  'X-o- Xxo- X-o- X-o-  X-o- Xxo- X-O- x---' # Hat
  '---- X--- --o- X---  ---- X--- ---- O---' # Snare
  '---- ---- ---- ----  ---- ---- ---- --x-' # Tom
  'X-x- --x- X--- --x-  X-x- --x- X--- X---' # Kick
].map (x)-> (x.replace /\s+/g, '').split ''

Task ->
  [hat, snare, tom, kick] = pattern
  Infinity.do syncblock (i)->
    switch hat.wrapAt(i)
      when 'x' then Synth(SOShats, amp:0.01, sustain:0.05)
      when 'X' then Synth(SOShats, amp:0.05, sustain:0.05)
      when 'o' then Synth(SOShats, amp:0.08, sustain:0.25)
      when 'O' then Synth(SOShats, amp:0.10, sustain:0.25)
    switch snare.wrapAt(i)
      when 'x' then Synth(SOSsnare, amp:0.6, drum_mode_level:0.1)
      when 'X' then Synth(SOSsnare, amp:0.8, drum_mode_level:0.1)
      when 'o' then Synth(SOSsnare, amp:0.6, sustain:0.15)
      when 'O' then Synth(SOSsnare, amp:0.8, sustain:0.15)
    switch tom.wrapAt(i)
      when 'x' then Synth(SOStom, amp:0.6)
      when 'X' then Synth(SOStom, amp:0.8)
    switch kick.wrapAt(i)
      when 'x' then Synth(SOSkick, amp:0.7, beater_noise_level:0.05)
      when 'X' then Synth(SOSkick, amp:0.9, beater_noise_level:0.05)
    "bpm128 l16".wait()
.start()
