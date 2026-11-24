(function(){
"use strict";
const $=i=>document.getElementById(i);
const AUD="https://api.audius.co/v1",JAM="https://api.jamendo.com/v3.0",APP="notely";
const ST={jk:"",ak:"",likes:[],vol:80,scene:"auto"};
try{Object.assign(ST,JSON.parse(localStorage.getItem("notely2")||"{}"))}catch(e){}
const save=()=>{try{localStorage.setItem("notely2",JSON.stringify(ST))}catch(e){}};
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const fmt=s=>{s=Math.max(0,Math.round(s||0));return Math.floor(s/60)+":"+("0"+s%60).slice(-2)};
let toastT=0;const toast=t=>{const e=$("toast");e.textContent=t;e.className="glass on";clearTimeout(toastT);toastT=setTimeout(()=>e.className="glass",3200)};
const hue=id=>{let h=0;const s=String(id);for(let i=0;i<s.length;i++)h=(h*131+s.charCodeAt(i)*977)%360;return h};
const artCss=t=>t.art?"background-image:url('"+esc(t.art)+"')":"background-image:linear-gradient(135deg,hsl("+hue(t.id)+" 75% 58%),hsl("+(hue(t.id)+60)%360+" 75% 38%))";

/* ---- каталоги ---- */
const aq=()=>"app_name="+APP+(ST.ak?"&api_key="+encodeURIComponent(ST.ak):"");
const getJ=u=>fetch(u).then(r=>{if(!r.ok)throw new Error(r.status);return r.json()});
const fromAud=x=>{const a=x.artwork||{};return{id:"a"+x.id,src:"Audius",title:x.title,artist:(x.user&&x.user.name)||"",art:a["480x480"]||a["150x150"]||a["1000x1000"]||"",url:AUD+"/tracks/"+x.id+"/stream?"+aq(),dur:x.duration||0}};
const fromJam=x=>({id:"j"+x.id,src:"Jamendo",title:x.name,artist:x.artist_name,art:x.image||x.album_image||"",url:x.audio,dur:x.duration||0});
const audSearch=q=>getJ(AUD+"/tracks/search?query="+encodeURIComponent(q)+"&limit=24&"+aq()).then(j=>(j.data||[]).map(fromAud));
const audTrend=g=>getJ(AUD+"/tracks/trending?limit=20&"+(g?"genre="+encodeURIComponent(g)+"&":"")+aq()).then(j=>(j.data||[]).map(fromAud));
const jamQ=x=>{if(!ST.jk)return Promise.reject(new Error("nokey"));return getJ(JAM+"/tracks/?client_id="+encodeURIComponent(ST.jk)+"&format=json&limit=20&audioformat=mp32&imagesize=300&"+x).then(j=>(j.results||[]).map(fromJam))};
const jamSearch=q=>jamQ("search="+encodeURIComponent(q));
const jamTrend=()=>jamQ("order=popularity_week");
const settle=ps=>Promise.all(ps.map(p=>p.then(v=>({ok:1,v}),e=>({ok:0,e}))));
const merge=rs=>{const o=[],n=Math.max(0,...rs.map(r=>r.ok?r.v.length:0));for(let i=0;i<n;i++)rs.forEach(r=>{if(r.ok&&r.v[i])o.push(r.v[i])});return o};
const warn=rs=>{const bad=rs.filter(r=>!r.ok);if(!bad.length)return"";return bad.length===1&&bad[0].e&&bad[0].e.message==="nokey"?"Чтобы видеть треки Jamendo, добавь бесплатный ключ в настройках (шестерёнка).":"Часть каталога сейчас не отвечает. Попробуй позже."};

/* ---- фон под трек ---- */
const SCN=Object.keys(BG.scenes);
function paintBg(){const t=cur;if(t){const h=hue(t.id);BG.color(h,h+70)}
  if(ST.scene==="auto"){if(t)BG.set(SCN[hue(t.id+"s")%SCN.length])}else BG.set(ST.scene)}

/* ---- плеер ---- */
const au=new Audio();au.preload="none";au.volume=ST.vol/100;
let Q=[],qi=-1,shuf=false,rep=false,cur=null,view="home";
const isLiked=t=>ST.likes.some(x=>x.id===t.id);
const lists={};
function mq(el,txt){el.textContent=txt;el.classList.remove("run");el.dataset.t=txt;requestAnimationFrame(()=>{if(el.scrollWidth>el.parentNode.clientWidth+2){el.textContent=txt+"   ·   "+txt+"   ·   ";el.classList.add("run")}})}
function setIcons(p){const d=p?"M6 5h4v14H6zM14 5h4v14h-4z":"M8 5v14l11-7z";$("ppI").innerHTML=$("fPpI").innerHTML='<path d="'+d+'"/>';[$("ppB"),$("fPp")].forEach(b=>b.setAttribute("aria-label",p?"Пауза":"Играть"));
  document.documentElement.style.setProperty("--pl",p?"running":"paused");$("nowB").classList.toggle("pl",p);$("full").classList.toggle("pl",p);BG.play(p)}
function play(list,i){Q=list.slice();qi=i;load(true)}
function load(go){cur=Q[qi];if(!cur)return;au.src=cur.url;if(go)au.play().catch(()=>{toast("Трек не включился, пробую следующий");setTimeout(next,900)});
  $("bar").classList.remove("hid");$("bCv").style.cssText=$("fCv").style.cssText=artCss(cur);mq($("bT"),cur.title);$("bA").textContent=$("fA").textContent=cur.artist;$("fT").textContent=cur.title;
  document.title=cur.title+" · Notely";$("fLike").classList.toggle("on",isLiked(cur));paintBg();mark();
  if("mediaSession" in navigator){try{navigator.mediaSession.metadata=new MediaMetadata({title:cur.title,artist:cur.artist,artwork:cur.art?[{src:cur.art,sizes:"480x480"}]:[]})}catch(e){}}}
const next=()=>{if(!Q.length)return;qi=shuf?Math.floor(Math.random()*Q.length):(qi+1)%Q.length;load(true)};
const prev=()=>{if(!Q.length)return;if(au.currentTime>3){au.currentTime=0;return}qi=(qi-1+Q.length)%Q.length;load(true)};
const toggle=()=>{if(!cur){toast("Выбери трек");return}au.paused?au.play().catch(()=>{}):au.pause()};
au.addEventListener("play",()=>setIcons(true));au.addEventListener("pause",()=>setIcons(false));
au.addEventListener("ended",()=>{if(rep){au.currentTime=0;au.play()}else next()});
au.addEventListener("error",()=>{if(cur){toast("Трек не загрузился, пробую следующий");setTimeout(next,900)}});
const rng=(el,p)=>el.style.setProperty("--p",p+"%");
au.addEventListener("timeupdate",()=>{const d=au.duration||(cur&&cur.dur)||0,p=d?au.currentTime/d*1000:0;[$("seek"),$("fSeek")].forEach(s=>{if(!s.dataset.d){s.value=p;rng(s,p/10)}});$("cur").textContent=$("fCur").textContent=fmt(au.currentTime);$("dur").textContent=$("fDur").textContent=fmt(d)});
[$("seek"),$("fSeek")].forEach(s=>{s.addEventListener("input",()=>{s.dataset.d=1;rng(s,s.value/10)});s.addEventListener("change",()=>{const d=au.duration||(cur&&cur.dur)||0;if(d)au.currentTime=s.value/1000*d;delete s.dataset.d})});
$("vol").value=ST.vol;rng($("vol"),ST.vol);$("vol").addEventListener("input",function(){au.volume=this.value/100;ST.vol=+this.value;rng(this,this.value);save()});
$("ppB").onclick=$("fPp").onclick=toggle;$("nxB").onclick=$("fNx").onclick=next;$("prB").onclick=$("fPr").onclick=prev;
$("shB").onclick=$("fSh").onclick=()=>{shuf=!shuf;$("shB").classList.toggle("on",shuf);$("fSh").classList.toggle("on",shuf);toast(shuf?"Перемешивание включено":"Перемешивание выключено")};
$("rpB").onclick=function(){rep=!rep;this.classList.toggle("on",rep);toast(rep?"Повтор трека включён":"Повтор выключен")};
$("fLike").onclick=e=>{if(cur)like(cur,e.currentTarget)};
$("nowB").onclick=()=>{if(cur)$("full").classList.add("on")};$("clB").onclick=()=>$("full").classList.remove("on");
$("bars").innerHTML=Array.from({length:22},(_,i)=>'<i style="animation-delay:'+(-(i*47%100)/100)+'s;animation-duration:'+(.6+(i*13%7)/10)+'s"></i>').join("");
if("mediaSession" in navigator){const m=navigator.mediaSession;[["play",()=>au.play()],["pause",()=>au.pause()],["nexttrack",next],["previoustrack",prev]].forEach(a=>{try{m.setActionHandler(a[0],a[1])}catch(e){}})}
document.addEventListener("keydown",e=>{if(/INPUT|TEXTAREA/.test(e.target.tagName)&&e.target.type!=="range")return;if(e.code==="Space"){e.preventDefault();toggle()}if(e.key==="ArrowRight"&&e.shiftKey)next();if(e.key==="ArrowLeft"&&e.shiftKey)prev();if(e.key==="Escape")$("full").classList.remove("on")});
function burst(el){const r=el.getBoundingClientRect();for(let i=0;i<7;i++){const h=document.createElement("div");h.className="hb";h.textContent=["💗","💖","✨","💞"][i%4];h.style.left=(r.left+r.width/2-9)+"px";h.style.top=(r.top+r.height/2-9)+"px";h.style.setProperty("--x",(Math.random()*90-45)+"px");h.style.animationDelay=(i*50)+"ms";document.body.appendChild(h);setTimeout(()=>h.remove(),1300)}}
function like(t,btn){const i=ST.likes.findIndex(x=>x.id===t.id);if(i>=0)ST.likes.splice(i,1);else{ST.likes.unshift(t);if(btn)burst(btn)}save();const on=i<0;
  $("fLike").classList.toggle("on",!!cur&&isLiked(cur));document.querySelectorAll('[data-lk="'+t.id+'"]').forEach(b=>{b.classList.toggle("on",on);b.classList.remove("pop");void b.offsetWidth;b.classList.add("pop")});if(view==="lib")show("lib")}

/* ---- экраны ---- */
const main=$("main");
const stag=()=>document.querySelectorAll(".st>*").forEach((e,i)=>e.style.setProperty("--n",Math.min(i,14)));
const cardH=(t,k,i)=>'<button class="card" data-k="'+k+'" data-i="'+i+'" data-id="'+esc(t.id)+'"><div class="cv" style="'+artCss(t)+'"><div class="eqm"><i></i><i></i><i></i><i></i></div><div class="pl"><svg class="i f" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div></div><b>'+esc(t.title)+'</b><span>'+esc(t.artist)+'</span></button>';
const heart=(t,k,i)=>'<button class="like'+(isLiked(t)?' on':'')+'" data-lk="'+esc(t.id)+'" data-k="'+k+'" data-i="'+i+'" aria-label="В любимое"><svg class="i" viewBox="0 0 24 24" style="fill:'+(isLiked(t)?'currentColor':'none')+'"><path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z"/></svg></button>';
const rowH=(t,k,i)=>'<div class="row" data-id="'+esc(t.id)+'"><div class="cv" style="'+artCss(t)+'"><div class="eqm" style="left:6px;bottom:6px"><i></i><i></i><i></i><i></i></div></div><button class="t" data-k="'+k+'" data-i="'+i+'"><b>'+esc(t.title)+'</b><span>'+esc(t.artist)+' · '+t.src+'</span></button><time>'+fmt(t.dur)+'</time>'+heart(t,k,i)+'</div>';
function mark(){document.querySelectorAll("[data-id]").forEach(e=>e.classList.toggle("cur",!!cur&&e.getAttribute("data-id")===cur.id))}
const sbH=v=>'<label class="sb glass"><svg class="i" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input id="q" type="search" placeholder="Песня, исполнитель, жанр" value="'+esc(v||"")+'" enterkeyhint="search"></label>';
function bindQ(){const q=$("q");if(!q)return;q.addEventListener("keydown",e=>{if(e.key==="Enter"&&q.value.trim()){if(view!=="search"){show("search");$("q").value=q.value}doSearch($("q").value.trim())}})}
const hello=()=>{const h=new Date().getHours();return h<5?"Доброй ночи":h<12?"Доброе утро":h<18?"Добрый день":"Добрый вечер"};
const SH=[["Сейчас в тренде",""],["Электроника","Electronic"],["Лоу-фай","Lo-Fi"],["Хип-хоп","Hip-Hop/Rap"]];
function home(){
  main.innerHTML='<div class="page"><div class="st"><h1 class="big">'+hello()+',<br><em>что послушаем?</em></h1><p class="sub">Открытая музыка: слушай целиком, бесплатно, без рекламы.</p>'+sbH()+'<div id="feat"><div class="sk" style="height:230px"></div></div><div id="shl"></div></div></div>';
  bindQ();stag();
  const jobs=SH.map(s=>audTrend(s[1])).concat([jamTrend()]);
  settle(jobs).then(rs=>{if(view!=="home")return;let n=0,html="";const all=[];
    const ok=rs.filter(r=>r.ok&&r.v.length);
    ok.forEach((r,idx)=>{const title=rs.indexOf(r)<SH.length?SH[rs.indexOf(r)][0]:"Из Jamendo";const k="h"+rs.indexOf(r);lists[k]=r.v;
      html+='<h2>'+title+'</h2><div class="shelf">'+r.v.map((t,i)=>cardH(t,k,i)).join("")+'</div>'});
    const first=ok.length?ok[0].v:[];lists.feat=first;
    $("feat").innerHTML=first.length?'<div class="feat glass"><div class="cv" style="'+artCss(first[0])+'"></div><div><span class="tag">Для начала</span><h3>'+esc(first[0].title)+'</h3><p>'+esc(first[0].artist)+'</p><button class="btn" data-k="feat" data-i="0"><svg class="i f" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>Слушать</button></div></div>':"";
    const w=warn(rs);const bad=rs.some(r=>!r.ok&&!(r.e&&r.e.message==="nokey"));
    $("shl").innerHTML=(first.length?"":'<p class="msg glass">Ничего не нашлось. Проверь интернет или зайди позже.</p>')+(w&&!ST.jk?'<p class="msg glass" style="margin-top:12px">'+warn(rs)+'</p>':"")+html;mark()});
}
function doSearch(q){const g=$("sres");g.innerHTML='<div class="sk" style="height:62px;margin-bottom:8px"></div>'.repeat(5);
  settle([audSearch(q),jamSearch(q)]).then(rs=>{const l=merge(rs);lists.search=l;const w=warn(rs);
    g.innerHTML='<div class="st">'+(w?'<p class="msg glass" style="margin-bottom:10px">'+w+'</p>':"")+(l.length?l.map((t,i)=>rowH(t,"search",i)).join(""):'<p class="msg glass">По запросу «'+esc(q)+'» ничего нет. Попробуй другое слово.</p>')+'</div>';stag();mark()})}
function search(){main.innerHTML='<div class="page"><h1 class="big">Найти<br><em>музыку</em></h1>'+sbH()+'<div id="sres" style="margin-top:14px"><p class="msg glass">Напиши название песни или исполнителя и нажми Enter.</p></div></div>';bindQ();$("q").focus({preventScroll:true})}
function lib(){lists.lib=ST.likes;main.innerHTML='<div class="page"><h1 class="big">Твоё<br><em>любимое</em></h1>'+(ST.likes.length?'<div class="st"><button class="btn" id="plAll" style="margin:6px 0 16px"><svg class="i f" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>Играть всё</button>'+ST.likes.map((t,i)=>rowH(t,"lib",i)).join("")+'</div>':'<p class="msg glass" style="margin-top:14px">Здесь пока пусто. Нажми сердечко у трека, и он появится тут.</p>')+'</div>';stag();if($("plAll"))$("plAll").onclick=()=>play(ST.likes,0);mark()}
function scn(){const items=[["auto","Авто","Фон сам меняется под трек"]].concat(SCN.map(k=>[k,BG.scenes[k].name,BG.scenes[k].desc]));
  main.innerHTML='<div class="page"><h1 class="big">Живые<br><em>фоны</em></h1><p class="sub">Фон оживает, когда играет музыка. Выбери свой или оставь «Авто».</p><div class="scn st">'+items.map(i=>'<button class="sc'+(ST.scene===i[0]?' on':'')+'" data-s="'+i[0]+'"><canvas></canvas><span>'+i[1]+'<small>'+i[2]+'</small></span></button>').join("")+'</div></div>';stag();
  main.querySelectorAll(".sc").forEach(b=>{const n=b.dataset.s,c=b.querySelector("canvas");BG.thumb(c,n==="auto"?SCN[0]:n)});}
const tabsEl=$("tabs"),ind=$("ind");
function moveInd(){const b=tabsEl.querySelector(".tb.on");if(!b)return;ind.style.width=b.offsetWidth+"px";ind.style.transform="translateX("+(b.offsetLeft)+"px)"}
function show(v){view=v;tabsEl.querySelectorAll(".tb").forEach(b=>b.classList.toggle("on",b.dataset.v===v));moveInd();({home,search,lib,scn})[v]();main.scrollTop=0}
tabsEl.querySelectorAll(".tb").forEach(b=>b.onclick=()=>show(b.dataset.v));addEventListener("resize",moveInd);
main.addEventListener("click",e=>{
  const lk=e.target.closest(".like");if(lk){const t=lists[lk.dataset.k][+lk.dataset.i];like(t,lk);const on=isLiked(t);lk.classList.toggle("on",on);const s=lk.querySelector("svg");if(s)s.style.fill=on?"currentColor":"none";return}
  const sc=e.target.closest(".sc");if(sc){ST.scene=sc.dataset.s;save();main.querySelectorAll(".sc").forEach(x=>x.classList.toggle("on",x===sc));if(ST.scene==="auto")paintBg();else BG.set(ST.scene);toast("Фон: "+(ST.scene==="auto"?"Авто":BG.scenes[ST.scene].name));return}
  const b=e.target.closest("[data-k]");if(b)play(lists[b.dataset.k],+b.dataset.i)});
/* волна при нажатии */
document.addEventListener("pointerdown",e=>{const b=e.target.closest("button");if(!b||b.classList.contains("sc"))return;const r=b.getBoundingClientRect(),d=Math.max(r.width,r.height),s=document.createElement("span");s.className="rpl";s.style.cssText="width:"+d+"px;height:"+d+"px;left:"+(e.clientX-r.left-d/2)+"px;top:"+(e.clientY-r.top-d/2)+"px";b.appendChild(s);setTimeout(()=>s.remove(),650)});
/* настройки */
$("setB").onclick=()=>{$("jk").value=ST.jk;$("ak").value=ST.ak;$("set").classList.add("on")};
$("setNo").onclick=()=>$("set").classList.remove("on");
$("setOk").onclick=()=>{ST.jk=$("jk").value.trim();ST.ak=$("ak").value.trim();save();$("set").classList.remove("on");toast("Сохранено");show(view)};
$("set").addEventListener("click",e=>{if(e.target===$("set"))$("set").classList.remove("on")});
BG.init();if(ST.scene!=="auto"&&BG.scenes[ST.scene])BG.set(ST.scene);
show("home");setTimeout(moveInd,300);if(document.fonts&&document.fonts.ready)document.fonts.ready.then(moveInd);
if("serviceWorker" in navigator&&location.protocol.startsWith("http")){navigator.serviceWorker.register("sw.js").catch(()=>{})}
})();
