const el = id => document.getElementById(id);
const ms = value => Math.round(value) + ' ms';
let run, phase = 'incident', index = 24;
const views = ['replay', 'explore', 'live'];
let completed = new Set();
try {
  const saved = JSON.parse(localStorage.getItem('slip025.progress') || '[]');
  if (Array.isArray(saved)) completed = new Set(saved.filter(v => views.includes(v)));
} catch {}
function showProgress() {
  el('lesson-progress').value = completed.size;
  el('progress-text').textContent = completed.size + ' of 3 complete';
  document.querySelectorAll('[data-view]').forEach(link => {
    link.classList.toggle('complete', completed.has(link.dataset.view));
  });
}
function completeView(view) {
  completed.add(view);
  showProgress();
  try { localStorage.setItem('slip025.progress', JSON.stringify([...completed])); } catch {}
}
function pick(i) {
  index = i;
  const orders = run.phases[phase], item = orders[i];
  const root = item.spans[0];
  el('order').textContent = 'Checkout ' + String(i + 1).padStart(3,'0');
  el('lane').textContent = item.lane + ' route · HTTP ' + item.status;
  for (const tile of el('tiles').children) {
    const selected = Number(tile.dataset.i) === i;
    tile.setAttribute('aria-current', selected);
    tile.tabIndex = selected ? 0 : -1;
  }
  const limit = Math.ceil(Math.max(...Object.values(run.phases).flat().map(o=>o.spans[0].ms))/100)*100;
  el('scale').textContent = 'Shared time scale · 0 to ' + limit + ' ms';
  el('spans').replaceChildren();
  for (const [n,span] of item.spans.entries()) {
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = '<label><span></span><b></b></label><div class="track"><div class="bar"></div></div>';
    row.querySelector('span').textContent = span.name;
    row.querySelector('b').textContent = ms(span.ms);
    const bar = row.querySelector('.bar');
    if (n) bar.classList.add('child');
    bar.style.marginLeft = Math.max(0,span.start-root.start)/limit*100 + '%';
    bar.style.width = span.ms/limit*100 + '%';
    el('spans').append(row);
  }
}
function render(count = run.phases[phase].length) {
  const orders = run.phases[phase].slice(0,count), times = orders.map(o=>o.spans[0].ms).sort((a,b)=>a-b);
  const stats = [['Successful orders',orders.filter(o=>o.status===200).length + ' / ' + orders.length],['Overall p95',ms(times[Math.ceil(times.length*.95)-1])],['Slowest checkout',ms(times.at(-1))]];
  el('stats').innerHTML = stats.map(([label,value])=>'<div class="stat"><small>'+label+'</small><b>'+value+'</b></div>').join('');
  el('tiles').replaceChildren();
  orders.forEach((order,i)=>{
    const tile = document.createElement('button');
    tile.className = 'tile' + (order.spans[0].ms >= 200 ? ' slow' : '');
    tile.dataset.i = i;
    tile.title = 'Checkout '+(i+1)+' · '+ms(order.spans[0].ms);
    if (order.spans[0].ms >= 200) tile.textContent = '!';
    tile.setAttribute('aria-label',tile.title);
    tile.onclick = ()=>pick(i);
    el('tiles').append(tile);
  });
  document.querySelectorAll('[data-phase]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.phase===phase));
  pick(index);
}
let clock;
let startWhenReady = false;
function showView() {
  const name = views.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'replay';
  for (const view of views) el(view).hidden = view !== name;
  for (const a of document.querySelectorAll('[data-view]')) {
    if (a.dataset.view === name) a.setAttribute('aria-current','page');
    else a.removeAttribute('aria-current');
  }
  if (name !== 'replay') { clock?.pause(); startWhenReady = false; }
}
window.addEventListener('hashchange',showView);
showView(); showProgress();
el('start').onclick = () => {
  if (!clock) startWhenReady = true;
  else if (el('toggle').textContent !== 'Pause') el('toggle').click();
  el('lab').scrollIntoView();
};
el('tiles').onkeydown = event => {
  const delta = {ArrowRight:1,ArrowLeft:-1,ArrowDown:10,ArrowUp:-10};
  if (!(event.key in delta)) return;
  event.preventDefault();
  pick(Math.max(0,Math.min(el('tiles').children.length-1,index + delta[event.key])));
  el('tiles').children[index].focus();
};
el('watch').onclick = () => {
  clock?.pause();
  const video = el('film').querySelector('video');
  if (!video.src) video.src = '/launch-film.mp4';
  el('film').showModal();
  video.play().catch(()=>{});
};
el('close-film').onclick = () => el('film').close();
el('film').onclose = () => el('film').querySelector('video').pause();
document.querySelectorAll('[data-phase]').forEach(b=>b.onclick=()=>{if(run){clock.pause();phase=b.dataset.phase;render()}});
el('choices').onclick = event=>{
  if(event.target.tagName!=='BUTTON') return;
  clock.pause();
  phase='incident';index=24;render();
  const spans=run.phases.incident[index].spans;
  const correct = event.target.textContent === 'Shipping quote';
  el('answer').dataset.correct = correct;
  if (correct) completeView('explore');
  el('answer').textContent = (event.target.textContent==='Shipping quote'?'Yes. ':'Compare the child spans. ')+'In checkout 025, cart validation took '+ms(spans[1].ms)+' and shipping took '+ms(spans[2].ms)+'. Switch to Recovery to compare the same order after the delay was removed.';
};
fetch('run.json').then(r=>{if(!r.ok)throw Error();return r.json()}).then(data=>{
  run=data;
  clock = setupReplay(run);
  if (startWhenReady) el('toggle').click();
  el('notes').textContent='Captured '+run.recorded.slice(0,10)+' UTC on Node '+run.runtime+'. Overall p95 is the 95th fastest of 100 checkout spans. The 200 ms threshold is a lab target.';
  render();el('work').hidden=false;el('loading').hidden=true;
}).catch(()=>{el('loading').textContent='The replay could not load. Refresh to retry.'});

el('run-live').onclick = async () => {
  const lane = el('route').value;
  el('run-live').disabled = el('route').disabled = true;
  el('live-results').replaceChildren();
  try {
    for (const phase of ['baseline', 'incident', 'recovery']) {
      el('live-status').textContent = 'Requesting the ' + phase + ' quote…';
      const response = await fetch('/api/quote?lane=' + lane + '&phase=' + phase, {method:'POST', signal:AbortSignal.timeout(15000)});
      if (!response.ok) throw Error();
      const result = await response.json();
      const row = document.createElement('li');
      const duration = document.createElement('strong');
      duration.textContent = ms(result.shippingMs);
      row.append(phase[0].toUpperCase() + phase.slice(1), duration);
      el('live-results').append(row);
    }
    completeView('live');
    el('live-status').textContent = lane === 'island' ? 'Island received the extra delay. Try Mainland to compare.' : 'Mainland used the normal shipping timer in all three phases.';
  } catch {
    el('live-status').textContent = 'The live request could not finish. Try again or explore the recorded run below.';
  } finally {
    el('run-live').disabled = el('route').disabled = false;
  }
};
