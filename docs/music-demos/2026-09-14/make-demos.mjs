// Original, procedurally composed listening drafts. Not imported by the game.
// No samples or melodies are taken from TAPtoPICK.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
const out = process.argv[2];
if (!out) throw new Error('Pass a temporary output directory');
const SR = 44100, TAU = Math.PI * 2;
const loop = process.argv.includes('--loop');
let seed = 1914;
const rand = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
const freq = n => 440 * 2 ** ((n - 69) / 12);
function compose(name, bpm, active) {
  const beat = 60 / bpm, seconds = 64 * beat + 2;
  const L = new Float32Array(Math.ceil(seconds * SR)), R = new Float32Array(L.length);
  function put(t, dur, gain, pan, wave) {
    const start = Math.floor(t * SR), n = Math.floor(dur * SR);
    const gl = gain * Math.sqrt((1 - pan) / 2), gr = gain * Math.sqrt((1 + pan) / 2);
    for (let i = 0; i < n && start + i < L.length; i++) {
      const v = wave(i / SR, i, n);
      L[start + i] += v * gl; R[start + i] += v * gr;
    }
  }
  function note(t, pitch, len, gain, kind = 'piano', pan = 0) {
    const f = freq(pitch), dur = len + .3;
    put(t, dur, gain, pan, (x) => {
      const attack = 1 - Math.exp(-x * 400);
      const release = x > len ? Math.exp(-(x - len) * 25) : 1;
      if (kind === 'bass') return attack * release * Math.exp(-x * 3) *
        (Math.sin(TAU*f*x) + .25*Math.sin(TAU*f*2*x));
      if (kind === 'bell') return attack * release * Math.exp(-x * 4.5) *
        (Math.sin(TAU*f*x) + .25*Math.exp(-x*7)*Math.sin(TAU*f*3.99*x) + .1*Math.exp(-x*14)*Math.sin(TAU*f*9.98*x));
      return attack * release * (
        .7*Math.exp(-x*3)*Math.sin(TAU*f*x) +
        .19*Math.exp(-x*5)*Math.sin(TAU*f*2.002*x) +
        .1*Math.exp(-x*7)*Math.sin(TAU*f*3.004*x) +
        .04*Math.exp(-x*13)*Math.sin(TAU*f*5*x));
    });
  }
  function tap(t, accent, pan) {
    let previous = 0;
    put(t, .095, accent, pan, x => {
      const noise = rand()*2-1, high = noise - previous; previous = noise;
      return (1-Math.exp(-x*1800)) * Math.exp(-x*85) *
        (.23*high + .45*Math.sin(TAU*920*x)*Math.exp(-x*45) + .25*Math.sin(TAU*1730*x));
    });
  }
  function brush(t) {
    put(t, .12, .025, .35, x => (rand()*2-1)*Math.exp(-x*38)*(1-Math.exp(-x*900)));
  }
  // C6 / A minor7 / D minor7 / G7, then a short resolving turnaround.
  const chords = [[60,64,67,69],[57,60,64,67],[62,65,69,72],[59,62,65,69],
    [60,64,67,71],[57,60,64,67],[62,65,69,72],[59,62,65,67],
    [65,69,72,74],[64,67,71,74],[62,65,69,72],[59,62,65,69],
    [60,64,67,69],[57,60,64,67],[62,65,67,71],[60,64,67,69]];
  const roots = [36,33,38,31,36,33,38,31,41,40,38,31,36,33,31,36];
  const lobby = [
    [76,-1,79,81,79,-1,76,74], [72,-1,76,79,76,-1,72,-1],
    [74,77,81,-1,79,77,74,-1], [71,-1,74,77,74,72,71,-1],
    [76,79,83,-1,81,79,76,-1], [76,-1,72,69,72,76,79,-1],
    [77,-1,74,77,81,79,77,74], [71,74,77,-1,79,-1,-1,-1],
    [81,-1,84,86,84,81,79,-1], [79,83,86,-1,83,79,76,-1],
    [77,-1,81,84,81,77,74,-1], [77,74,71,-1,74,77,79,-1],
    [76,79,81,-1,79,76,74,-1], [72,76,79,-1,76,72,69,-1],
    [74,77,79,-1,77,74,71,74], [76,-1,74,-1,72,-1,-1,-1]];
  const game = [
    [72,76,79,-1,76,79,81,79], [76,72,69,-1,72,76,79,76],
    [74,77,81,77,74,-1,77,81], [79,77,74,71,74,-1,77,74],
    [76,79,83,79,81,-1,79,76], [72,76,79,81,79,76,72,-1],
    [74,77,81,84,81,77,74,77], [79,-1,77,74,71,74,77,-1],
    [81,84,86,84,81,-1,79,77], [79,83,86,83,79,76,74,-1],
    [77,81,84,81,77,74,77,81], [79,77,74,71,74,77,79,-1],
    [79,76,72,76,79,81,79,76], [76,72,69,72,76,79,76,72],
    [74,77,79,83,81,79,77,74], [76,79,76,74,72,-1,-1,-1]];
  const melody = active ? game : lobby;
  for (let bar = 0; bar < 16; bar++) {
    const at = bar * 4 * beat;
    for (let b = 0; b < 4; b++) {
      const pitch = b === 0 ? roots[bar] : b === 2 ? roots[bar]+7 : roots[bar]+12;
      note(at+b*beat, pitch, beat*.65, active ? .18 : .16, 'bass', -.08);
      if (b === 1 || b === 3) chords[bar].forEach((n,i) =>
        note(at+b*beat+i*.009,n,beat*.3,.06,'piano',-.4));
      tap(at+b*beat, b%2 ? .105 : .07, b%2 ? .25 : -.25);
      brush(at+(b+.65)*beat);
      if (active || b===3) tap(at+(b+.66)*beat,.042,-.2);
    }
    melody[bar].forEach((pitch,i) => {
      if (pitch < 0) return;
      const offset = Math.floor(i/2) + (i%2 ? .62 : 0);
      note(at+offset*beat,pitch,beat*(active ? .36 : .48),active ? .135 : .16,active?'piano':'bell',.2);
    });
    if (active && bar%4===3 && bar<15) {
      for (const v of [3.35,3.65,3.83]) tap(at+v*beat,.055,v%1>.5?.45:-.45);
    }
  }
  // A quiet stereo room tail, followed by a short fade for the listening demo.
  const dryL = L.slice(), dryR = R.slice();
  for (const [delay,amount] of [[.071,.07],[.113,.05],[.173,.035]]) {
    const d = Math.floor(delay*SR);
    for (let i=d;i<L.length;i++) { L[i]+=dryR[i-d]*amount; R[i]+=dryL[i-d]*amount; }
  }
  if (loop) {
    const end = Math.round(64 * beat * SR);
    for (let i=end;i<L.length;i++) { L[i-end]+=L[i]; R[i-end]+=R[i]; }
  }
  const frames = loop ? Math.round(64 * beat * SR) : L.length;
  let peak=0;
  for(let i=0;i<L.length;i++) peak=Math.max(peak,Math.abs(L[i]),Math.abs(R[i]));
  const gain=.78/peak;
  const data=Buffer.alloc(44+frames*4);
  data.write('RIFF'); data.writeUInt32LE(data.length-8,4); data.write('WAVEfmt ',8);
  data.writeUInt32LE(16,16); data.writeUInt16LE(1,20); data.writeUInt16LE(2,22);
  data.writeUInt32LE(SR,24); data.writeUInt32LE(SR*4,28); data.writeUInt16LE(4,32);
  data.writeUInt16LE(16,34); data.write('data',36); data.writeUInt32LE(frames*4,40);
  for(let i=0;i<frames;i++) {
    const fade=loop ? 1 : Math.min(1,i/(SR*.02),(L.length-i)/(SR*.6));
    data.writeInt16LE(Math.round(L[i]*gain*fade*32767),44+i*4);
    data.writeInt16LE(Math.round(R[i]*gain*fade*32767),46+i*4);
  }
  writeFileSync(join(out,name+'.wav'),data);
  console.log(JSON.stringify({name,bpm,seconds,sourcePeak:peak,outputPeak:.78}));
}
compose('01-lobby-little-tap',112,false);
compose('02-game-number-shuffle',loop ? 124 : 118,true);
