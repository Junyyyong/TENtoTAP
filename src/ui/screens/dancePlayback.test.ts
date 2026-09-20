import {afterEach,describe,it,expect,vi} from 'vitest';
import {DancePlayback} from './dancePlayback';
class Media extends EventTarget {
 src='';currentTime=0;paused=true;ended=false;readyState=2;videoWidth=200;muted=false;playsInline=false;
 classList={add:vi.fn(),remove:vi.fn()};
 play=vi.fn(async()=>{this.paused=false;}); pause=vi.fn(()=>{this.paused=true;});load=vi.fn();
 frames=new Map<number,()=>void>();id=0;
 requestVideoFrameCallback=(f:()=>void)=>{this.frames.set(++this.id,f);return this.id;};
 cancelVideoFrameCallback=(id:number)=>this.frames.delete(id);
 frame(){const callbacks=[...this.frames.values()];this.frames.clear();callbacks.forEach(f=>f());}
}
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
function setup(){vi.useFakeTimers();vi.stubGlobal('window',globalThis);vi.stubGlobal('location',{href:'https://example.test/'});
 const video=new Media(),audio=new Media(),hold=vi.fn();
 const player=new DancePlayback(video as unknown as HTMLVideoElement,audio as unknown as HTMLAudioElement);
 player.play(['first.webm','fallback.mp4'],'sound.mp3',()=>true,hold);return {video,audio,player,hold};}
describe('dance audio follows decoded video',()=>{
 it('waits for a rendered frame, pauses on buffering and resumes in sync',()=>{
  const {video,audio,player}=setup();video.dispatchEvent(new Event('playing'));expect(audio.play).not.toHaveBeenCalled();
  video.currentTime=.4;video.frame();expect(audio.play).toHaveBeenCalledOnce();expect(audio.currentTime).toBe(.4);
  video.dispatchEvent(new Event('waiting'));expect(audio.paused).toBe(true);
  video.currentTime=.8;video.dispatchEvent(new Event('playing'));video.frame();expect(audio.currentTime).toBe(.8);player.stop();
 });
 it('retries the alternate source and ends silently when both fail',()=>{
  const {video,audio,hold}=setup();video.dispatchEvent(new Event('error'));expect(video.src).toContain('fallback.mp4');
  video.dispatchEvent(new Event('error'));expect(hold).toHaveBeenCalledOnce();expect(audio.paused).toBe(true);
 });
 it('does not let a late frame start audio after leaving',()=>{
  const {video,audio,player}=setup();video.dispatchEvent(new Event('playing'));player.stop();video.frame();expect(audio.play).not.toHaveBeenCalled();
 });
 it('falls back when no frame arrives and eventually releases the hold',()=>{
  const {video,hold,audio}=setup();vi.advanceTimersByTime(8000);expect(video.src).toContain('fallback.mp4');
  vi.advanceTimersByTime(8000);expect(hold).toHaveBeenCalledOnce();expect(audio.play).not.toHaveBeenCalled();
 });
});
