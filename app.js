(function(){
"use strict";
const $=i=>document.getElementById(i);
const AUD="https://api.audius.co/v1",JAM="https://api.jamendo.com/v3.0",APP="notely";
const CF=window.NOTELY||{};const ST={jk:"",ak:"",yk:"",likes:[],recent:[],vol:80,scene:"auto"};
try{Object.assign(ST,JSON.parse(localStorage.getItem("notely2")||"{}"))}catch(e){}
const save=()=>{try{localStorage.setItem("notely2",JSON.stringify(ST))}catch(e){}};
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const fmt=s=>{s=Math.max(0,Math.round(s||0));return Math.floor(s/60)+":"+("0"+s%60).slice(-2)};
let toastT=0;const toast=t=>{const e=$("toast");e.textContent=t;e.className="on";clearTimeout(toastT);toastT=setTimeout(()=>e.className="",3200)};
const hue=id=>{let h=0;const s=String(id);for(let i=0;i<s.length;i++)h=(h*131+s.charCodeAt(i)*977)%360;return h};
const artCss=t=>t.art?"background-image:url('"+esc(t.art)+"')":"background-image:linear-gradient(135deg,hsl("+hue(t.id)+" 75% 58%),hsl("+(hue(t.id)+60)%360+" 75% 38%))";

/* ---- каталоги ---- */
const aq=()=>"app_name="+APP+(ST.ak?"&api_key="+encodeURIComponent(ST.ak):"");
const getJ=u=>fetch(u).then(r=>{if(!r.ok)throw new Error(r.status);return r.json()});
const fromAud=x=>{const a=x.artwork||{};return{id:"a"+x.id,src:"Audius",title:x.title,artist:(x.user&&x.user.name)||"",art:a["480x480"]||a["150x150"]||a["1000x1000"]||"",url:AUD+"/tracks/"+x.id+"/stream?"+aq(),dur:x.duration||0}};
const fromJam=x=>({id:"j"+x.id,src:"Jamendo",title:x.name,artist:x.artist_name,art:x.image||x.album_image||"",url:x.audio,dur:x.duration||0});
const audSearch=q=>getJ(AUD+"/tracks/search?query="+encodeURIComponent(q)+"&limit=24&"+aq()).then(j=>(j.data||[]).map(fromAud));
const audTrend=g=>getJ(AUD+"/tracks/trending?limit=20&"+(g?"genre="+encodeURIComponent(g)+"&":"")+aq()).then(j=>(j.data||[]).map(fromAud));
const jk=()=>ST.jk||CF.jamendo||"";
const jamQ=x=>{if(!jk())return Promise.reject(new Error("nokey"));return getJ(JAM+"/tracks/?client_id="+encodeURIComponent(jk())+"&format=json&limit=20&audioformat=mp32&imagesize=300&"+x).then(j=>(j.results||[]).map(fromJam))};
const jamSearch=q=>jamQ("search="+encodeURIComponent(q));
const jamTrend=()=>jamQ("order=popularity_week");
const YT="https://www.googleapis.com/youtube/v3";
const dur8601=d=>{const m=/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(d||"");return m?(+m[1]||0)*3600+(+m[2]||0)*60+(+m[3]||0):0};
const decode=s=>{const t=document.createElement("textarea");t.innerHTML=s;return t.value};
/* убираем хвосты из названий YouTube: (Official Video), [Lyrics], 4K и т.п. */
const cleanT=t=>{let r=String(t).replace(/\s*[\(\[](official|lyrics?|audio|video|hd|4k|mv|music video|visualizer|clip|live|remaster(ed)?|explicit|with lyrics)[^\)\]]*[\)\]]/gi,"").replace(/\s*\|.*$/,"").replace(/\s+/g," ").trim();return r||t};
const fromYt=x=>{const sn=x.snippet||{},th=sn.thumbnails||{};return{id:"y"+(x.id.videoId||x.id),ytId:x.id.videoId||x.id,src:"YouTube",vid:/official\s*(music\s*)?video|music\s*video|\bmv\b|video\s*clip/i.test(sn.title||""),title:cleanT(decode(sn.title||"")),artist:decode((sn.channelTitle||"").replace(/ - Topic$/,"")),art:(th.high||th.medium||th.default||{}).url||"",url:"",dur:x.contentDetails?dur8601(x.contentDetails.duration):0}};
const ytOn=()=>!!(ST.yk||CF.proxy);const ytKey=()=>{if(!ST.yk)return Promise.reject(new Error("nokey"));return Promise.resolve(ST.yk)};
const ytErr=j=>{if(j&&j.error){const e=new Error(j.error.message||"yt");e.quota=(j.error.errors||[]).some(x=>/quota/i.test(x.reason));throw e}return j};
const ytSearch=q=>(!ST.yk&&CF.proxy)?getJ(CF.proxy.replace(/\/$/,"")+"/search?q="+encodeURIComponent(q)).then(ytErr).then(v=>(v.items||[]).map(fromYt)):ytKey().then(k=>getJ(YT+"/search?part=snippet&type=video&videoCategoryId=10&maxResults=20&q="+encodeURIComponent(q)+"&key="+k)).then(ytErr).then(j=>{const ids=(j.items||[]).map(i=>i.id.videoId).filter(Boolean);if(!ids.length)return[];return getJ(YT+"/videos?part=snippet,contentDetails&id="+ids.join(",")+"&key="+ST.yk).then(ytErr).then(v=>(v.items||[]).map(fromYt))});
const ytTrend=()=>(!ST.yk&&CF.proxy)?getJ(CF.proxy.replace(/\/$/,"")+"/trending").then(ytErr).then(v=>(v.items||[]).map(fromYt)):ytKey().then(k=>getJ(YT+"/videos?part=snippet,contentDetails&chart=mostPopular&videoCategoryId=10&maxResults=20&key="+k)).then(ytErr).then(v=>(v.items||[]).map(fromYt));
const settle=ps=>Promise.all(ps.map(p=>p.then(v=>({ok:1,v}),e=>({ok:0,e}))));
const merge=rs=>{const o=[],n=Math.max(0,...rs.map(r=>r.ok?r.v.length:0));for(let i=0;i<n;i++)rs.forEach(r=>{if(r.ok&&r.v[i])o.push(r.v[i])});return o};
const warn=rs=>{const q=rs.find(r=>!r.ok&&r.e&&r.e.quota);if(q)return"Дневной лимит YouTube закончился. Он обновится завтра, пока ищи в Audius и Jamendo.";const bad=rs.filter(r=>!r.ok);if(!bad.length)return"";return bad.every(b=>b.e&&b.e.message==="nokey")?(ytOn()?"":"Чтобы искать любые песни целиком, добавь бесплатный ключ YouTube в настройках (значок N вверху)."):"Часть каталога сейчас не отвечает. Попробуй позже."};

/* ---- фон под трек ---- */
const SCN=Object.keys(BG.scenes);
function paintBg(){const t=cur;if(t){const h=hue(t.id);BG.color(h,h+70)}
  if(ST.scene==="auto"){if(t)BG.set(SCN[hue(t.id+"s")%SCN.length])}else BG.set(ST.scene)}

/* ---- плеер ---- */
const au=new Audio();au.preload="none";au.volume=ST.vol/100;
let Q=[],qi=-1,shuf=false,rep=false,cur=null,view="home";
const isLiked=t=>ST.likes.some(x=>x.id===t.id);
const lists={};
function mq(el,txt){el.textContent=txt;el.classList.remove("run");el.dataset.t=txt;requestAnimationFrame(()=>{if(el.scrollWidth>el.parentNode.parentNode.clientWidth+2){el.textContent=txt+"   ·   "+txt+"   ·   ";el.classList.add("run")}})}
function setIcons(p){const d=p?"M6 5h4v14H6zM14 5h4v14h-4z":"M8 5v14l11-7z";$("ppI").innerHTML=$("fPpI").innerHTML='<path d="'+d+'"/>';[$("ppB"),$("fPp")].forEach(b=>b.setAttribute("aria-label",p?"Пауза":"Играть"));
  document.documentElement.style.setProperty("--pl",p?"running":"paused");$("nowB").classList.toggle("pl",p);$("full").classList.toggle("pl",p);BG.play(p)}
function play(list,i){Q=list.slice();qi=i;load(true)}
let fails=0,tok=0,yp=null,ypReady=null,ymode=false,ytim=0;
function ensureYT(){if(ypReady)return ypReady;ypReady=new Promise((res,rej)=>{const go=()=>{yp=new YT_.Player("ytp",{width:"100%",height:"100%",playerVars:{playsinline:1,rel:0,modestbranding:1,controls:1},events:{onReady:()=>{try{yp.setVolume(ST.vol)}catch(e){}res(yp)},onStateChange:ysc,onError:e=>failTrack({name:"YouTube "+e.data})}})};
  if(window.YT&&window.YT.Player){YT_=window.YT;go()}else{window.onYouTubeIframeAPIReady=()=>{YT_=window.YT;go()};const s=document.createElement("script");s.src="https://www.youtube.com/iframe_api";s.onerror=()=>rej(new Error("yt-load"));document.head.appendChild(s)}});return ypReady}
let YT_=null;
function ysc(e){if(!ymode)return;const S=window.YT.PlayerState;if(e.data===S.PLAYING){setIcons(true);fails=0;const d=yp.getDuration();if(d&&cur)cur.dur=d}else if(e.data===S.PAUSED)setIcons(false);else if(e.data===S.ENDED){if(rep){yp.seekTo(0);yp.playVideo()}else next()}}
function ytick(){if(!ymode||!yp||!yp.getCurrentTime)return;const c=yp.getCurrentTime()||0,d=yp.getDuration()||(cur&&cur.dur)||0,p=d?c/d*1000:0;[$("seek"),$("fSeek")].forEach(s=>{if(!s.dataset.d){s.value=p;rng(s,p/10)}});mprog(p/10);$("cur").textContent=$("fCur").textContent=fmt(c);$("dur").textContent=$("fDur").textContent=fmt(d)}
setInterval(ytick,500);
function showYt(on){const w=$("ytw"),v=!!(on&&cur&&cur.vid);w.hidden=!on;w.classList.toggle("vid",v);if(!on)w.classList.remove("big");else w.classList.toggle("big",v&&$("full").classList.contains("on"));$("fCv").style.visibility=v?"hidden":""}
function resolve(t){if(t.src==="YouTube")return Promise.resolve("");if(t.src!=="Audius")return Promise.resolve(t.url);
  return getJ(AUD+"/tracks/"+t.id.slice(1)+"/stream?no_redirect=true&"+aq()).then(j=>typeof j.data==="string"?j.data:t.url).catch(()=>t.url)}
function load(go){cur=Q[qi];if(!cur)return;const my=++tok;
  $("bar").classList.remove("hid");$("bCv").style.cssText=$("fCv").style.cssText=artCss(cur);mq($("bT"),cur.title);$("bA").textContent=$("fA").textContent=cur.artist;$("fT").textContent=cur.title;
  ST.recent=[cur].concat(ST.recent.filter(x=>x.id!==cur.id)).slice(0,20);save();document.title=cur.title+" · Notely";$("fLike").classList.toggle("on",isLiked(cur));paintBg();mark();
  if("mediaSession" in navigator){try{navigator.mediaSession.metadata=new MediaMetadata({title:cur.title,artist:cur.artist,artwork:cur.art?[{src:cur.art,sizes:"480x480"}]:[]})}catch(e){}}
  if(cur.src==="YouTube"){au.pause();ymode=true;showYt(true);ensureYT().then(p=>{if(my!==tok)return;p.loadVideoById(cur.ytId);try{p.setVolume(ST.vol)}catch(e){}}).catch(()=>failTrack({name:"YouTube не загрузился"}));return}
  if(ymode){ymode=false;try{yp&&yp.pauseVideo()}catch(e){}showYt(false)}
  resolve(cur).then(u=>{if(my!==tok)return;au.src=u;if(go)return au.play().then(()=>{fails=0}).catch(e=>failTrack(e))})}
function failTrack(e){const why=e&&e.name==="NotAllowedError"?"Браузер не дал включить звук. Нажми на кнопку воспроизведения ещё раз.":"Трек не включился"+(e&&e.name?" ("+e.name+")":"");
  if(e&&e.name==="NotAllowedError"){toast(why);return}
  if(++fails>=3){toast("Не получается включить треки. Проверь интернет и попробуй другой трек.");fails=0;return}
  toast(why+", пробую следующий");setTimeout(next,900)}
const next=()=>{if(!Q.length)return;qi=shuf?Math.floor(Math.random()*Q.length):(qi+1)%Q.length;load(true)};
const prev=()=>{if(!Q.length)return;if(au.currentTime>3){au.currentTime=0;return}qi=(qi-1+Q.length)%Q.length;load(true)};
const toggle=()=>{if(!cur){toast("Выбери трек");return}if(ymode&&yp){yp.getPlayerState()===1?yp.pauseVideo():yp.playVideo();return}au.paused?au.play().catch(()=>{}):au.pause()};
au.addEventListener("play",()=>{if(!ymode)setIcons(true)});au.addEventListener("pause",()=>{if(!ymode)setIcons(false)});
au.addEventListener("ended",()=>{if(ymode)return;if(rep){au.currentTime=0;au.play()}else next()});
au.addEventListener("error",()=>{if(!ymode&&cur&&au.src){const c=au.error?au.error.code:0;failTrack({name:"код "+c})}});
const rng=(el,p)=>el.style.setProperty("--p",p+"%");const mprog=p=>$("mp").style.setProperty("--mp",Math.max(0,Math.min(100,p))+"%");
au.addEventListener("timeupdate",()=>{if(ymode)return;const d=au.duration||(cur&&cur.dur)||0,p=d?au.currentTime/d*1000:0;[$("seek"),$("fSeek")].forEach(s=>{if(!s.dataset.d){s.value=p;rng(s,p/10)}});mprog(p/10);$("cur").textContent=$("fCur").textContent=fmt(au.currentTime);$("dur").textContent=$("fDur").textContent=fmt(d)});
[$("seek"),$("fSeek")].forEach(s=>{s.addEventListener("input",()=>{s.dataset.d=1;rng(s,s.value/10)});s.addEventListener("change",()=>{if(ymode&&yp){const d=yp.getDuration()||(cur&&cur.dur)||0;if(d)yp.seekTo(s.value/1000*d,true);delete s.dataset.d;return}const d=au.duration||(cur&&cur.dur)||0;if(d)au.currentTime=s.value/1000*d;delete s.dataset.d})});
$("vol").value=ST.vol;rng($("vol"),ST.vol);$("vol").addEventListener("input",function(){au.volume=this.value/100;ST.vol=+this.value;try{yp&&yp.setVolume(ST.vol)}catch(e){}rng(this,this.value);save()});
$("ppB").onclick=$("fPp").onclick=toggle;$("nxB").onclick=$("fNx").onclick=next;$("prB").onclick=$("fPr").onclick=prev;
$("shB").onclick=$("fSh").onclick=()=>{shuf=!shuf;$("shB").classList.toggle("on",shuf);$("fSh").classList.toggle("on",shuf);toast(shuf?"Перемешивание включено":"Перемешивание выключено")};
$("rpB").onclick=function(){rep=!rep;this.classList.toggle("on",rep);toast(rep?"Повтор трека включён":"Повтор выключен")};
$("fLike").onclick=e=>{if(cur)like(cur,e.currentTarget)};
const openFull=()=>{if(!cur)return;$("full").classList.add("on");document.body.classList.add("fp");if(ymode)showYt(true)},closeFull=()=>{$("full").classList.remove("on");document.body.classList.remove("fp");if(ymode)showYt(true)};
$("nowB").onclick=openFull;$("clB").onclick=closeFull;
$("bars").innerHTML=Array.from({length:22},(_,i)=>'<i style="animation-delay:'+(-(i*47%100)/100)+'s;animation-duration:'+(.6+(i*13%7)/10)+'s"></i>').join("");
if("mediaSession" in navigator){const m=navigator.mediaSession;[["play",()=>{if(ymode&&yp)yp.playVideo();else au.play()}],["pause",()=>{if(ymode&&yp)yp.pauseVideo();else au.pause()}],["nexttrack",next],["previoustrack",prev]].forEach(a=>{try{m.setActionHandler(a[0],a[1])}catch(e){}})}
document.addEventListener("keydown",e=>{if(/INPUT|TEXTAREA/.test(e.target.tagName)&&e.target.type!=="range")return;if(e.code==="Space"){e.preventDefault();toggle()}if(e.key==="ArrowRight"&&e.shiftKey)next();if(e.key==="ArrowLeft"&&e.shiftKey)prev();if(e.key==="Escape")closeFull()});
function burst(el){const r=el.getBoundingClientRect();for(let i=0;i<7;i++){const h=document.createElement("div");h.className="hb";h.textContent=["💗","💖","✨","💞"][i%4];h.style.left=(r.left+r.width/2-9)+"px";h.style.top=(r.top+r.height/2-9)+"px";h.style.setProperty("--x",(Math.random()*90-45)+"px");h.style.animationDelay=(i*50)+"ms";document.body.appendChild(h);setTimeout(()=>h.remove(),1300)}}
function like(t,btn){const i=ST.likes.findIndex(x=>x.id===t.id);if(i>=0)ST.likes.splice(i,1);else{ST.likes.unshift(t);if(btn)burst(btn)}save();const on=i<0;
  $("fLike").classList.toggle("on",!!cur&&isLiked(cur));document.querySelectorAll('[data-lk="'+t.id+'"]').forEach(b=>{b.classList.toggle("on",on);b.classList.remove("pop");void b.offsetWidth;b.classList.add("pop")});if(view==="lib")show("lib")}

/* ---- экраны ---- */
const main=$("main");
const PLAY='<svg class="i f" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
const HEART='<svg viewBox="0 0 24 24"><path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z"/></svg>';
const SHUF='<svg class="i" viewBox="0 0 24 24"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>';
const EQM='<div class="eqm"><i></i><i></i><i></i><i></i></div>';
const sqH=(t,k,i)=>'<button class="sq" data-k="'+k+'" data-i="'+i+'" data-id="'+esc(t.id)+'"><div class="cv" style="'+artCss(t)+'">'+EQM+'</div><b><em>'+esc(t.title)+'</em>'+esc(t.artist)+'</b></button>';
const ntH=(t,k,i)=>'<button class="sq nt" data-k="'+k+'" data-i="'+i+'" data-id="'+esc(t.id)+'"><div class="cv"><i style="'+artCss(t)+'"></i><span>Новый трек</span>'+EQM+'</div><b><em>'+esc(t.title)+'</em>'+esc(t.artist)+'</b></button>';
const tileH=(t,k,i)=>'<button class="tile" data-k="'+k+'" data-i="'+i+'" data-id="'+esc(t.id)+'"><div class="cv" style="'+artCss(t)+'">'+EQM+'</div><div class="t"><b>'+esc(t.title)+'</b><span>'+esc(t.artist)+'</span></div></button>';
const heart=(t,k,i)=>'<button class="like'+(isLiked(t)?' on':'')+'" data-lk="'+esc(t.id)+'" data-k="'+k+'" data-i="'+i+'" aria-label="В любимое"><svg class="i" viewBox="0 0 24 24" style="fill:'+(isLiked(t)?'currentColor':'none')+'"><path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z"/></svg></button>';
const rowH=(t,k,i)=>'<div class="row" data-id="'+esc(t.id)+'"><div class="cv" style="'+artCss(t)+'">'+EQM+'</div><button class="t" data-k="'+k+'" data-i="'+i+'"><b>'+esc(t.title)+'</b><span>'+esc(t.artist)+' · '+t.src+'</span></button><time>'+fmt(t.dur)+'</time>'+heart(t,k,i)+'</div>';
function mark(){document.querySelectorAll("[data-id]").forEach(e=>e.classList.toggle("cur",!!cur&&e.getAttribute("data-id")===cur.id))}
const shuffled=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const playLikes=()=>{if(!ST.likes.length){toast("Сначала отметь пару треков сердечком");return}play(shuffled(ST.likes),0)};
const SH=[["Сейчас в тренде",""],["Электроника","Electronic"],["Лоу-фай","Lo-Fi"],["Хип-хоп","Hip-Hop/Rap"]];
function home(){
  main.innerHTML='<div class="pg px"><button class="likes" id="lkB"><div class="hh">'+HEART+'</div><b>Любимое</b><span class="circ" role="button" aria-label="Играть вперемешку">'+SHUF+'</span></button><div class="tiles" id="tl">'+'<div class="sk" style="height:78px"></div>'.repeat(4)+'</div><div id="shl"><div class="sk" style="height:240px;margin-top:34px"></div></div></div>';
  const jobs=SH.map(s=>audTrend(s[1])).concat([jamTrend(),ytTrend()]);
  settle(jobs).then(rs=>{if(view!=="home")return;
    const yi=rs.length-1,ok=rs.filter(r=>r.ok&&r.v.length);if(rs[yi].ok&&rs[yi].v.length){ok.splice(ok.indexOf(rs[yi]),1);ok.unshift(rs[yi])}
    let html="";
    ok.forEach((r,idx)=>{const ri=rs.indexOf(r),title=ri<SH.length?SH[ri][0]:ri===SH.length?"Из Jamendo":"Популярно на YouTube",k="h"+ri;lists[k]=r.v;
      html+='<h2>'+title+'<button data-all="'+k+'">Играть всё</button></h2><div class="shelf">'+r.v.map((t,i)=>sqH(t,k,i)).join("")+'</div>';
      if(idx===0&&ok.length>1){const src=ok[ok.length-1].v.slice().reverse().slice(0,12);lists.nt=src;html+='<h2>Новые треки</h2><div class="shelf">'+src.map((t,i)=>ntH(t,"nt",i)).join("")+'</div>'}});
    const first=ok.length?ok[0].v:[];
    const pool=ST.recent.slice(0,4);first.forEach(t=>{if(pool.length<4&&!pool.some(x=>x.id===t.id))pool.push(t)});lists.tl=pool;
    $("tl").innerHTML=pool.map((t,i)=>tileH(t,"tl",i)).join("");
    const w=warn(rs);
    $("shl").innerHTML=(first.length?"":'<p class="msg" style="margin-top:20px">Ничего не нашлось. Проверь интернет или зайди позже.</p>')+(w&&(!ytOn()||!jk())?'<p class="msg" style="margin-top:20px">'+w+'</p>':"")+html;mark()});
}
function doSearch(q){const g=$("sres");g.innerHTML='<div class="sk" style="height:56px;margin-bottom:10px"></div>'.repeat(6);
  settle([ytSearch(q),audSearch(q),jamSearch(q)]).then(rs=>{const l=merge(rs);lists.search=l;const w=warn(rs);
    g.innerHTML=(w?'<p class="msg" style="margin-bottom:10px">'+w+'</p>':"")+(l.length?l.map((t,i)=>rowH(t,"search",i)).join(""):'<p class="msg">По запросу «'+esc(q)+'» ничего нет. Попробуй другое слово.</p>');mark()})}
const GEN=[["Электроника","Electronic",24],["Хип-хоп","Hip-Hop",350],["Лоу-фай","lofi",160],["Рок","rock",8],["Поп","pop",320],["Джаз","jazz",40],["Классика","classical",215],["Инди","indie",280]];
function search(){main.innerHTML='<div class="pg px"><h1>Поиск</h1><label class="sb"><svg class="i" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input id="q" type="search" placeholder="Песня, исполнитель, жанр" enterkeyhint="search"></label><div id="sres"><h2 style="margin-top:22px">Жанры</h2><div class="gen">'+GEN.map(g=>'<button class="g" data-g="'+g[1]+'" style="background:hsl('+g[2]+' 62% 38%)">'+g[0]+'</button>').join("")+'</div></div></div>';
  const q=$("q");q.addEventListener("keydown",e=>{if(e.key==="Enter"&&q.value.trim()){q.blur();doSearch(q.value.trim())}})}
let libTab="likes";
function lib(){const arr=libTab==="likes"?ST.likes:ST.recent;lists.lib=arr;
  main.innerHTML='<div class="pg px"><h1>Библиотека</h1><div class="chips"><button class="chip'+(libTab==="likes"?" on":"")+'" data-c="likes">Любимое</button><button class="chip'+(libTab==="recent"?" on":"")+'" data-c="recent">Недавние</button></div>'+
   (arr.length?'<button class="btn" id="plAll" style="margin:4px 0 12px">'+PLAY+'Играть всё</button>'+arr.map((t,i)=>rowH(t,"lib",i)).join(""):'<p class="msg">'+(libTab==="likes"?"Здесь пока пусто. Нажми сердечко у трека, и он появится тут.":"Ты пока ничего не слушал.")+'</p>')+'</div>';
  if($("plAll"))$("plAll").onclick=()=>play(arr,0);mark()}
const tabsEl=$("tabs"),ind=$("ind");
function moveInd(){const b=tabsEl.querySelector(".tb.on");if(!b)return;ind.style.width=b.offsetWidth+"px";ind.style.setProperty("--tx",b.offsetLeft+"px")}
function show(v){view=v;tabsEl.querySelectorAll(".tb").forEach(b=>b.classList.toggle("on",b.dataset.v===v));moveInd();({home,search,lib})[v]();main.scrollTop=0}
tabsEl.querySelectorAll(".tb").forEach(b=>b.onclick=()=>{if(dragged){dragged=false;return}show(b.dataset.v)});
/* на телефоне «линзу» можно тянуть пальцем */
let dragged=false,pd=null;
tabsEl.addEventListener("pointerdown",e=>{if(innerWidth>760)return;const r=tabsEl.getBoundingClientRect();pd={x0:e.clientX,lx:e.clientX,r:r,moved:false,w:ind.offsetWidth};tabsEl.classList.add("press");try{tabsEl.setPointerCapture(e.pointerId)}catch(_){}});
tabsEl.addEventListener("pointermove",e=>{if(!pd)return;if(Math.abs(e.clientX-pd.x0)>6)pd.moved=true;if(!pd.moved)return;const v=e.clientX-pd.lx;pd.lx=e.clientX;
  const tx=Math.max(0,Math.min(pd.r.width-pd.w-10,e.clientX-pd.r.left-pd.w/2-5));ind.style.transition="none";ind.style.setProperty("--tx",tx+"px");ind.style.setProperty("--sx",1+Math.min(.22,Math.abs(v)/50))});
function endPress(e){if(!pd)return;const m=pd.moved;pd=null;tabsEl.classList.remove("press");ind.style.transition="";ind.style.removeProperty("--sx");
  if(m){dragged=true;setTimeout(()=>dragged=false,60);const cx=parseFloat(ind.style.getPropertyValue("--tx"))+ind.offsetWidth/2;let best=null,bd=1e9;tabsEl.querySelectorAll(".tb").forEach(b=>{const d=Math.abs(b.offsetLeft+b.offsetWidth/2-cx);if(d<bd){bd=d;best=b}});if(best)show(best.dataset.v)}}
tabsEl.addEventListener("pointerup",endPress);tabsEl.addEventListener("pointercancel",endPress);addEventListener("resize",moveInd);
main.addEventListener("click",e=>{
  const lk=e.target.closest(".like");if(lk){const t=lists[lk.dataset.k][+lk.dataset.i];like(t,lk);const on=isLiked(t);lk.classList.toggle("on",on);const sv=lk.querySelector("svg");if(sv)sv.style.fill=on?"currentColor":"none";return}
  if(e.target.closest(".circ")){playLikes();return}
  if(e.target.closest("#lkB")){libTab="likes";show("lib");return}
  const al=e.target.closest("[data-all]");if(al){const l=lists[al.dataset.all];if(l&&l.length)play(l,0);return}
  const ch=e.target.closest(".chip");if(ch){libTab=ch.dataset.c;lib();return}
  const g=e.target.closest(".g");if(g){$("q").value=g.textContent;doSearch(g.dataset.g);return}
  const b=e.target.closest("[data-k]");if(b)play(lists[b.dataset.k],+b.dataset.i)});
/* волна при нажатии */
document.addEventListener("pointerdown",e=>{const b=e.target.closest("button");if(!b)return;const r=b.getBoundingClientRect(),d=Math.max(r.width,r.height),s=document.createElement("span");s.className="rpl";s.style.cssText="width:"+d+"px;height:"+d+"px;left:"+(e.clientX-r.left-d/2)+"px;top:"+(e.clientY-r.top-d/2)+"px";b.appendChild(s);setTimeout(()=>s.remove(),650)});
/* настройки */
$("sc").innerHTML='<option value="auto">Авто (меняется под трек)</option>'+SCN.map(k=>'<option value="'+k+'">'+BG.scenes[k].name+" — "+BG.scenes[k].desc+"</option>").join("");
$("setB").onclick=()=>{$("sc").value=ST.scene;$("yk").value=ST.yk;$("jk").value=ST.jk;$("ak").value=ST.ak;$("set").classList.add("on")};
$("setNo").onclick=()=>$("set").classList.remove("on");
$("setOk").onclick=()=>{ST.yk=$("yk").value.trim();ST.jk=$("jk").value.trim();ST.ak=$("ak").value.trim();ST.scene=$("sc").value;save();paintBg();$("set").classList.remove("on");toast("Сохранено");show(view)};
$("set").addEventListener("click",e=>{if(e.target===$("set"))$("set").classList.remove("on")});
BG.init();if(ST.scene!=="auto"&&BG.scenes[ST.scene])BG.set(ST.scene);
show("home");setTimeout(moveInd,300);if(document.fonts&&document.fonts.ready)document.fonts.ready.then(moveInd);
if("serviceWorker" in navigator&&location.protocol.startsWith("http")){navigator.serviceWorker.register("sw.js").catch(()=>{})}
})();
