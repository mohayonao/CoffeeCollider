# origin: SuperCollider/examples/demonstrations/SC2-examples_1.scd

(->
  lfoDepth = MouseY.kr(200, 8000, 1)
  lfoRate = MouseX.kr(4, 60, 1)
  freq = LFSaw.kr(lfoRate, 0, lfoDepth, lfoDepth * 1.2)
  filtered = RLPF.ar(WhiteNoise.ar([0.03, 0.03]), freq, 0.1)
  CombN.ar(filtered, 0.3, 0.3, 2, 1, filtered)
).play()


# // sweepy noise - mouse controls LFO
# {
#   var lfoDepth, lfoRate, freq, filtered;
#   lfoDepth = MouseY.kr(200, 8000, 'exponential');
#   lfoRate = MouseX.kr(4, 60, 'exponential');
#   freq = LFSaw.kr(lfoRate, 0, lfoDepth, lfoDepth * 1.2);
#   filtered = RLPF.ar(WhiteNoise.ar([0.03,0.03]), freq, 0.1);
#   CombN.ar(filtered, 0.3, 0.3, 2, 1, filtered);
# }.play
