# CoffeeCollider [![Build Status](https://travis-ci.org/mohayonao/CoffeeCollider.png?branch=master)](https://travis-ci.org/mohayonao/CoffeeCollider)
CoffeeCollider is a language for real time audio synthesis and algorithmic composition in HTML5.

*This is under development.*

## Concept
Write like a CoffeeScript, be processed like a SuperCollider.

## Examples

[play it](http://goo.gl/yXLlGj)

```coffeescript
def = Synth.def (freq=440, amp=1)->
  amp *= Line.kr(0.75, 0, 2.5, doneAction:2)
  Out.ar(3, SinOsc.ar([freq, freq * 1.25]) * amp)
 
Synth.def ->
  Out.ar(0, CombL.ar(In.ar(3, 2), delaytime:1, decaytime:10))
.play()
 
Task.loop ->
  s = def.play()
  f = Math.random() * 880 + 220
  t = Task.each [1,4,3,2,8,4,3,2], (x, i)->
    s.set freq:f*x, amp:1-(i/8)
    @wait 125
  .play()
  @wait t
.play()
```

## Documents

[imperfect documents](https://github.com/mohayonao/CoffeeCollider/wiki/_pages)
