import React, { useEffect, useMemo, useRef, useState } from 'react'
import Controls from '../components/Controls.jsx'
import Library from '../components/Library.jsx'
import { addRom, getRom, setCover } from '../lib/db.js'
import { createNES } from '../cores/nes.js'
import { createGB } from '../cores/gb.js'

const KEY_MAP = { 88:0, 90:1, 16:2, 13:3, 38:4, 40:5, 37:6, 39:7 }
const CORES = [
  { id: 'nes', name: 'NES', create: createNES, exts: ['nes'] },
  { id: 'gb',  name: 'GB/GBC', create: createGB, exts: ['gb','gbc'] },
]

export default function App(){
  const canvasRef = useRef(null)
  const coreRef = useRef(null)
  const afRef = useRef(0)
  const [fps, setFps] = useState(0)
  const [paused, setPaused] = useState(false)
  const [romName, setRomName] = useState('')
  const [platform, setPlatform] = useState('nes')
  const [tab, setTab] = useState('play') // play | library | settings
  const [message, setMessage] = useState('Ready. Load a ROM to play.')
  const frameTimer = useRef({ last: performance.now(), frames: 0 })
  const [gamepadsEnabled, setGamepadsEnabled] = useState(true)

  // Audio: try AudioWorklet, fallback to ScriptProcessor
  const audio = useRef({ ctx:null, node:null, useWorklet:false, bufferL:[], bufferR:[] })

  async function setupAudio(sampleRate=44100){
    const AudioContext = window.AudioContext || window.webkitAudioContext
    const ctx = new AudioContext({ sampleRate })
    audio.current.ctx = ctx
    try{
      await ctx.audioWorklet.addModule('./src/audio/nes-worklet.js')
      const node = new AudioWorkletNode(ctx, 'nes-audio', { outputChannelCount:[2] })
      node.connect(ctx.destination)
      audio.current.node = node
      audio.current.useWorklet = true
    }catch(e){
      // fallback
      const script = ctx.createScriptProcessor(1024, 0, 2)
      script.onaudioprocess = (e)=>{
        const L = e.outputBuffer.getChannelData(0)
        const R = e.outputBuffer.getChannelData(1)
        for (let i=0;i<L.length;i++){
          L[i] = audio.current.bufferL.length ? audio.current.bufferL.shift() : 0
          R[i] = audio.current.bufferR.length ? audio.current.bufferR.shift() : 0
        }
      }
      script.connect(ctx.destination)
      audio.current.node = script
      audio.current.useWorklet = false
    }
  }

  function pushSamples(l, r){
    if (!audio.current.ctx) return
    if (audio.current.useWorklet){
      // chunk and send
      const chunk = 128
      for (let i=0;i<l.length;i+=chunk){
        const ls = l.subarray ? l.subarray(i, i+chunk) : new Float32Array(l.slice(i, i+chunk))
        const rs = r.subarray ? r.subarray(i, i+chunk) : new Float32Array(r.slice(i, i+chunk))
        audio.current.node.port.postMessage({ type:'samples', l: ls, r: rs })
      }
    }else{
      audio.current.bufferL.push(...l)
      audio.current.bufferR.push(...r)
    }
  }

  // init
  useEffect(()=>{
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let imageData = ctx.createImageData(canvas.width, canvas.height)

    const onFrame = (frame) => {
      // frame could be Uint32Array RGBA (NES); ensure 256x240 fallback
      if (frame && frame.buffer && frame.byteLength === 256*240*4){
        imageData = ctx.createImageData(256,240)
        imageData.data.set(new Uint8ClampedArray(frame.buffer))
        ctx.putImageData(imageData, 0, 0)
      }
      const t = performance.now()
      const ft = frameTimer.current
      ft.frames += 1
      if (t - ft.last >= 1000){ setFps(ft.frames); ft.frames=0; ft.last=t }
    }
    const onAudioSample = (l,r) => {
      // jsnes emits float samples one by one, we buffer
      pushSamples(new Float32Array([l]), new Float32Array([r]))
    }

    let destroyed = false

    async function boot(){
      await setupAudio(44100)
      // default core NES
      const core = createNES({ onFrame, onAudioSample })
      coreRef.current = core
      setPlatform(core.id)
      setMessage('Ready. Load a ROM to play.')
    }
    boot()

    const handleKey = (down) => (e)=>{
      const btn = KEY_MAP[e.keyCode]; if (btn===undefined) return
      e.preventDefault()
      if (!coreRef.current) return
      if (down) coreRef.current.buttonDown(1, btn); else coreRef.current.buttonUp(1, btn)
    }
    window.addEventListener('keydown', handleKey(true))
    window.addEventListener('keyup', handleKey(false))

    // Audio unlock
    const resume = ()=>{
      if (audio.current.ctx && audio.current.ctx.state === 'suspended') audio.current.ctx.resume()
      window.removeEventListener('pointerdown', resume)
      window.removeEventListener('keydown', resume)
    }
    window.addEventListener('pointerdown', resume); window.addEventListener('keydown', resume)

    // Gamepad loop
    let gpRAF = 0
    const gpState = { axes:[0,0], buttons:{} }
    const pollGamepad = ()=>{
      if (!gamepadsEnabled) { gpRAF = requestAnimationFrame(pollGamepad); return }
      const gps = navigator.getGamepads ? navigator.getGamepads() : []
      const gp = gps[0]
      if (gp && coreRef.current){
        // Standard mapping: 12 up 13 down 14 left 15 right, 0/1 = A/B, 8 select, 9 start
        const map = [
          { idx:12, btn:4 }, { idx:13, btn:5 },
          { idx:14, btn:6 }, { idx:15, btn:7 },
          { idx:0,  btn:0 }, { idx:1,  btn:1 },
          { idx:8,  btn:2 }, { idx:9,  btn:3 },
        ]
        map.forEach(m=>{
          const pressed = gp.buttons[m.idx]?.pressed
          if (pressed && !gpState.buttons[m.idx]) { coreRef.current.buttonDown(1, m.btn); gpState.buttons[m.idx]=true }
          if (!pressed && gpState.buttons[m.idx]) { coreRef.current.buttonUp(1, m.btn); gpState.buttons[m.idx]=false }
        })
      }
      gpRAF = requestAnimationFrame(pollGamepad)
    }
    gpRAF = requestAnimationFrame(pollGamepad)

    return ()=>{
      destroyed = true
      cancelAnimationFrame(afRef.current)
      cancelAnimationFrame(gpRAF)
      window.removeEventListener('keydown', handleKey(true))
      window.removeEventListener('keyup', handleKey(false))
    }
  }, [gamepadsEnabled])

  const step = ()=>{
    const core = coreRef.current
    if (!core || paused) return
    core.frame()
    afRef.current = requestAnimationFrame(step)
  }

  const start = ()=>{ setPaused(false); cancelAnimationFrame(afRef.current); afRef.current = requestAnimationFrame(step) }
  const pause = ()=>{ setPaused(true); cancelAnimationFrame(afRef.current) }
  const reset = ()=>{ coreRef.current?.reset() }

  const switchCore = async (id)=>{
    const canvas = canvasRef.current
    if (id === 'nes'){
      coreRef.current = createNES({ onFrame:(f)=>{}, onAudioSample:(l,r)=>pushSamples(new Float32Array([l]), new Float32Array([r])) })
    }else if (id === 'gb'){
      coreRef.current = await createGB({ canvas, onFrame:(f)=>{}, onAudioSample:(l,r)=>{} })
    }
    setPlatform(id)
    setMessage(`Switched to ${id.toUpperCase()}. Load a ${id==='nes'?'.nes':'.gb/.gbc'} ROM.`)
  }

  async function handleFiles(files, toLibrary=false){
    for (const file of files){
      const ext = file.name.split('.').pop().toLowerCase()
      const core = CORES.find(c=>c.exts.includes(ext)) || CORES[0]
      if (toLibrary){
        const id = await addRom({ name:file.name, platform:core.id, blob:file })
        setTab('library')
      }else{
        const buf = await file.arrayBuffer()
        await ensureCore(core.id)
        await coreRef.current.loadROM ? coreRef.current.loadROM(buf) : coreRef.current.loadRom?.(buf)
        setRomName(file.name)
        setPlatform(core.id)
        setMessage('Running...')
        start()
        // Capture cover for library suggestion
        setTimeout(async ()=>{
          try{
            const dataURL = canvasRef.current.toDataURL('image/png')
            // if user later adds same ROM, cover will be there
          }catch{}
        }, 500)
      }
    }
  }

  async function ensureCore(id){
    if (!coreRef.current || coreRef.current.id !== id){
      await switchCore(id)
    }
  }

  const onDrop = async (e)=>{
    e.preventDefault()
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files, false)
  }

  const onPaste = async (e)=>{
    const item = [...e.clipboardData.items].find(i=>i.kind==='file')
    if (item){ const f = item.getAsFile(); if (f) handleFiles([f]) }
  }

  const addToLibrary = async (files)=>{
    await handleFiles(files, true)
  }

  const playFromLibrary = async (romMeta)=>{
    const rec = await getRom(romMeta.id)
    const buf = await rec.blob.arrayBuffer()
    await ensureCore(romMeta.platform)
    await coreRef.current.loadROM ? coreRef.current.loadROM(buf) : coreRef.current.loadRom?.(buf)
    setRomName(rec.name)
    setMessage('Running...')
    start()
  }

  return (
    <div className="page">
      <header className="topbar">
        <h1>Web Emulator Arcade — Ultimate</h1>
        <div className="tabs">
          <button className={tab==='play'?'active':''} onClick={()=>setTab('play')}>Play</button>
          <button className={tab==='library'?'active':''} onClick={()=>setTab('library')}>Library</button>
          <button className={tab==='settings'?'active':''} onClick={()=>setTab('settings')}>Settings</button>
        </div>
      </header>

      {tab==='play' && (
        <div className="layout">
          <div className="screen" onDragOver={(e)=>e.preventDefault()} onDrop={onDrop} onPaste={onPaste}>
            <canvas ref={canvasRef} className="canvas" width="256" height="240"></canvas>
            <div className="hud left">{platform.toUpperCase()} • {romName || 'No ROM'} • {fps} fps</div>
            <div className="hud right">Drop/Paste ROM here</div>
          </div>

          <div className="panel">
            <div className="group">
              <div className="group-title">Load & Core</div>
              <div className="actions">
                <label className="filebtn">Load ROM<input type="file" accept=".nes,.gb,.gbc" onChange={(e)=>e.target.files?.length && handleFiles(e.target.files)} /></label>
                <button onClick={!paused?()=>pause():()=>start()}>{!paused?'Pause':'Resume'}</button>
                <button onClick={reset}>Reset</button>
                <select value={platform} onChange={(e)=>switchCore(e.target.value)}>
                  {CORES.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            <Controls press={(b)=>()=>coreRef.current?.buttonDown(1,b)} release={(b)=>()=>coreRef.current?.buttonUp(1,b)} />

            <div className="group">
              <div className="group-title">Add to Library</div>
              <label className="filebtn">Add ROMs<input type="file" multiple accept=".nes,.gb,.gbc" onChange={(e)=>e.target.files?.length && addToLibrary(e.target.files)} /></label>
            </div>
          </div>
        </div>
      )}

      {tab==='library' && <Library onPlay={playFromLibrary} />}

      {tab==='settings' && (
        <div className="group">
          <div className="group-title">Settings</div>
          <div className="actions" style={{marginBottom:8}}>
            <label><input type="checkbox" checked={gamepadsEnabled} onChange={(e)=>setGamepadsEnabled(e.target.checked)} /> Enable Gamepad</label>
          </div>
          <p style={{opacity:.85}}>Audio uses AudioWorklet when可用（需要 COOP/COEP 头；本项目 Vite dev 已配置）。静态托管时请在服务器上加：</p>
          <pre style={{whiteSpace:'pre-wrap', background:'#0b1020', border:'1px solid #223', padding:'8px', borderRadius:'8px'}}>
Cross-Origin-Opener-Policy: same-origin{'
'}Cross-Origin-Embedder-Policy: require-corp
          </pre>
          <p className="footer">Multi-core 当前包含：NES（jsnes），GB/GBC（WasmBoy）。可按此接口继续扩展 SNES/MD/PS1 等 WASM 核心。</p>
        </div>
      )}

      <footer className="footer">
        Load only games you own, or public‑domain/homebrew ROMs. — Built for zero‑install web play.
      </footer>
    </div>
  )
}
