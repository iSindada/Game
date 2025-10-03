import { NES } from 'jsnes'

export function createNES({onFrame, onAudioSample}){
  const nes = new NES({ onFrame, onAudioSample })
  return {
    id: 'nes',
    name: 'Nintendo Entertainment System',
    extensions: ['nes'],
    loadROM(bytes){ nes.loadROM(new Uint8Array(bytes)); },
    frame(){ nes.frame(); },
    reset(){ nes.reset(); },
    buttonDown(p,b){ nes.buttonDown(p,b); },
    buttonUp(p,b){ nes.buttonUp(p,b); },
    save(){ try{ return nes.toJSON(); }catch{return null} },
    load(state){ try{ nes.fromJSON(state); }catch{} },
    sampleRate: 44100,
  }
}
