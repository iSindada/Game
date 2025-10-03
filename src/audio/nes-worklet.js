// src/audio/nes-worklet.js
class SampleQueue {
  constructor() { this.l = []; this.r = []; }
  push(l, r){ this.l.push(l); this.r.push(r); }
  popStereo(n){
    const outL = new Float32Array(n), outR = new Float32Array(n);
    for (let i=0;i<n;i++){ outL[i] = this.l.length ? this.l.shift() : 0; outR[i] = this.r.length ? this.r.shift() : 0; }
    return [outL, outR];
  }
}

class NesProcessor extends AudioWorkletProcessor {
  constructor(){
    super();
    this.queue = new SampleQueue();
    this.port.onmessage = (e)=>{
      const d = e.data;
      if (d.type === 'samples') {
        // d.l and d.r are Float32Array buffers
        for (let i=0;i<d.l.length;i++){ this.queue.push(d.l[i], d.r[i]); }
      }
    }
  }
  process(inputs, outputs){
    const output = outputs[0];
    const [l, r] = this.queue.popStereo(output[0].length);
    output[0].set(l);
    output[1].set(r);
    return true;
  }
}
registerProcessor('nes-audio', NesProcessor);
