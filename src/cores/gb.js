import { WasmBoy } from 'wasmboy'

export async function createGB({canvas, onFrame, onAudioSample}){
  // WasmBoy renders to a canvas itself; but we unify API by drawing from canvas -> onFrame callback
  // We'll use an offscreen canvas for WasmBoy, then copy pixels into our main canvas each frame.
  const off = document.createElement('canvas')
  off.width = 160; off.height = 144;

  await WasmBoy.config({
    isGbcEnabled: true,
    headless: false,
    useGbcWhenOptional: true,
    audioBatchProcessing: true,
    graphicsBatchProcessing: false,
    usePalette: true,
    isAudioEnabled: true,
    frameSkip: 0,
    audioAccumulateSamples: true,
    timersAccumulateCycles: true,
    graphicsDisableScanlineRendering: false,
    html5CanvasElement: off,
  })

  await WasmBoy.init()

  const ctx = canvas.getContext('2d')
  const imageData = ctx.createImageData(160,144)

  function copyFrame(){
    // read back pixels from offscreen
    const octx = off.getContext('2d')
    const img = octx.getImageData(0,0,160,144)
    imageData.data.set(img.data)
    ctx.putImageData(imageData, 0, 0)
    if (onFrame) onFrame(new Uint32Array(img.data.buffer))
  }

  WasmBoy._onEndFrame = copyFrame

  return {
    id: 'gb',
    name: 'Game Boy / Game Boy Color',
    extensions: ['gb','gbc'],
    async loadROM(bytes){
      await WasmBoy.loadROM(bytes)
      await WasmBoy.play()
    },
    frame(){ /* WasmBoy drives its own loop; we no-op to keep interface parity */ },
    reset(){ WasmBoy.reset(); },
    buttonDown(p,b){ /* map NES buttons to GB roughly */ },
    buttonUp(p,b){ },
    save(){ return null },
    load(){ },
    sampleRate: 44100,
  }
}
