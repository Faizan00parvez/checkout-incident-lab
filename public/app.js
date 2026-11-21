const el = id => document.getElementById(id);
const ms = value => Math.round(value) + ' ms';
let run, phase = 'incident', index = 0;
function pick(i) {
  index = i;
  const orders = run.phases[phase], item = orders[i];
  const root = item.spans[0];
  el('order').textContent = 'Checkout ' + String(i + 1).padStart(3,'0');
  el('lane').textContent = item.lane + ' route · HTTP ' + item.status;
  for (const tile of el('tiles').children) tile.setAttribute('aria-current', Number(tile.dataset.i) === i);
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
function render() {
  const orders = run.phases[phase], times = orders.map(o=>o.spans[0].ms).sort((a,b)=>a-b);
  const stats = [['Successful orders',orders.filter(o=>o.status===200).length + ' / ' + orders.length],['Overall p95',ms(times[Math.ceil(times.length*.95)-1])],['Slowest checkout',ms(times.at(-1))]];
  el('stats').innerHTML = stats.map(([label,value])=>'<div class="stat"><small>'+label+'</small><b>'+value+'</b></div>').join('');
  el('tiles').replaceChildren();
  orders.forEach((order,i)=>{
    const tile = document.createElement('button');
    tile.className = 'tile' + (order.spans[0].ms >= 200 ? ' slow' : '');
    tile.dataset.i = i;
    tile.title = 'Checkout '+(i+1)+' · '+ms(order.spans[0].ms);
    tile.setAttribute('aria-label',tile.title);
    tile.onclick = ()=>pick(i);
    el('tiles').append(tile);
  });
  document.querySelectorAll('[data-phase]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.phase===phase));
  pick(index);
}
document.querySelectorAll('[data-phase]').forEach(b=>b.onclick=()=>{if(run){phase=b.dataset.phase;render()}});
el('choices').onclick = event=>{
  if(event.target.tagName!=='BUTTON') return;
  phase='incident';index=24;render();
  const spans=run.phases.incident[index].spans;
  el('answer').textContent = (event.target.textContent==='Shipping quote'?'Yes. ':'Compare the child spans. ')+'In checkout 025, cart validation took '+ms(spans[1].ms)+' and shipping took '+ms(spans[2].ms)+'. Switch to Recovery to compare the same order after the delay was removed.';
};
fetch('run.json').then(r=>{if(!r.ok)throw Error();return r.json()}).then(data=>{
  run=data;
  el('notes').textContent='Captured '+run.recorded.slice(0,10)+' UTC on Node '+run.runtime+'. Overall p95 is the 95th fastest of 100 checkout spans. The 200 ms threshold is a lab target.';
  render();el('work').hidden=false;el('loading').hidden=true;
}).catch(()=>{el('loading').textContent='The replay could not load. Refresh to retry.'});
