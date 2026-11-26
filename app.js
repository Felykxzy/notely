(function(){
"use strict";
const $=i=>document.getElementById(i);
const AUD="https://api.audius.co/v1",JAM="https://api.jamendo.com/v3.0",APP="notely";
const CF=window.NOTELY||{};const ST={jk:"",ak:"",yk:"",likes:[],recent:[],hist:[],pls:[],theme:"cover",sf:"all",orig:true,vol:80,scene:"auto",lite:"auto"};
try{Object.assign(ST,JSON.parse(localStorage.getItem("notely2")||"{}"))}catch(e){}
const save=()=>{try{localStorage.setItem("notely2",JSON.stringify(ST))}catch(e){}};
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const fmt=s=>{s=Math.max(0,Math.round(s||0));return Math.floor(s/60)+":"+("0"+s%60).slice(-2)};
let toastT=0;const toast=t=>{const e=$("toast");e.textContent=t;e.className="on";clearTimeout(toastT);toastT=setTimeout(()=>e.className="",3200)};
const hue=id=>{let h=0;const s=String(id);for(let i=0;i<s.length;i++)h=(h*131+s.charCodeAt(i)*977)%360;return h};
const artCss=t=>t.art?"background-image:url('"+esc(t.art)+"')"+(t.topic?";background-size:178% auto":""):"background-image:linear-gradient(135deg,hsl("+hue(t.id)+" 75% 58%),hsl("+(hue(t.id)+60)%360+" 75% 38%))";

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
const fromYt=x=>{const sn=x.snippet||{},th=sn.thumbnails||{};return{id:"y"+(x.id.videoId||x.id),ytId:x.id.videoId||x.id,src:"YouTube",topic:/ - Topic$/.test(sn.channelTitle||""),vid:/official\s*(music\s*)?video|music\s*video|\bmv\b|video\s*clip/i.test(sn.title||""),title:cleanT(decode(sn.title||"")),artist:decode((sn.channelTitle||"").replace(/ - Topic$/,"")),art:(th.high||th.medium||th.default||{}).url||"",url:"",dur:x.contentDetails?dur8601(x.contentDetails.duration):0}};
const ytOn=()=>!!(ST.yk||CF.proxy);const ytKey=()=>{if(!ST.yk)return Promise.reject(new Error("nokey"));return Promise.resolve(ST.yk)};
const ytErr=j=>{if(j&&j.error){const e=new Error(j.error.message||"yt");e.quota=(j.error.errors||[]).some(x=>/quota/i.test(x.reason));throw e}return j};
const ytSearch=q=>(!ST.yk&&CF.proxy)?getJ(CF.proxy.replace(/\/$/,"")+"/search?q="+encodeURIComponent(q)).then(ytErr).then(v=>(v.items||[]).map(fromYt)):ytKey().then(k=>getJ(YT+"/search?part=snippet&type=video&videoCategoryId=10&maxResults=20&q="+encodeURIComponent(q)+"&key="+k)).then(ytErr).then(j=>{const ids=(j.items||[]).map(i=>i.id.videoId).filter(Boolean);if(!ids.length)return[];return getJ(YT+"/videos?part=snippet,contentDetails&id="+ids.join(",")+"&key="+ST.yk).then(ytErr).then(v=>(v.items||[]).map(fromYt))});
const ytTrend=()=>(!ST.yk&&CF.proxy)?getJ(CF.proxy.replace(/\/$/,"")+"/trending").then(ytErr).then(v=>(v.items||[]).map(fromYt)):ytKey().then(k=>getJ(YT+"/videos?part=snippet,contentDetails&chart=mostPopular&videoCategoryId=10&maxResults=20&key="+k)).then(ytErr).then(v=>(v.items||[]).map(fromYt));
const settle=ps=>Promise.all(ps.map(p=>p.then(v=>({ok:1,v}),e=>({ok:0,e}))));
const merge=rs=>{const o=[],n=Math.max(0,...rs.map(r=>r.ok?r.v.length:0));for(let i=0;i<n;i++)rs.forEach(r=>{if(r.ok&&r.v[i])o.push(r.v[i])});return o};
const warn=rs=>{const q=rs.find(r=>!r.ok&&r.e&&r.e.quota);if(q)return"Дневной лимит YouTube закончился. Он обновится завтра, пока ищи в Audius и Jamendo.";const bad=rs.filter(r=>!r.ok);if(!bad.length)return"";return bad.every(b=>b.e&&b.e.message==="nokey")?(ytOn()?"":"Чтобы искать любые песни целиком, добавь бесплатный ключ YouTube в настройках (значок N вверху)."):"Часть каталога сейчас не отвечает. Попробуй позже."};

/* ---- фон под трек ---- */
/* ---- фон под трек: цвета берём с обложки ---- */
const palC={};let palTok=0;
function hsl2rgb(h,s,l){h=((h%360)+360)%360/360;const f=n=>{const k=(n+h*12)%12,a=s*Math.min(l,1-l);return l-a*Math.max(-1,Math.min(k-3,9-k,1))};return[Math.round(f(0)*255),Math.round(f(8)*255),Math.round(f(4)*255)]}
function rgb2hsl(r,g,b){r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2;let h=0,s=0;if(mx!==mn){const d=mx-mn;s=l>.5?d/(2-mx-mn):d/(mx+mn);h=mx===r?(g-b)/d+(g<b?6:0):mx===g?(b-r)/d+2:(r-g)/d+4;h*=60}return[h,s,l]}
const fbPal=id=>{const h=hue(id);return[h,h+40,h+90,h-35,h+150].map(x=>hsl2rgb(x,.7,.46))};
function grabPal(url){return new Promise(res=>{const im=new Image();im.crossOrigin="anonymous";
  im.onload=()=>{try{const c=document.createElement("canvas");c.width=c.height=24;const x=c.getContext("2d"),w=im.naturalWidth,h=im.naturalHeight;x.drawImage(im,w*.25,h*.25,w*.5,h*.5,0,0,24,24);const d=x.getImageData(0,0,24,24).data;
    const bins=Array.from({length:12},()=>({w:0,r:0,g:0,b:0}));
    for(let i=0;i<d.length;i+=4){const[hh,ss,ll]=rgb2hsl(d[i],d[i+1],d[i+2]),ex=ll<.12||ll>.9,wt=ex?.02:1+ss*2.5,k=Math.floor(hh/30)%12,b=bins[k];b.w+=wt;b.r+=d[i]*wt;b.g+=d[i+1]*wt;b.b+=d[i+2]*wt}
    const all=bins.reduce((a,b)=>a+b.w,0),top=bins.filter(b=>b.w>all*.08).sort((a,b)=>b.w-a.w).slice(0,4).map(b=>{const[hh,ss,ll]=rgb2hsl(b.r/b.w,b.g/b.w,b.b/b.w);return[hh,Math.min(.85,ss>.2?Math.max(.45,ss*1.15):ss*1.1),Math.min(.5,Math.max(.28,ll))]});
    if(!top.length){res(null);return}
    const m=top[0],sh=(c,d)=>[c[0]+d,c[1],c[2]],cc=[top[0],top[1]||sh(m,24),top[2]||sh(m,-24),top[3]||sh(top[1]||m,-18)].map(c=>hsl2rgb(c[0],c[1],c[2]));
    const o=[cc[1],cc[2],cc[3],cc[0],cc[0]];
    res(o)}catch(e){res(null)}};
  im.onerror=()=>res(null);im.src=url})}
function paintBg(){const t=cur;if(!t)return;const my=++palTok;
  if(ST.theme==='dark'){BG.palette([[44,44,56],[30,30,40],[56,48,64],[36,40,52],[26,26,34]]);return}
  if(palC[t.id]){BG.palette(palC[t.id]);return}
  BG.palette(fbPal(t.id));
  if(!t.art)return;
  grabPal(t.art).then(p=>{if(!p)return;palC[t.id]=p;if(my===palTok)BG.palette(p)})}

/* ---- плеер ---- */
const au=new Audio();au.preload="none";au.volume=ST.vol/100;
let Q=[],qi=-1,shuf=false,rep=false,cur=null,view="home";
const isLiked=t=>ST.likes.some(x=>x.id===t.id);
const lists={};
function mq(el,txt){el.textContent=txt;el.classList.remove("run");el.dataset.t=txt;requestAnimationFrame(()=>{if(el.scrollWidth>el.parentNode.parentNode.clientWidth+2){el.textContent=txt+"   ·   "+txt+"   ·   ";el.classList.add("run")}})}
function msPlay(p){try{navigator.mediaSession.playbackState=p?"playing":"paused"}catch(e){}}
let msT=0;function msPos(d,c){const n=Date.now();if(n-msT<900||!d||!isFinite(d))return;msT=n;try{navigator.mediaSession.setPositionState({duration:d,position:Math.max(0,Math.min(c,d)),playbackRate:1})}catch(e){}}
function setIcons(p){msPlay(p);const d=p?"M6 5h4v14H6zM14 5h4v14h-4z":"M8 5v14l11-7z";$("ppI").innerHTML=$("fPpI").innerHTML='<path d="'+d+'"/>';[$("ppB"),$("fPp")].forEach(b=>b.setAttribute("aria-label",p?"Пауза":"Играть"));
  document.documentElement.style.setProperty("--pl",p?"running":"paused");$("nowB").classList.toggle("pl",p);$("full").classList.toggle("pl",p);BG.play(p)}
function play(list,i){Q=list.slice();qi=i;load(true)}
let fails=0,tok=0,yp=null,ypReady=null,ymode=false,ytim=0;
function ensureYT(){if(ypReady)return ypReady;ypReady=new Promise((res,rej)=>{const go=()=>{yp=new YT_.Player("ytp",{width:"100%",height:"100%",playerVars:{playsinline:1,rel:0,modestbranding:1,controls:1},events:{onReady:()=>{try{yp.setVolume(ST.vol)}catch(e){}res(yp)},onStateChange:ysc,onError:e=>failTrack({name:"YouTube "+e.data})}})};
  if(window.YT&&window.YT.Player){YT_=window.YT;go()}else{window.onYouTubeIframeAPIReady=()=>{YT_=window.YT;go()};const s=document.createElement("script");s.src="https://www.youtube.com/iframe_api";s.onerror=()=>rej(new Error("yt-load"));document.head.appendChild(s)}});return ypReady}
let YT_=null;
function ysc(e){if(!ymode)return;const S=window.YT.PlayerState;if(e.data===S.PLAYING){setIcons(true);fails=0;const d=yp.getDuration();if(d&&cur)cur.dur=d}else if(e.data===S.PAUSED)setIcons(false);else if(e.data===S.ENDED){if(rep){yp.seekTo(0);yp.playVideo()}else next()}}
function ytick(){if(!ymode||!yp||!yp.getCurrentTime)return;const c=yp.getCurrentTime()||0,d=yp.getDuration()||(cur&&cur.dur)||0,p=d?c/d*1000:0;[$("seek"),$("fSeek")].forEach(s=>{if(!s.dataset.d){s.value=p;rng(s,p/10)}});mprog(p/10);$("cur").textContent=$("fCur").textContent=fmt(c);$("dur").textContent=$("fDur").textContent=fmt(d);msPos(d,c)}
setInterval(ytick,500);
function showYt(on){const w=$("ytw"),v=!!(on&&cur&&cur.vid);w.hidden=!on;w.classList.toggle("vid",v);if(!on)w.classList.remove("big");else w.classList.toggle("big",v&&$("full").classList.contains("on"));$("fCv").style.visibility=v?"hidden":""}
function resolve(t){if(t.src==="YouTube")return Promise.resolve("");if(t.src!=="Audius")return Promise.resolve(t.url);
  return getJ(AUD+"/tracks/"+t.id.slice(1)+"/stream?no_redirect=true&"+aq()).then(j=>typeof j.data==="string"?j.data:t.url).catch(()=>t.url)}
function load(go){cur=Q[qi];if(!cur)return;const my=++tok;
  $("bar").classList.remove("hid");$("bCv").style.cssText=$("fCv").style.cssText=artCss(cur);mq($("bT"),cur.title);$("bA").textContent=$("fA").textContent=cur.artist;$("fT").textContent=cur.title;
  ST.recent=[cur].concat(ST.recent.filter(x=>x.id!==cur.id)).slice(0,20);save();document.title=cur.title+" · Notely";$("fLike").classList.toggle("on",isLiked(cur));paintBg();lyRefresh();mark();if($("full").classList.contains("on")&&lastQi>=0&&qi!==lastQi)slide(qi>lastQi?"sl":"sr");lastQi=qi;
  if("mediaSession" in navigator){try{navigator.mediaSession.metadata=new MediaMetadata({title:cur.title,artist:cur.artist,artwork:cur.art?[{src:cur.art,sizes:"480x480"}]:[]})}catch(e){}}
  if(cur.src==="YouTube"){au.pause();ymode=true;showYt(true);ensureYT().then(p=>{if(my!==tok)return;p.loadVideoById(cur.ytId);try{p.setVolume(ST.vol)}catch(e){}}).catch(()=>failTrack({name:"YouTube не загрузился"}));return}
  if(ymode){ymode=false;try{yp&&yp.pauseVideo()}catch(e){}showYt(false)}
  resolve(cur).then(u=>{if(my!==tok)return;return eqPrep(u).then(()=>{if(my!==tok)return;au.src=u;if(go)return au.play().then(()=>{fails=0}).catch(e=>failTrack(e))})})}
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
au.addEventListener("timeupdate",()=>{if(ymode)return;const d=au.duration||(cur&&cur.dur)||0,p=d?au.currentTime/d*1000:0;[$("seek"),$("fSeek")].forEach(s=>{if(!s.dataset.d){s.value=p;rng(s,p/10)}});mprog(p/10);$("cur").textContent=$("fCur").textContent=fmt(au.currentTime);$("dur").textContent=$("fDur").textContent=fmt(d);msPos(d,au.currentTime)});
[$("seek"),$("fSeek")].forEach(s=>{s.addEventListener("input",()=>{s.dataset.d=1;rng(s,s.value/10)});s.addEventListener("change",()=>{if(ymode&&yp){const d=yp.getDuration()||(cur&&cur.dur)||0;if(d)yp.seekTo(s.value/1000*d,true);delete s.dataset.d;return}const d=au.duration||(cur&&cur.dur)||0;if(d)au.currentTime=s.value/1000*d;delete s.dataset.d})});
$("vol").value=ST.vol;rng($("vol"),ST.vol);$("vol").addEventListener("input",function(){au.volume=this.value/100;ST.vol=+this.value;try{yp&&yp.setVolume(ST.vol)}catch(e){}rng(this,this.value);save()});
$("ppB").onclick=$("fPp").onclick=toggle;$("nxB").onclick=$("fNx").onclick=next;$("prB").onclick=$("fPr").onclick=prev;
$("shB").onclick=$("fSh").onclick=()=>{shuf=!shuf;$("shB").classList.toggle("on",shuf);$("fSh").classList.toggle("on",shuf);toast(shuf?"Перемешивание включено":"Перемешивание выключено")};
$("rpB").onclick=$("fRp").onclick=function(){rep=!rep;$("rpB").classList.toggle("on",rep);$("fRp").classList.toggle("on",rep);toast(rep?"Повтор трека включён":"Повтор выключен")};
$("fLike").onclick=e=>{if(cur)like(cur,e.currentTarget)};
let lastQi=-1;const slide=c=>{const e=$("fCv");e.classList.remove("sl","sr");void e.offsetWidth;e.classList.add(c)};
const openFull=()=>{if(!cur)return;$("full").classList.add("on");document.body.classList.add("fp");if(ymode)showYt(true)},closeFull=()=>{$("full").classList.remove("on");document.body.classList.remove("fp");if(ymode)showYt(true)};
$("nowB").onclick=openFull;$("clB").onclick=closeFull;
if("mediaSession" in navigator){const m=navigator.mediaSession;[["play",()=>{if(ymode&&yp)yp.playVideo();else au.play()}],["pause",()=>{if(ymode&&yp)yp.pauseVideo();else au.pause()}],["nexttrack",next],["previoustrack",prev],
  ["seekbackward",()=>seekBy(-10)],["seekforward",()=>seekBy(10)],["seekto",d=>seekTo(d.seekTime||0)]].forEach(a=>{try{m.setActionHandler(a[0],a[1])}catch(e){}})}
function seekTo(t){try{if(ymode&&yp)yp.seekTo(t,true);else au.currentTime=t}catch(e){}}
function seekBy(s){try{const c=ymode&&yp?yp.getCurrentTime():au.currentTime;seekTo(Math.max(0,c+s))}catch(e){}}
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
const rowH=(t,k,i)=>'<div class="row" data-id="'+esc(t.id)+'"><div class="cv" style="'+artCss(t)+'">'+EQM+'</div><button class="t" data-k="'+k+'" data-i="'+i+'"><b>'+esc(t.title)+'</b><span>'+esc(t.artist)+' · '+t.src+'</span></button><time>'+fmt(t.dur)+'</time>'+heart(t,k,i)+'<button class="more" data-k="'+k+'" data-i="'+i+'" aria-label="Ещё"><svg class="i" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg></button></div>';
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
/* ---- подсказки в поиске ---- */
const addHist=q=>{q=String(q).trim();if(!q)return;ST.hist=[q].concat((ST.hist||[]).filter(x=>x.toLowerCase()!==q.toLowerCase())).slice(0,8);save()};
let jc=0,sgT=0,sgTok=0;
const jsonp=url=>new Promise((res,rej)=>{const n="__sg"+(++jc),sc=document.createElement("script"),fin=()=>{delete window[n];sc.remove()};window[n]=d=>{fin();res(d)};sc.onerror=()=>{fin();rej()};sc.src=url+"&jsonp="+n;document.head.appendChild(sc);setTimeout(()=>{if(window[n]){fin();rej()}},3500)});
const ytSug=q=>jsonp("https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&hl=ru&q="+encodeURIComponent(q)).then(d=>(d&&d[1]||[]).map(x=>Array.isArray(x)?x[0]:x).filter(x=>typeof x==="string"&&x).slice(0,6));
const SG_I={h:'<svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',l:'<svg class="i" viewBox="0 0 24 24"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>',s:'<svg class="i" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>'};
const sgRow=(x,t)=>'<div class="sgr"><button class="sgi" data-s="'+esc(x)+'">'+SG_I[t]+'<span>'+esc(x)+'</span></button><button class="sgf" data-f="'+esc(x)+'" aria-label="Вставить в поиск"><svg class="i" viewBox="0 0 24 24"><path d="M17 17L7 7M7 15V7h8"/></svg></button></div>';
function paintSg(list,head){const g=$("sg");if(!g)return;g.innerHTML=(head||"")+list.map(a=>sgRow(a[0],a[1])).join("");$("sres").style.display=(list.length||head)?"none":""}
function updSg(){const q=$("q").value.trim(),my=++sgTok;clearTimeout(sgT);
  if(!q){const h=ST.hist||[];paintSg(h.map(x=>[x,"h"]),h.length?'<div class="sgh"><span>Недавние поиски</span><button id="sgClr">Очистить</button></div>':"");return}
  const lo=q.toLowerCase(),has=(a,x)=>a.some(y=>y[0].toLowerCase()===x.toLowerCase()),loc=[];
  (ST.hist||[]).forEach(x=>{if(x.toLowerCase().includes(lo)&&x.toLowerCase()!==lo)loc.push([x,"h"])});
  ST.likes.concat(ST.recent).forEach(t=>{[t.artist,t.title].forEach(x=>{if(x&&x.length<60&&x.toLowerCase().includes(lo)&&x.toLowerCase()!==lo&&!has(loc,x))loc.push([x,"l"])})});
  const l4=loc.slice(0,4);paintSg(l4);
  sgT=setTimeout(()=>ytSug(q).then(r=>{if(my!==sgTok)return;const all=l4.slice();r.forEach(x=>{if(x.toLowerCase()!==lo&&!has(all,x))all.push([x,"s"])});paintSg(all.slice(0,8))}).catch(()=>{}),180)}
function doSearch(q){addHist(q);const sgE=$("sg");if(sgE)sgE.innerHTML="";const g=$("sres");g.style.display="";g.innerHTML='<div class="sk" style="height:56px;margin-bottom:10px"></div>'.repeat(6);
  settle([ytSearch(q),audSearch(q),jamSearch(q)]).then(rs=>{SR={q:q,rs:rs,w:warn(rs)};renderSr()})}
let SR=null;
const NOISE=/(podcast|подкаст|interview|интервью|reaction|reacts? to|review|обзор|tutorial|урок|trailer|трейлер|gameplay|walkthrough|news|новости|live\s*stream|стрим|compilation|сборник|full album|playlist|type beat|karaoke|караоке|nightcore|8d audio|\d+\s*(hours?|час)|\bhours?\b|shorts?\b|asmr)/i;
const VERS=/(remix|ремикс|cover|кавер|slowed|sped\s*up|reverb|mashup|мэшап|instrumental|минус|bass\s*boost|acoustic version|tribute|rework|bootleg|edit\b)/i;
const words=s=>String(s).toLowerCase().split(/[^a-zа-яё0-9]+/i).filter(w=>w.length>1);
function cleanRes(list,q,yt){const qw=words(q),qs=q.toLowerCase();
  let r=list.filter(t=>{const h=(t.title+" "+t.artist).toLowerCase();
    if(t.dur&&(t.dur<45||t.dur>(yt?900:1200)))return false;
    if(NOISE.test(h)&&!NOISE.test(qs))return false;
    if(ST.orig&&VERS.test(h)&&!VERS.test(qs))return false;return true});
  if(qw.length){const need=Math.max(1,Math.ceil(qw.length*.6)),rel=r.filter(t=>{const h=(t.title+" "+t.artist).toLowerCase();return qw.filter(w=>h.indexOf(w)>=0).length>=need});if(rel.length>=1)r=rel}
  return r.length>=1?r:list.filter(t=>!NOISE.test((t.title+" "+t.artist).toLowerCase()))}
function renderSr(){if(!SR||!$("sres"))return;const g=$("sres"),q=SR.q,rs=SR.rs;
  const fr=merge([rs[1],rs[2]]),yr=rs[0].ok?rs[0].v:[];
  const free=ST.sf==="yt"?[]:cleanRes(fr,q,false),yt=ST.sf==="free"?[]:cleanRes(yr,q,true),f1=free.slice(0,8),l=f1.concat(yt,free.slice(8));lists.search=l;
  const hd=t=>'<h3 class="gh">'+t+'</h3>';
  const chip=(k,t)=>'<button class="chip'+(ST.sf===k?" on":"")+'" data-sf="'+k+'">'+t+'</button>';
  const bar='<div class="chips" id="sfb">'+chip("all","Всё")+chip("free","Без рекламы")+chip("yt","YouTube")+'<button class="chip'+(ST.orig?" on":"")+'" data-orig="1">Только оригиналы</button></div>';
  g.innerHTML=bar+(SR.w?'<p class="msg" style="margin-bottom:10px">'+SR.w+'</p>':"")+(l.length?l.map((t,i)=>(i===0&&f1.length&&ST.sf==="all"?hd("Без рекламы"):"")+(i===f1.length&&yt.length&&ST.sf==="all"?hd("YouTube · может быть реклама"):"")+rowH(t,"search",i)).join(""):'<p class="msg">По запросу «'+esc(q)+'» ничего нет. Попробуй другое слово или выключи «Только оригиналы».</p>');mark()}
const GEN=[["Электроника","Electronic",24],["Хип-хоп","Hip-Hop",350],["Лоу-фай","lofi",160],["Рок","rock",8],["Поп","pop",320],["Джаз","jazz",40],["Классика","classical",215],["Инди","indie",280]];
function search(){main.innerHTML='<div class="pg px"><h1>Поиск</h1><label class="sb"><svg class="i" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input id="q" type="search" placeholder="Песня, исполнитель, жанр" enterkeyhint="search" autocomplete="off" autocorrect="off" spellcheck="false"></label><div id="sg"></div><div id="sres"><h2 style="margin-top:22px">Жанры</h2><div class="gen">'+GEN.map(g=>'<button class="g" data-g="'+g[1]+'" style="background:hsl('+g[2]+' 62% 38%)">'+g[0]+'</button>').join("")+'</div></div></div>';
  const q=$("q");q.addEventListener("keydown",e=>{if(e.key==="Enter"&&q.value.trim()){q.blur();doSearch(q.value.trim())}});
  q.addEventListener("input",updSg);q.addEventListener("focus",()=>{if(!q.value.trim())updSg()})}
let libTab="likes";
function lib(){const pl=ST.pls||[];let p=null;if(/^p:/.test(libTab)){p=pl.find(x=>"p:"+x.id===libTab);if(!p)libTab="likes"}
  const arr=p?p.tracks:libTab==="likes"?ST.likes:ST.recent;lists.lib=arr;
  const chips='<div class="chips"><button class="chip'+(libTab==="likes"?" on":"")+'" data-c="likes">Любимое</button><button class="chip'+(libTab==="recent"?" on":"")+'" data-c="recent">Недавние</button>'+pl.map(x=>'<button class="chip'+(libTab==="p:"+x.id?" on":"")+'" data-c="p:'+x.id+'">'+esc(x.name)+'</button>').join("")+'<button class="chip" data-c="new" aria-label="Новый плейлист">＋ Плейлист</button></div>';
  const empty=p?"В плейлисте пока пусто. Нажми «⋯» у любого трека и добавь его сюда.":libTab==="likes"?"Здесь пока пусто. Нажми сердечко у трека, и он появится тут.":"Ты пока ничего не слушал.";
  main.innerHTML='<div class="pg px"><h1>'+(p?esc(p.name):"Библиотека")+'</h1>'+chips+(p?'<div class="pt"><button class="btn g2" id="plRn">Переименовать</button><button class="btn g2" id="plDl">Удалить</button></div>':"")+
   (arr.length?'<button class="btn" id="plAll" style="margin:4px 0 12px">'+PLAY+'Играть всё</button>'+arr.map((t,i)=>rowH(t,"lib",i)).join(""):'<p class="msg">'+empty+'</p>')+'</div>';
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
  const sfc=e.target.closest("[data-sf]");if(sfc){ST.sf=sfc.dataset.sf;save();renderSr();return}
  if(e.target.closest("[data-orig]")){ST.orig=!ST.orig;save();renderSr();return}
  const mo=e.target.closest(".more");if(mo){openTs(lists[mo.dataset.k][+mo.dataset.i]);return}
  if(e.target.closest("#plRn")){const p=(ST.pls||[]).find(x=>"p:"+x.id===libTab);if(p)nameForm("Переименовать",p.name,v=>{p.name=v;save();shClose();lib()});return}
  if(e.target.closest("#plDl")){const p=(ST.pls||[]).find(x=>"p:"+x.id===libTab);if(p){shMode="d";shOpen("Удалить «"+p.name+"»?",'<p class="hint">Треки останутся в каталоге, пропадёт только список.</p><button class="mi dg" data-a="delY">Удалить плейлист</button><button class="mi" data-a="cancel">Отмена</button>')}return}
  const lk=e.target.closest(".like");if(lk){const t=lists[lk.dataset.k][+lk.dataset.i];like(t,lk);const on=isLiked(t);lk.classList.toggle("on",on);const sv=lk.querySelector("svg");if(sv)sv.style.fill=on?"currentColor":"none";return}
  if(e.target.closest(".circ")){playLikes();return}
  if(e.target.closest("#lkB")){libTab="likes";show("lib");return}
  const al=e.target.closest("[data-all]");if(al){const l=lists[al.dataset.all];if(l&&l.length)play(l,0);return}
  const ch=e.target.closest(".chip");if(ch){if(ch.dataset.c==="new"){nameForm("Новый плейлист","",v=>{const p={id:uid(),name:v,tracks:[]};ST.pls.push(p);libTab="p:"+p.id;save();shClose();lib()});return}libTab=ch.dataset.c;lib();return}
  const sg=e.target.closest(".sgi");if(sg){const v=sg.dataset.s;$("q").value=v;$("q").blur();doSearch(v);return}
  const sf=e.target.closest(".sgf");if(sf){$("q").value=sf.dataset.f;$("q").focus();updSg();return}
  if(e.target.closest("#sgClr")){ST.hist=[];save();updSg();return}
  const g=e.target.closest(".g");if(g){$("q").value=g.textContent;doSearch(g.dataset.g);return}
  const b=e.target.closest("[data-k]");if(b)play(lists[b.dataset.k],+b.dataset.i)});
/* после клавиатуры страница возвращается на место, без сдвига и приближения */
const resetView=()=>{try{window.scrollTo(0,0);document.documentElement.scrollLeft=0;document.body.scrollLeft=0;$("app").scrollLeft=0}catch(e){}};
document.addEventListener("focusout",()=>{setTimeout(resetView,60);setTimeout(resetView,350)});
document.addEventListener("focusin",()=>setTimeout(resetView,60));
if(window.visualViewport)visualViewport.addEventListener("resize",()=>{if(Math.abs(visualViewport.scale-1)>.01)resetView()});
/* без приближения щипком и двойным касанием */
["gesturestart","gesturechange","gestureend"].forEach(n=>document.addEventListener(n,e=>e.preventDefault()));
/* ---- свайпы ---- */
const buzz=()=>{try{navigator.vibrate&&navigator.vibrate(10)}catch(e){}};
function swipe(el,o){let sx=0,sy=0,id=null,dx=0,dy=0,ax=null;
  el.addEventListener("pointerdown",e=>{if(e.pointerType==="mouse"||e.target.closest("input,select,textarea")||(o.skip&&e.target.closest(o.skip))){id=null;return}id=e.pointerId;sx=e.clientX;sy=e.clientY;dx=dy=0;ax=null});
  el.addEventListener("pointermove",e=>{if(id!==e.pointerId)return;dx=e.clientX-sx;dy=e.clientY-sy;if(!ax&&(Math.abs(dx)>10||Math.abs(dy)>10))ax=Math.abs(dx)>Math.abs(dy)?"x":"y"});
  el.addEventListener("pointerup",e=>{if(id!==e.pointerId)return;id=null;const m=o.min||60;let f=null;
    if(ax==="x"&&Math.abs(dx)>m&&Math.abs(dx)>Math.abs(dy)*1.4)f=dx<0?o.left:o.right;
    else if(ax==="y"&&Math.abs(dy)>m&&Math.abs(dy)>Math.abs(dx)*1.4)f=dy<0?o.up:o.down;
    if(f){buzz();const k=ev=>{ev.stopPropagation();ev.preventDefault()};el.addEventListener("click",k,{capture:true,once:true});setTimeout(()=>el.removeEventListener("click",k,true),400);f()}});
  el.addEventListener("pointercancel",()=>{id=null})}
swipe($("full"),{left:next,right:prev,down:closeFull,min:70});
$("grab").onclick=closeFull;
swipe($("bar"),{left:next,right:prev,up:openFull,min:50});
const TABS=["home","search","lib"],goTab=d=>{const i=TABS.indexOf(view)+d;if(i>=0&&i<TABS.length)show(TABS[i])};
swipe(main,{left:()=>goTab(1),right:()=>goTab(-1),skip:".shelf,.chips,.sb",min:70});

/* волна при нажатии */
document.addEventListener("pointerdown",e=>{const b=e.target.closest("button");if(!b)return;const r=b.getBoundingClientRect(),d=Math.max(r.width,r.height),s=document.createElement("span");s.className="rpl";s.style.cssText="width:"+d+"px;height:"+d+"px;left:"+(e.clientX-r.left-d/2)+"px;top:"+(e.clientY-r.top-d/2)+"px";b.appendChild(s);setTimeout(()=>s.remove(),650)});
/* настройки */
const APP_VER="2.4";
$("ver").textContent=APP_VER;
$("setX").onclick=$("setNo").onclick=()=>$("set").classList.remove("on");
$("updB").onclick=async()=>{const b=$("updB");b.disabled=true;b.textContent="Обновляю…";try{if("serviceWorker" in navigator){const rs=await navigator.serviceWorker.getRegistrations();await Promise.all(rs.map(r=>r.unregister()))}if("caches" in window){const ks=await caches.keys();await Promise.all(ks.map(k=>caches.delete(k)))}}catch(e){}location.replace(location.pathname+"?v="+Date.now())};
$("setB").onclick=()=>{eqUI();$("liteS").value=ST.lite||"auto";$("thS").value=ST.theme||"cover";$("yk").value=ST.yk;$("jk").value=ST.jk;$("set").classList.add("on")};
$("setNo").onclick=()=>$("set").classList.remove("on");
$("setOk").onclick=()=>{ST.yk=$("yk").value.trim();ST.jk=$("jk").value.trim();ST.lite=$("liteS").value;ST.theme=$("thS").value;applyTheme();paintBg();applyLite(ST.lite==="on"||(ST.lite==="auto"&&liteAuto()));save();$("set").classList.remove("on");toast("Сохранено");show(view)};
$("set").addEventListener("click",e=>{if(e.target===$("set"))$("set").classList.remove("on")});

/* ---------- шторка: очередь и плейлисты ---------- */
const shEl=$("shW"),shB=$("shBd"),shT=$("shTt");let shMode="",tsT=null,nfOk=null;
const uid=()=>"p"+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
const shOpen=(t,h)=>{shT.textContent=t;shB.innerHTML=h;shEl.classList.add("on")},shClose=()=>{shEl.classList.remove("on");shMode=""};
function openQ(){shMode="q";const h=Q.length?Q.map((t,i)=>'<div class="qr'+(i===qi?' cur':'')+'"><div class="cv" style="'+artCss(t)+'"></div><button class="t" data-qp="'+i+'"><b>'+esc(t.title)+'</b><span>'+esc(t.artist)+'</span></button>'+(i===qi?'<em>играет</em>':(i!==qi+1?'<button class="qb" data-qn="'+i+'" aria-label="Играть следующим">↑</button>':'')+'<button class="qb" data-qx="'+i+'" aria-label="Убрать">✕</button>')+'</div>').join(""):'<p class="msg">Очередь пустая. Включи любой трек.</p>';shOpen("Очередь",h);const c=shB.querySelector(".cur");if(c)c.scrollIntoView({block:"center"})}
function openTs(t){tsT=t;shMode="t";const pl=ST.pls||[];shOpen(t.title,'<button class="mi" data-a="nx">Играть следующим</button><button class="mi" data-a="end">В конец очереди</button>'+(pl.length?'<div class="mh">Плейлисты</div>':"")+pl.map(p=>'<button class="mi" data-a="pl" data-p="'+p.id+'"><span>'+esc(p.name)+'</span><i>'+(p.tracks.some(x=>x.id===t.id)?"✓":"")+'</i></button>').join("")+'<button class="mi ac" data-a="new">＋ Новый плейлист</button>')}
function nameForm(t,v,ok){shMode="f";nfOk=ok;shOpen(t,'<form id="nf"><input id="nfi" maxlength="40" placeholder="Название" value="'+esc(v||"")+'" autocomplete="off"><button class="btn" type="submit">Готово</button></form>');setTimeout(()=>{try{$("nfi").focus()}catch(e){}},60)}
shEl.addEventListener("submit",e=>{e.preventDefault();const v=$("nfi").value.trim();if(v&&nfOk)nfOk(v)});
shEl.addEventListener("click",e=>{
  if(e.target.closest(".bk")||e.target.closest("#shX")){shClose();return}
  const qp=e.target.closest("[data-qp]");if(qp){qi=+qp.dataset.qp;load(true);openQ();return}
  const qx=e.target.closest("[data-qx]");if(qx){const i=+qx.dataset.qx;Q.splice(i,1);if(i<qi)qi--;openQ();return}
  const qn=e.target.closest("[data-qn]");if(qn){const i=+qn.dataset.qn,t=Q.splice(i,1)[0];if(i<qi)qi--;Q.splice(qi+1,0,t);openQ();return}
  const a=e.target.closest("[data-a]");if(!a)return;const k=a.dataset.a;
  if(k==="cancel"){shClose();return}
  if(k==="delY"){ST.pls=ST.pls.filter(x=>"p:"+x.id!==libTab);libTab="likes";save();shClose();lib();return}
  if(k==="nx"){if(!Q.length)play([tsT],0);else Q.splice(qi+1,0,tsT);toast("Сыграет следующим");shClose();return}
  if(k==="end"){if(!Q.length)play([tsT],0);else Q.push(tsT);toast("Добавлено в очередь");shClose();return}
  if(k==="new"){const t=tsT;nameForm("Новый плейлист","",v=>{ST.pls.push({id:uid(),name:v,tracks:[t]});save();toast("Плейлист создан");shClose();if(view==="lib")lib()});return}
  if(k==="pl"){const p=ST.pls.find(x=>x.id===a.dataset.p);if(!p)return;const i=p.tracks.findIndex(x=>x.id===tsT.id);if(i>=0)p.tracks.splice(i,1);else p.tracks.unshift(tsT);save();openTs(tsT);if(view==="lib")lib()}});
$("fQ").onclick=openQ;

/* ---------- тексты песен (lrclib.net) ---------- */
const LY={};let lyOn=false,lyL=null,lyI=-1,lyTm=0,lyTok=0;
const lrc=s=>String(s).split("\n").map(l=>{const m=l.match(/^\[(\d+):(\d+(?:\.\d+)?)\]\s*(.*)$/);return m&&m[3].trim()?{t:+m[1]*60+ +m[2],s:m[3].trim()}:null}).filter(Boolean);
function lyGet(t){if(LY[t.id]!==undefined)return Promise.resolve(LY[t.id]);
  const q=(t.title+" "+String(t.artist||"").replace(/\s*-\s*Topic$/i,"")).trim();
  return getJ("https://lrclib.net/api/search?q="+encodeURIComponent(q)).then(r=>{
    let c=(r||[]).filter(x=>x.syncedLyrics||x.plainLyrics&&!x.instrumental);
    if(t.dur)c.sort((x,y)=>Math.abs(x.duration-t.dur)-Math.abs(y.duration-t.dur));
    c=c.filter(x=>!t.dur||!x.duration||Math.abs(x.duration-t.dur)<20);
    const s=c.find(x=>x.syncedLyrics),p=c.find(x=>x.plainLyrics);
    const o=s?{sync:lrc(s.syncedLyrics)}:p?{plain:String(p.plainLyrics).split("\n").filter(x=>x.trim())}:null;LY[t.id]=o;return o})}
const lyEl=()=>$("lyIn");
function lyPaint(o){lyL=null;lyI=-1;const e=lyEl();
  if(o===undefined){e.innerHTML='<p class="lm">Ищу текст…</p>';return}
  if(!o){e.innerHTML='<p class="lm">Текста для этой песни нет.</p>';return}
  if(o.sync&&o.sync.length){lyL=o.sync;e.innerHTML=o.sync.map((l,i)=>'<p data-t="'+l.t+'" data-n="'+i+'">'+esc(l.s)+'</p>').join("")}
  else e.innerHTML=(o.plain||[]).map(l=>'<p class="pl">'+esc(l)+'</p>').join("");e.scrollTop=0}
function lyRefresh(){if(!lyOn||!cur)return;const t=cur;lyPaint(undefined);lyGet(t).then(o=>{if(cur===t&&lyOn)lyPaint(o)},()=>{if(cur===t&&lyOn)lyEl().innerHTML='<p class="lm">Не получилось загрузить текст.</p>'})}
function lyTick(){if(!lyL)return;let c=0;try{c=ymode&&yp&&yp.getCurrentTime?yp.getCurrentTime():au.currentTime}catch(e){}c+=.25;let k=-1;for(let i=0;i<lyL.length;i++){if(lyL[i].t<=c)k=i;else break}
  if(k===lyI)return;lyI=k;const e=lyEl();e.querySelectorAll("p.on").forEach(x=>x.classList.remove("on"));const p=e.querySelector('[data-n="'+k+'"]');if(p){p.classList.add("on");e.scrollTo({top:p.offsetTop-e.clientHeight/2+p.clientHeight/2,behavior:"smooth"})}}
$("fLy").onclick=()=>{lyOn=!lyOn;$("full").classList.toggle("ly",lyOn);document.body.classList.toggle("ly",lyOn);$("fLy").classList.toggle("on",lyOn);clearInterval(lyTm);if(lyOn){lyRefresh();lyTm=setInterval(lyTick,250)}};
$("lyIn").addEventListener("click",e=>{const p=e.target.closest("p[data-t]");if(!p)return;const t=+p.dataset.t;try{if(ymode&&yp)yp.seekTo(t,true);else au.currentTime=t}catch(x){}});

/* ---------- тема ---------- */
const applyTheme=()=>{document.documentElement.dataset.th=ST.theme||"cover";const m=document.querySelector('meta[name=theme-color]');if(m)m.content=ST.theme==="light"?"#f4f4f6":"#111111"};
applyTheme();

/* ---------- эквалайзер (только для треков не из YouTube) ---------- */
let ac=null,eqN=null;
ST.eqv=Array.isArray(ST.eqv)&&ST.eqv.length===3?ST.eqv:[0,0,0];
const eqOn=()=>ST.eqv.some(v=>v!==0);
function eqPrep(u){if(!eqOn()&&!ac){au.removeAttribute("crossorigin");return Promise.resolve()}
  const c=new AbortController();
  return fetch(u,{mode:"cors",signal:c.signal}).then(()=>{c.abort();au.crossOrigin="anonymous"},()=>{au.removeAttribute("crossorigin");if(eqOn())toast(ac?"Для этого источника эквалайзер не работает, будет тихо. Поставь «Выкл» и перезапусти":"Для этого источника эквалайзер не работает")})}
function eqInit(){if(ac||au.crossOrigin!=="anonymous")return;try{const C=window.AudioContext||window.webkitAudioContext;ac=new C();const s=ac.createMediaElementSource(au),f=(t,fr,q)=>{const n=ac.createBiquadFilter();n.type=t;n.frequency.value=fr;if(q)n.Q.value=q;return n},lo=f("lowshelf",150),mi=f("peaking",1500,.9),hi=f("highshelf",6000);s.connect(lo);lo.connect(mi);mi.connect(hi);hi.connect(ac.destination);eqN=[lo,mi,hi]}catch(e){ac=null;eqN=null}}
function eqApply(){if(!eqN)return;eqN.forEach((n,i)=>{n.gain.value=ST.eqv[i]});try{ac.resume()}catch(e){}}
au.addEventListener("playing",()=>{if(eqOn()||ac){eqInit();eqApply()}});
const EQP={off:[0,0,0],bass:[7,0,-1],vocal:[-2,4,2],bright:[-1,1,6],night:[3,-2,-3]};
const eqUI=()=>{["eqB","eqM","eqT"].forEach((id,i)=>{$(id).value=ST.eqv[i];$(id+"v").textContent=(ST.eqv[i]>0?"+":"")+ST.eqv[i]});const k=Object.keys(EQP).find(k=>EQP[k].every((v,i)=>v===ST.eqv[i]));$("eqS").value=k||"custom"};
const eqSet=v=>{const was=eqOn();ST.eqv=v;save();eqUI();if(ac){eqApply()}else if(!was&&eqOn()&&cur&&cur.src!=="YouTube")toast("Эквалайзер включится со следующего трека");if(ac&&!eqN)eqInit()};
$("eqS").onchange=function(){if(EQP[this.value])eqSet(EQP[this.value].slice())};
["eqB","eqM","eqT"].forEach((id,i)=>$(id).addEventListener("input",function(){const v=ST.eqv.slice();v[i]=+this.value;eqSet(v)}));

/* музыка из YouTube не должна замолкать, когда выходишь из приложения */
let bgTm=[];
const bgKeep=()=>{bgTm.forEach(clearTimeout);bgTm=[];if(!ymode||!yp||!document.hidden)return;let on=false;try{on=yp.getPlayerState()===1||wantYt}catch(e){}
  if(!on)return;[250,700,1500,3000,6000].forEach(ms=>bgTm.push(setTimeout(()=>{try{if(document.hidden&&ymode&&yp.getPlayerState()!==1&&wantYt)yp.playVideo()}catch(e){}},ms)))};
let wantYt=false;
document.addEventListener("visibilitychange",()=>{if(document.hidden){try{wantYt=ymode&&yp&&yp.getPlayerState()===1}catch(e){wantYt=false}bgKeep()}else{bgTm.forEach(clearTimeout)}});
addEventListener("pagehide",()=>{try{wantYt=ymode&&yp&&yp.getPlayerState()===1}catch(e){}bgKeep()});
const applyLite=on=>{document.documentElement.classList.toggle("lite",!!on);BG.lite(!!on)};
const liteAuto=()=>{try{return matchMedia("(prefers-reduced-motion: reduce)").matches||(navigator.deviceMemory&&navigator.deviceMemory<=3)||(navigator.hardwareConcurrency&&navigator.hardwareConcurrency<=2)}catch(e){return false}};
applyLite(ST.lite==="on"||(ST.lite!=="off"&&liteAuto()));
if(ST.lite==="auto")BG.onSlow(()=>{applyLite(true)});
BG.init();
show("home");setTimeout(moveInd,300);if(document.fonts&&document.fonts.ready)document.fonts.ready.then(moveInd);
if("serviceWorker" in navigator&&location.protocol.startsWith("http")){navigator.serviceWorker.register("sw.js").catch(()=>{})}
})();
