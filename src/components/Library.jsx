import React, { useEffect, useState } from 'react'
import { listRoms, removeRom, getCover } from '../lib/db.js'

export default function Library({ onPlay }){
  const [roms, setRoms] = useState([])
  const [covers, setCovers] = useState({})

  const refresh = async () => {
    const list = await listRoms()
    setRoms(list.sort((a,b)=>b.created-a.created))
    const c = {}
    for (const r of list){
      c[r.id] = await getCover(r.id)
    }
    setCovers(c)
  }

  useEffect(()=>{ refresh() }, [])

  return (
    <div className="group">
      <div className="group-title">Library</div>
      <div className="grid">
        {roms.map(r => (
          <div className="card" key={r.id}>
            <img src={covers[r.id] || ''} alt="" />
            <div className="meta">
              <div title={r.name}>{r.name}</div>
              <span className="badge">{r.platform.toUpperCase()}</span>
            </div>
            <div className="actions" style={{marginTop:8}}>
              <button onClick={()=>onPlay(r)}>Play</button>
              <button onClick={async()=>{ await removeRom(r.id); refresh(); }}>Delete</button>
            </div>
          </div>
        ))}
      </div>
      {roms.length===0 && <p style={{opacity:.8, marginTop:8}}>No games yet. Use “Add to Library”导入本地 ROM。</p>}
    </div>
  )
}
