assert = require('chai').assert

coffee = require 'coffee-script'
cc = require "#{__dirname}/../build/coffee-collider"

describe 'eval', ->
  client = null
  before -> client = new cc.CoffeeCollider()

  it 'arithmetic', (done)->
    code = '''[
      (1 + +2 * 3 + -4 / 2) % 3
      ((1 + +2) * 3 + -4 / 2) % 3
    ]'''
    expected = coffee.eval code
    client.execute code, (actual)->
      assert.deepEqual actual, expected
      do done

      
  it 'assignmet', (done)->
    code = '''
[ a, b, c, d, e ] = [ 100, 100, 100, 100, 100 ]
a += 100
b -= 100
c *= 100
d /= 100
e %= 100
[ a, b, c, d, e ]    
    '''
    expected = coffee.eval code
    client.execute code, (actual)->
      assert.deepEqual actual, expected
      do done

      
  it 'string', (done)->
    code = '''
a = "abc"
b = "def"

[
  a+b
  a*2
  (a+b)/2
  (a+a)%2
  "#{a}#{b}ghi"/3
]
    '''
    expected = [
      "abcdef"
      "abcabc"
      ["abc", "def"]
      ["ab", "ca", "bc"]
      ["abc", "def", "ghi"]
    ]
    client.execute code, (actual)->
      assert.deepEqual actual, expected
      do done
