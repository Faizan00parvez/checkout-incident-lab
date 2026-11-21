import { Stage, Window, Text } from '../../kit'
import './card.css'

export default function SlipTrace() {
  return <Stage width={540} height={310} compact={{below:500,width:358,height:250}} className="slip-art">
    {() => <>
      <Window url="Slip 025 / request ledger" className="ledger">
        <div className="ledger-body"><Text className="label">Incident capture</Text><h3>Checkout requests</h3>
          {['023','024','025','026','027'].map(n => <div key={n} className={'entry '+(n==='025'?'focused':'')}><span>Order {n}</span><b>{n==='025'?'Island':'Mainland'}</b></div>)}
        </div>
      </Window>
      <div className="slip"><div className="face" aria-hidden="true"><i/><i/><em/></div><strong>Slip 025</strong><div className="line"><span>Shipping</span><b>624 ms</b></div><div className="line"><span>Checkout</span><b>639 ms</b></div><div className="code"/></div>
    </>}
  </Stage>
}
