/* Municipal CivicConnect – frontend prototype (localStorage). Rule-based suggestions, not AI/ML. */
const K='cc_complaints',STAT=['Submitted','Under Review','Assigned','In Progress','Resolved'],SLA={High:24,Medium:48,Low:72};
const DEPT={'Garbage & Waste':'Sanitation','Roads & Potholes':'Roads Department','Streetlights':'Electrical Department','Water Supply':'Water Department','Drainage':'Drainage Department','Sewage':'Drainage Department','Public Safety':'Public Safety Department','Public Property':'Property Department','Other':'General Administration'};
const DEPTS=[...new Set(Object.values(DEPT))];
const RULES={'Garbage & Waste':['garbage','waste','dustbin','trash'],'Roads & Potholes':['pothole','road','crack'],'Streetlights':['streetlight','light','lamp'],'Water Supply':['water','pipe','tap','leak'],'Drainage':['drain','overflow','clog'],'Sewage':['sewage','sewer','manhole'],'Public Safety':['unsafe','accident','danger','theft'],'Public Property':['bench','park','vandal','wall']};
const HIGH=['accident','danger','overflow','manhole','electric','fire','flood'];
const $=s=>document.querySelector(s),load=()=>JSON.parse(localStorage.getItem(K)||'[]'),save=a=>localStorage.setItem(K,JSON.stringify(a));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=t=>new Date(t).toLocaleString(),cls=s=>s.replace(/ /g,'');
const badge=s=>`<span class="badge b-${cls(s)}">${esc(s)}</span>`;
function toast(m,bad){const t=document.createElement('div');t.className='toast'+(bad?' bad':'');t.textContent=m;$('#toasts').append(t);setTimeout(()=>t.remove(),3500)}
function slaOf(c){if(c.status==='Resolved')return['Resolved on record','s-in'];const left=new Date(c.deadlineAt)-Date.now();
 if(left<0)return['SLA Breached','s-br'];return left<c.slaHours*36e5*.25?['Approaching Deadline','s-ap']:['Within SLA','s-in']}
const slaTag=c=>{const[t,k]=slaOf(c);return`<span class="badge ${k}">${t}</span>`};
function nav(){const p=document.body.dataset.page,L=[['index','Home'],['report','Report Issue'],['track','Track'],['admin','Admin'],['register','Register']];
 $('#nav').innerHTML='<b>Municipal <span>CivicConnect</span></b>'+L.map(([h,n])=>`<a href="${h}.html" class="${h===p?'on':''}">${n}</a>`).join('')}
function timeline(c){return'<ul class="tl">'+STAT.map((s,i)=>{const h=[...c.statusHistory].reverse().find(x=>x.status===s);
 return`<li class="${STAT.indexOf(c.status)>=i?'done':''}">${s}${h?`<small>${fmt(h.at)}${h.note?' – '+esc(h.note):''}</small>`:''}</li>`}).join('')+'</ul>'}
function stats(a){return[['Total',a.length],...STAT.map(s=>[s,a.filter(c=>c.status===s).length]),['SLA Breached',a.filter(c=>slaOf(c)[0]==='SLA Breached').length]]
 .map(([n,v])=>`<div class="card stat"><b>${v}</b>${n}</div>`).join('')}
function newId(){const y=new Date().getFullYear();return`CVC-${y}-${String(load().filter(c=>c.complaintId.startsWith('CVC-'+y)).length+1).padStart(4,'0')}`}
const words=t=>new Set(t.toLowerCase().match(/[a-z]{4,}/g)||[]);
function similar(a,b){const x=words(a),y=words(b),i=[...x].filter(w=>y.has(w)).length;return i/(x.size+y.size-i||1)}
function makeMap(el,onPick,center=[18.6298,73.7997]){if(typeof L==='undefined'){document.getElementById(el).innerHTML='<p class="empty">Map could not load. Check your internet connection and refresh.</p>';return{m:{setView(){}},put(){}}}
 const m=L.map(el).setView(center,13);
 L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Tiles © Esri, OpenStreetMap contributors'}).addTo(m);let mk;
 const put=(la,ln)=>{mk?mk.setLatLng([la,ln]):mk=L.marker([la,ln]).addTo(m);onPick&&onPick(la,ln)};
 onPick&&m.on('click',e=>put(e.latlng.lat,e.latlng.lng));return{m,put}}

function initHome(){$('#home-stats').innerHTML=stats(load())}

function initReport(){
 $('#cat').innerHTML=Object.keys(DEPT).map(c=>`<option>${c}</option>`).join('');let data='';
 const{m,put}=makeMap('map',(a,b)=>{$('#lat').value=a.toFixed(5);$('#lng').value=b.toFixed(5);
  $('#loc').value='Finding address...';
  fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${a}&lon=${b}`).then(r=>r.json()).then(j=>{$('#loc').value=j.display_name||`${a.toFixed(5)}, ${b.toFixed(5)}`}).catch(()=>{$('#loc').value=`Lat ${a.toFixed(5)}, Lng ${b.toFixed(5)}`})});
 $('#gps').onclick=()=>navigator.geolocation?navigator.geolocation.getCurrentPosition(p=>{put(p.coords.latitude,p.coords.longitude);m.setView([p.coords.latitude,p.coords.longitude],16);toast('Location captured')},()=>toast('Location blocked. Click the map instead.',1)):toast('Geolocation not supported',1);
 const suggest=()=>{const t=($('#title').value+' '+$('#desc').value).toLowerCase(),h=$('#hint');
  const c=Object.keys(RULES).find(k=>RULES[k].some(w=>t.includes(w)));if(!c){h.classList.add('hide');return}
  const p=HIGH.some(w=>t.includes(w))||c==='Public Safety'?'High':null;h.classList.remove('hide');
  h.innerHTML=`Smart Rule-Based Suggestion: <b>${c}</b>${p?', priority <b>High</b>':''} <button type="button" class="btn ghost">Apply</button>`;
  h.querySelector('button').onclick=()=>{$('#cat').value=c;if(p)$('#pri').value=p;h.classList.add('hide')};
  const d=load().find(x=>x.category===c&&x.status!=='Resolved'&&similar(t,x.title+' '+x.description)>.4),u=$('#dup');
  u.classList.toggle('hide',!d);if(d)u.innerHTML=`Possible duplicate of <b>${d.complaintId}</b> ("${esc(d.title)}"). Check before submitting.`};
 $('#title').oninput=$('#desc').oninput=suggest;
 $('#img').onchange=e=>{const f=e.target.files[0],er=$('#e-img');er.textContent='';data='';$('#prevbox').innerHTML='';if(!f)return;
  if(!/^image\/(jpeg|png)$/.test(f.type))return er.textContent='Only JPG or PNG images are allowed.';
  if(f.size>2e6)return er.textContent='Image must be under 2 MB.';
  const r=new FileReader();r.onload=()=>{data=r.result;$('#prevbox').innerHTML=`<img class="prev" src="${data}"><br><button type="button" class="btn ghost" id="rm">Remove image</button>`;$('#rm').onclick=()=>{data='';$('#img').value='';$('#prevbox').innerHTML=''}};r.readAsDataURL(f)};
 $('#cform').onsubmit=e=>{e.preventDefault();const v=id=>$('#'+id).value.trim(),E={};
  if(v('title').length<5)E.title='Enter a title of at least 5 characters.';
  if(v('desc').length<15)E.desc='Describe the problem in at least 15 characters.';
  if(!v('loc'))E.loc='Enter the address or a nearby landmark.';
  if(!v('lat'))E.map='Click the map or use your current location.';
  if(v('name').length<2)E.name='Enter your name.';
  if(!/^[6-9]\d{9}$/.test(v('phone')))E.phone='Enter a valid 10-digit mobile number.';
  if(!/^\S+@\S+\.\S+$/.test(v('email')))E.email='Enter a valid email address.';
  ['title','desc','loc','map','name','phone','email'].forEach(k=>$('#e-'+k).textContent=E[k]||'');
  if(Object.keys(E).length)return toast('Please fix the highlighted fields',1);
  const now=new Date(),h=SLA[v('pri')],c={complaintId:newId(),category:v('cat'),title:v('title'),description:v('desc'),location:v('loc'),latitude:+v('lat'),longitude:+v('lng'),priority:v('pri'),name:v('name'),phone:v('phone'),email:v('email'),image:data,department:DEPT[v('cat')],status:'Submitted',slaHours:h,deadlineAt:new Date(+now+h*36e5).toISOString(),createdAt:now.toISOString(),updatedAt:now.toISOString(),statusHistory:[{status:'Submitted',at:now.toISOString(),note:'Complaint received'}]};
  const a=load();a.push(c);save(a);$('#form-wrap').classList.add('hide');const d=$('#done');d.classList.remove('hide');
  d.innerHTML=`<h2>✅ Complaint submitted</h2><p>Your complaint ID</p><h1 id="cid">${c.complaintId}</h1><button class="btn ghost" id="cp">Copy ID</button><a class="btn" href="track.html?id=${c.complaintId}">Track complaint</a>
  <p><b>${esc(c.title)}</b><br>${c.category} · ${c.priority} priority · ${c.department}<br>Resolution deadline: ${fmt(c.deadlineAt)}</p>`;
  $('#cp').onclick=()=>navigator.clipboard.writeText(c.complaintId).then(()=>toast('ID copied'));toast('Complaint '+c.complaintId+' created')}}

function render(c){return`<div class="card"><h2>${c.complaintId} ${badge(c.status)} ${slaTag(c)}</h2><div class="grid"><div><b>${esc(c.title)}</b><p>${esc(c.description)}</p>
 <p>📍 ${esc(c.location)} (${c.latitude}, ${c.longitude})<br>🏢 ${c.department}<br>Category: ${c.category}<br>Priority: ${c.priority}<br>Citizen: ${esc(c.name)}<br>Created: ${fmt(c.createdAt)}<br>Updated: ${fmt(c.updatedAt)}<br>SLA: ${c.slaHours} h · Deadline: ${fmt(c.deadlineAt)}</p>
 ${c.image?`<img class="prev" src="${c.image}" alt="Complaint photo">`:''}</div><div><h3>Timeline</h3>${timeline(c)}<div id="qr"></div><small>Scan to open tracking page</small></div></div></div>`}
function initTrack(){const go=()=>{const id=$('#tid').value.trim().toUpperCase(),c=load().find(x=>x.complaintId===id),r=$('#result');
  if(!c){r.innerHTML=`<div class="card empty">${id?`No complaint found for <b>${esc(id)}</b>. Check the ID and try again.`:'Enter a complaint ID to see its status.'}</div>`;return}
  r.innerHTML=render(c);new QRCode($('#qr'),{text:`${location.origin}${location.pathname}?id=${c.complaintId}`,width:120,height:120})};
 $('#tbtn').onclick=go;$('#tid').onkeydown=e=>{if(e.key==='Enter')go()};const q=new URLSearchParams(location.search).get('id');if(q){$('#tid').value=q;go()}}

function initLogin(){$('#lform').onsubmit=e=>{e.preventDefault();
 if($('#u').value==='admin'&&$('#p').value==='admin123'){sessionStorage.cc_admin='1';location.href='admin.html'}else $('#e-login').textContent='Wrong username or password.'}}
function initRegister(){$('#rform').onsubmit=e=>{e.preventDefault();
 if($('#rn').value.trim().length<2||!/^\S+@\S+\.\S+$/.test($('#re').value)||$('#rp').value.length<6)return $('#e-reg').textContent='Enter a name, valid email and 6+ character password.';
 const u=JSON.parse(localStorage.cc_users||'[]');u.push({name:$('#rn').value,email:$('#re').value});localStorage.cc_users=JSON.stringify(u);toast('Account created (demo only, not a real login)');e.target.reset()}}

function initAdmin(){if(!sessionStorage.cc_admin){location.href='login.html';return}
 $('#logout').onclick=()=>{sessionStorage.removeItem('cc_admin');location.href='login.html'};
 $('#fs').innerHTML='<option value="">All statuses</option>'+STAT.map(s=>`<option>${s}</option>`).join('');let key='createdAt',dir=-1;
 const draw=()=>{const a=load(),q=$('#q').value.toLowerCase();$('#stats').innerHTML=stats(a);
  const l=a.filter(c=>(!$('#fs').value||c.status===$('#fs').value)&&(!$('#fp').value||c.priority===$('#fp').value)&&(c.complaintId+c.title+c.location).toLowerCase().includes(q)).sort((x,y)=>String(x[key]).localeCompare(String(y[key]))*dir);
  $('#rows').innerHTML=l.length?l.map(c=>`<tr><td>${c.complaintId}</td><td>${c.category}</td><td>${esc(c.title)}</td><td>${c.priority}</td><td>${c.department}</td><td>${badge(c.status)}</td><td>${new Date(c.createdAt).toLocaleDateString()}</td><td>${slaTag(c)}</td><td><button class="btn ghost" data-id="${c.complaintId}">View</button></td></tr>`).join(''):'<tr><td colspan="9" class="empty">No complaints match. Submit one from the Report Issue page.</td></tr>'};
 $('#q').oninput=$('#fs').onchange=$('#fp').onchange=draw;
 document.querySelectorAll('th[data-k]').forEach(t=>t.onclick=()=>{dir=key===t.dataset.k?-dir:1;key=t.dataset.k;draw()});
 $('#rows').onclick=e=>{const id=e.target.dataset.id;if(!id)return;const c=load().find(x=>x.complaintId===id),d=$('#detail'),opt=(a,v)=>a.map(x=>`<option ${x===v?'selected':''}>${x}</option>`).join('');
  d.classList.remove('hide');d.innerHTML=render(c).replace('class="card"','')+`<h3>Update complaint</h3><div class="two"><div><label>Status</label><select id="ns">${opt(STAT,c.status)}</select></div><div><label>Priority</label><select id="np">${opt(['Low','Medium','High'],c.priority)}</select></div></div>
  <label>Department</label><select id="nd">${opt(DEPTS,c.department)}</select><label>Note</label><input id="nn"><div id="dmap"></div><button class="btn" id="sv">Save changes</button>`;
  const mm=makeMap('dmap',null,[c.latitude,c.longitude]);mm.put(c.latitude,c.longitude);new QRCode($('#qr'),{text:`${location.origin}${location.pathname.replace('admin','track')}?id=${c.complaintId}`,width:100,height:100});d.scrollIntoView({behavior:'smooth'});
  $('#sv').onclick=()=>{const a=load(),x=a.find(y=>y.complaintId===id),now=new Date().toISOString();
   if(x.priority!==$('#np').value){x.priority=$('#np').value;x.slaHours=SLA[x.priority];x.deadlineAt=new Date(+new Date(x.createdAt)+x.slaHours*36e5).toISOString()}
   x.department=$('#nd').value;if(x.status!==$('#ns').value||$('#nn').value){x.status=$('#ns').value;x.statusHistory.push({status:x.status,at:now,note:$('#nn').value||'Updated by admin'})}
   x.updatedAt=now;save(a);toast(`${id} updated to ${x.status}`);draw();d.classList.add('hide')}};draw()}

nav();({index:initHome,report:initReport,track:initTrack,login:initLogin,register:initRegister,admin:initAdmin})[document.body.dataset.page]();
