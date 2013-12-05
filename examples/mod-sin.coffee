# origin: SuperCollider/examples/demonstrations/SC2-examples_1.scd

(->
  a0 = 200.rand() + 40
  a1 = a0 + 1.rand2()
  a  = [a0, a1]
  b  = 2000.rand()
  c = [a0 + 1.rand2(), a1 + 1.rand2()]
  SinOsc.ar(SinOsc.ar(a, 0, 1.rand() * b, b), 0, SinOsc.kr(c, 0, 0.05, 0.05))
).play()

# {
#     var a, a0, a1, b, c, pan;
#     a0 = 200.0.rand + 40;
#     a1 = a0 + 1.0.rand2;
#     a = [a0, a1];
#     b = 2000.0.rand;
#     c = [a0 + 1.0.rand2, a1 + 1.0.rand2];
#     SinOsc.ar(SinOsc.ar(a, 0, 1.0.rand * b, b), 0, SinOsc.kr(c, 0, 0.05, 0.05))
# }.play;
