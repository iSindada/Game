import React from 'react'

function TouchButton({ label, onDown, onUp, className }) {
  return (
    <button
      className={"btn "+(className||'')}
      onTouchStart={(e) => { e.preventDefault(); onDown?.(); }}
      onTouchEnd={(e) => { e.preventDefault(); onUp?.(); }}
      onMouseDown={(e) => { e.preventDefault(); onDown?.(); }}
      onMouseUp={(e) => { e.preventDefault(); onUp?.(); }}
    >
      {label}
    </button>
  )
}

export default function Controls({ press, release }){
  return (
    <>
      <div className="group">
        <div className="group-title">D‑Pad</div>
        <div className="dpad">
          <div></div>
          <TouchButton label="▲" className="btn-dark" onDown={press(4)} onUp={release(4)} />
          <div></div>
          <TouchButton label="◀" className="btn-dark" onDown={press(6)} onUp={release(6)} />
          <div></div>
          <TouchButton label="▶" className="btn-dark" onDown={press(7)} onUp={release(7)} />
          <div></div>
          <TouchButton label="▼" className="btn-dark" onDown={press(5)} onUp={release(5)} />
          <div></div>
        </div>
      </div>
      <div className="group">
        <div className="group-title">Actions</div>
        <div className="actions-row">
          <TouchButton label="A" className="btn-accent" onDown={press(0)} onUp={release(0)} />
          <TouchButton label="B" className="btn-accent" onDown={press(1)} onUp={release(1)} />
          <TouchButton label="Select" className="btn-dark" onDown={press(2)} onUp={release(2)} />
          <TouchButton label="Start" className="btn-dark" onDown={press(3)} onUp={release(3)} />
        </div>
      </div>
    </>
  )
}
