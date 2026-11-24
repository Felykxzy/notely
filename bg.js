/* Живые фоны Notely: рисуются на маленьком холсте и плавно растягиваются на экран.
   window.BG.set(имя) — выбрать фон, BG.color(h1,h2) — цвета, BG.play(true/false) — оживить/успокоить. */
(function(){
"use strict";
var TAU=Math.PI*2,S={};
function rnd(n){var x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)}
function hsl(h,s,l,a){return"hsla("+(((h%360)+360)%360)+","+s+"%,"+l+"%,"+(a==null?1:a)+")"}
var SC={
 fluid:{name:"Жидкость",desc:"Мягкие цветные пятна",draw:function(c,w,h,t,A,B,e){c.fillStyle=hsl(A,55,9);c.fillRect(0,0,w,h);c.globalCompositeOperation="lighter";
  for(var i=0;i<6;i++){var x=w*(.5+.42*Math.sin(t*.23+i*1.9)),y=h*(.5+.4*Math.cos(t*.19+i*2.7)),r=Math.max(w,h)*(.32+.07*Math.sin(t*.5+i)+e*.05),g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,hsl(i%2?A:B,85,52,.55));g.addColorStop(1,hsl(i%2?A:B,85,52,0));c.fillStyle=g;c.fillRect(0,0,w,h)}c.globalCompositeOperation="source-over"}},
 waves:{name:"Волны",desc:"Слои как океан",draw:function(c,w,h,t,A,B,e){var g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,hsl(A,60,14));g.addColorStop(1,hsl(B,60,8));c.fillStyle=g;c.fillRect(0,0,w,h);
  for(var k=0;k<6;k++){c.beginPath();c.moveTo(0,h);var amp=h*(.04+.012*k)*(1+e*.5),base=h*(.45+k*.1);for(var x=0;x<=w;x+=3){c.lineTo(x,base+Math.sin(x/w*TAU*(1.3+k*.25)+t*(.5+k*.14)*(k%2?1:-1))*amp+Math.sin(x/w*TAU*3+t*.7+k)*amp*.35)}c.lineTo(w,h);c.closePath();c.fillStyle=hsl(k%2?A:B,70,48-k*4,.22+k*.05);c.fill()}}},
 bokeh:{name:"Боке",desc:"Огоньки в тёплой дымке",draw:function(c,w,h,t,A,B,e){var g=c.createLinearGradient(0,0,w,h);g.addColorStop(0,hsl(A,50,10));g.addColorStop(1,hsl(B,50,14));c.fillStyle=g;c.fillRect(0,0,w,h);c.globalCompositeOperation="lighter";
  for(var i=0;i<26;i++){var sp=.2+rnd(i)*.5,x=((rnd(i+9)*w+t*sp*8*(i%2?1:-1))%w+w)%w,y=((rnd(i+3)*h-t*sp*10)%h+h)%h,r=(.05+rnd(i+5)*.12)*Math.min(w,h)*(1+e*.12),gg=c.createRadialGradient(x,y,0,x,y,r);gg.addColorStop(0,hsl(i%3?A:B,90,62,.5));gg.addColorStop(.7,hsl(i%3?A:B,90,60,.16));gg.addColorStop(1,hsl(A,90,60,0));c.fillStyle=gg;c.beginPath();c.arc(x,y,r,0,TAU);c.fill()}c.globalCompositeOperation="source-over"}},
 sunset:{name:"Закат",desc:"Солнце и полосы света",draw:function(c,w,h,t,A,B,e){var g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,hsl(B,60,14));g.addColorStop(.55,hsl(A,80,38));g.addColorStop(1,hsl(A+30,85,60));c.fillStyle=g;c.fillRect(0,0,w,h);
  var sy=h*.58+Math.sin(t*.2)*h*.015,sr=Math.min(w,h)*(.2+e*.01);var sg=c.createRadialGradient(w/2,sy,0,w/2,sy,sr*2.4);sg.addColorStop(0,hsl(A+40,100,78,.9));sg.addColorStop(.4,hsl(A+20,100,65,.35));sg.addColorStop(1,hsl(A,100,60,0));c.fillStyle=sg;c.fillRect(0,0,w,h);c.fillStyle=hsl(A+45,100,82);c.beginPath();c.arc(w/2,sy,sr,0,TAU);c.fill();
  for(var i=0;i<9;i++){var y=sy+sr*.2+i*i*h*.0075+((t*3*(i+1)*.3)%4);c.fillStyle=hsl(B,60,12,.6);c.fillRect(0,y,w,1+i*.7)}}},
 aurora:{name:"Лента",desc:"Северное сияние",draw:function(c,w,h,t,A,B,e){var g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,hsl(B,50,6));g.addColorStop(1,hsl(A,50,12));c.fillStyle=g;c.fillRect(0,0,w,h);c.globalCompositeOperation="lighter";
  for(var k=0;k<4;k++){var col=k%2?A:B;for(var x=0;x<w;x+=2){var y=h*(.3+.08*k)+Math.sin(x/w*TAU*1.2+t*(.3+k*.1)+k*2)*h*.1+Math.sin(x/w*TAU*2.7-t*.4)*h*.04,len=h*(.28+.06*Math.sin(x/w*9+t+k)+e*.04),gg=c.createLinearGradient(0,y-len,0,y+len*.3);gg.addColorStop(0,hsl(col,90,60,0));gg.addColorStop(.7,hsl(col,90,60,.2));gg.addColorStop(1,hsl(col,90,60,0));c.fillStyle=gg;c.fillRect(x,y-len,2,len*1.3)}}c.globalCompositeOperation="source-over"}},
 rain:{name:"Дождь",desc:"Тёплое окно в дождь",draw:function(c,w,h,t,A,B,e){var g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,hsl(A,35,8));g.addColorStop(1,hsl(B,40,16));c.fillStyle=g;c.fillRect(0,0,w,h);c.globalCompositeOperation="lighter";
  for(var i=0;i<14;i++){var x=rnd(i+40)*w,y=h*.65+rnd(i+7)*h*.3,r=h*(.05+rnd(i)*.08),gg=c.createRadialGradient(x,y,0,x,y,r);gg.addColorStop(0,hsl(i%2?A:B,90,60,.35));gg.addColorStop(1,hsl(A,90,60,0));c.fillStyle=gg;c.beginPath();c.arc(x,y,r,0,TAU);c.fill()}
  c.globalCompositeOperation="source-over";c.lineCap="round";for(var j=0;j<70;j++){var sp=.5+rnd(j)*.7,x2=rnd(j+80)*w*1.2,y2=((rnd(j+2)*h+t*h*.5*sp)%(h+20))-10,l=h*.06*sp;c.strokeStyle="rgba(255,255,255,"+(.08+rnd(j+5)*.14)+")";c.lineWidth=.8;c.beginPath();c.moveTo(x2-y2*.15,y2);c.lineTo(x2-y2*.15-l*.15,y2+l);c.stroke()}}}
};
var cv,ctx,W=0,H=0,cur="fluid",target={a:330,b:30},val={a:330,b:30},energy=0,playing=false,t=0,last=0,raf=0,mode="auto",lastAuto="";
function size(){cv=cv||document.getElementById("bg");var q=cv.id==="bg"?.28:1;var w=Math.max(80,Math.round(innerWidth*q)),h=Math.max(120,Math.round(innerHeight*q));if(w!==cv.width||h!==cv.height){cv.width=w;cv.height=h}W=cv.width;H=cv.height}
function dh(a,b){var d=((b-a+540)%360)-180;return d}
function frame(ts){raf=requestAnimationFrame(frame);var dt=Math.min(.05,(ts-last)/1000||0);last=ts;
  energy+=((playing?1:0)-energy)*Math.min(1,dt*2);t+=dt*(.35+energy*.9);
  val.a+=dh(val.a,target.a)*Math.min(1,dt*1.4);val.b+=dh(val.b,target.b)*Math.min(1,dt*1.4);
  var beat=energy*(.5+.5*Math.sin(ts/1000*TAU*1.9));SC[cur].draw(ctx,W,H,t,val.a,val.b,beat);}
function start(){if(raf)return;last=performance.now();raf=requestAnimationFrame(frame)}
function stop(){cancelAnimationFrame(raf);raf=0}
var BG={scenes:SC,
 init:function(){size();ctx=cv.getContext("2d");addEventListener("resize",size);document.addEventListener("visibilitychange",function(){document.hidden?stop():start()});
  if(matchMedia("(prefers-reduced-motion: reduce)").matches){t=3;SC[cur].draw(ctx,W,H,t,val.a,val.b,0);return}start()},
 set:function(n){if(SC[n]){cur=n}},get:function(){return cur},
 color:function(a,b){target.a=a;target.b=b},play:function(p){playing=p},
 thumb:function(cvs,n){var c=cvs.getContext("2d");cvs.width=110;cvs.height=140;SC[n].draw(c,110,140,4.2,330,25,.6);return SC[n]}
};
window.BG=BG;
})();
