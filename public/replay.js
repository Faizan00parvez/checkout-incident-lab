function setupReplay(data) {
  const incident = data.phases.incident;
  const affected = incident.findIndex(order => order.spans[0].ms >= 200);
  const selected = affected < 0 ? 0 : affected;
  const number = String(selected + 1).padStart(3, '0');
  const scenes = [
    ['Check the baseline', 'Start with a normal checkout on the island route.'],
    ['Watch the orders arrive', 'Each square is one completed checkout. Orange marks a wait of at least 200 ms.'],
    ['Read the dashboard', 'All the requests have finished. Compare the overall p95 with the longest wait.'],
    ['Trace order ' + number, 'The shipping call runs inside checkout. Their bars cover some of the same time.'],
    ['Remove the delay', 'Compare shipping for the same order position after the normal timer was restored.']
  ];
  const seek = el('seek'), screen = el('scene-screen');
  const duration = Number(seek.max);
  let time = 0, frame = 0, started = 0;
  const chapters = document.querySelector('.chapters');
  scenes.forEach(([title], i) => {
    const button = document.createElement('button');
    button.textContent = title;
    button.onclick = () => { pause(); draw(i * 5); };
    chapters.append(button);
  });
  const limit = Math.max(...Object.values(data.phases).flat().map(o=>o.spans[0].ms));
  function bars(rows) {
    return rows.map(([label, value]) => '<div class="meter"><div>'+label+'<b>'+ms(value)+'</b></div><div class="track"><div class="bar" style="width:'+value/limit*100+'%"></div></div></div>').join('');
  }
  function draw(t) {
    time = Math.min(duration, Math.max(0,t));
    seek.value = time;
    const second = Math.floor(time);
    const timestamp = '0:' + String(second).padStart(2,'0');
    el('elapsed').textContent = timestamp + ' / 0:25';
    seek.setAttribute('aria-valuetext', timestamp);
    const i = Math.min(4, Math.floor(time / 5));
    el('player-title').textContent = scenes[i][0];
    el('scene-note').textContent = scenes[i][1];
    Array.from(chapters.children).forEach((b,k)=>b.setAttribute('aria-current',k===i?'step':'false'));
    const baseline = data.phases.baseline[selected], order = incident[selected], recovery = data.phases.recovery[selected];
    const shipping = o => o.spans.find(s=>s.name==='shipping').ms;
    if (i === 1) {
      const count = Math.min(incident.length,1+Math.floor((time-5)/5*incident.length));
      screen.innerHTML = '<b>'+count+' / '+incident.length+' checkouts</b><div class="reel-grid">'+incident.map((o,k)=>'<i class="'+(k>=count?'pending':o.spans[0].ms>=200?'over':'done')+'"></i>').join('')+'</div>';
    } else if (i === 2) {
      const sorted = incident.map(o=>o.spans[0].ms).sort((a,b)=>a-b);
      screen.innerHTML = bars([['Overall p95',sorted[Math.ceil(sorted.length*.95)-1]],['Slowest checkout',sorted.at(-1)]]);
    } else if (i === 4) {
      screen.innerHTML = bars([['Shipping during incident',shipping(order)],['Shipping after recovery',shipping(recovery)]]);
    } else {
      const sample = i === 0 ? baseline : order;
      screen.innerHTML = bars(sample.spans.map(s=>[s.name,s.ms]));
    }
  }
  function pause() {
    cancelAnimationFrame(frame); frame = 0;
    el('toggle').textContent = time>=duration?'Replay':'Play';
    el('toggle').setAttribute('aria-label',time>=duration?'Replay from beginning':'Play replay');
  }
  function tick(now) {
    const next = Math.min(duration,(now-started)/1000);
    if (Math.floor(next*10)!==Math.floor(time*10)) draw(next);
    if (next >= duration) { draw(duration); pause(); }
    else frame = requestAnimationFrame(tick);
  }
  el('toggle').onclick = () => {
    if (frame) return pause();
    if (time >= duration) draw(0);
    started = performance.now()-time*1000;
    el('toggle').textContent='Pause';el('toggle').setAttribute('aria-label','Pause replay');
    frame=requestAnimationFrame(tick);
  };
  seek.oninput=()=>{draw(Number(seek.value));pause();};
  el('player').hidden=false;draw(0);
  return {pause};
}
