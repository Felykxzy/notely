/* Фон Notely, как в Apple Music: большие мягкие цветные пятна плавно плывут за плеером.
   Цвета берутся с обложки трека: BG.palette([[r,g,b], ...]). BG.play(true/false) оживляет или успокаивает. */
(function(){
"use strict";
var TAU=Math.PI*2,cv,ctx,W=0,H=0,raf=0,last=0,t=0,energy=0,playing=false,N=5;
var cols=[],tgt=[];
for(var i=0;i<N;i++){cols.push([120,70,150]);tgt.push([120,70,150])}
function size(){cv=cv||document.getElementById("bg");var q=.26,w=Math.max(80,Math.round(innerWidth*q)),h=Math.max(120,Math.round(innerHeight*q));if(w!==cv.width||h!==cv.height){cv.width=W=w;cv.height=H=h}}
function rgba(c,a){return"rgba("+(c[0]|0)+","+(c[1]|0)+","+(c[2]|0)+","+a+")"}
function draw(){
  var c=ctx,w=W,h=H;
  c.globalCompositeOperation="source-over";
  c.fillStyle=rgba([cols[N-1][0]*.3,cols[N-1][1]*.3,cols[N-1][2]*.3],1);c.fillRect(0,0,w,h);
  var m=Math.max(w,h);
  for(var i=0;i<N;i++){
    var x=w*(.5+.42*Math.sin(t*(.16+.045*i)+i*2.1)),y=h*(.48+.4*Math.cos(t*(.12+.04*i)+i*1.7)),
        r=m*(.5+.08*Math.sin(t*.37+i*1.3)+energy*.05*Math.sin(t*2.4+i));
    var g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,rgba(cols[i],.95));g.addColorStop(.55,rgba(cols[i],.42));g.addColorStop(1,rgba(cols[i],0));
    c.fillStyle=g;c.fillRect(0,0,w,h);
  }
  var v=c.createLinearGradient(0,h*.45,0,h);v.addColorStop(0,"rgba(0,0,0,0)");v.addColorStop(1,"rgba(0,0,0,.5)");c.fillStyle=v;c.fillRect(0,0,w,h);
}
function frame(ts){
  raf=requestAnimationFrame(frame);
  var dt=Math.min(.05,(ts-last)/1000||0);last=ts;
  energy+=((playing?1:0)-energy)*Math.min(1,dt*2);
  t+=dt*(.28+energy*.6);
  var k=Math.min(1,dt*1.4);
  for(var i=0;i<N;i++)for(var j=0;j<3;j++)cols[i][j]+=(tgt[i][j]-cols[i][j])*k;
  draw();
}
function start(){if(raf)return;last=performance.now();raf=requestAnimationFrame(frame)}
function stop(){cancelAnimationFrame(raf);raf=0}
window.BG={
  init:function(){
    size();ctx=cv.getContext("2d");addEventListener("resize",size);
    document.addEventListener("visibilitychange",function(){document.hidden?stop():start()});
    if(matchMedia("(prefers-reduced-motion: reduce)").matches){t=3;draw();return}
    start();
  },
  palette:function(p){if(!p||!p.length)return;for(var i=0;i<N;i++)tgt[i]=p[i%p.length].slice()},
  play:function(p){playing=p}
};
})();
