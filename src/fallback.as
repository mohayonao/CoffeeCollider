package {
  import flash.display.Sprite;
  import flash.events.SampleDataEvent;
  import flash.media.Sound;
  import flash.utils.ByteArray;
  import flash.external.ExternalInterface;

  public class fallback extends Sprite {
    private var _sound:Sound = null;
    private var _playing:Boolean = false;
    private var _stream:Array = [];

    function fallback() {
      ExternalInterface.addCallback("play" , _play );
      ExternalInterface.addCallback("pause", _pause);
      ExternalInterface.addCallback("writeAudio", _writeAudio);
      ExternalInterface.call("coffeecollider_flashfallback_init");
    }

    private function _play():void {
      _playing = true;
      if (!_sound) {
        _sound = new Sound();
        _sound.addEventListener(SampleDataEvent.SAMPLE_DATA, _onaudioprocess);
        _sound.play();
      }
    }
    private function _pause():void {
      _playing = false;
    }
    private function _writeAudio(samples:String):void {
      var i:int;
      var imax:int = samples.length >> 1;
      for (i = 0; i < imax; ++i) {
        _stream.push((samples.charCodeAt(i       ) - 32768) / 16384);
        _stream.push((samples.charCodeAt(i + imax) - 32768) / 16384);
      }
    }
    private function _onaudioprocess(e:SampleDataEvent):void {
      var i:int;
      var imax:int;
      var buffer:ByteArray = e.data;

      if (!_playing || _stream.length < 4096) {
        for (i = 0; i < 4096; ++i) {
          buffer.writeFloat(0);
        }
        return;
      }
      imax = Math.min(_stream.length, 4096);
      for (i = 0; i < imax; ++i) {
        buffer.writeFloat(_stream[i]);
      }
      _stream = _stream.slice(imax, _stream.length);
    }
  }
}
