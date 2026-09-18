// Original All Dogs drawn alphabet and workWords hand, unchanged.
(function(root){
  const SCRAWL_ALPHA = {
    A: '0,4 1,0 2,4|.5,2.6 1.5,2.6',
    B: '0,0 0,4|0,0 1.6,0 1.9,1 1.6,2 0,2|0,2 1.8,2 2,3 1.8,4 0,4',
    C: '2,.5 1,0 0,1 0,3 1,4 2,3.5',
    D: '0,0 0,4|0,0 1.4,0 2,1.2 2,2.8 1.4,4 0,4',
    E: '2,0 0,0 0,4 2,4|0,2 1.6,2',
    F: '2,0 0,0 0,4|0,2 1.5,2',
    G: '2,.6 1,0 0,1 0,3 1,4 2,3.4 2,2.2 1.1,2.2',
    H: '0,0 0,4|2,0 2,4|0,2 2,2',
    I: '1,0 1,4|.4,0 1.6,0|.4,4 1.6,4',
    J: '1.8,0 1.8,3.2 1.2,4 .4,3.6 .2,3',
    K: '0,0 0,4|2,0 0,2.2|.6,1.7 2,4',
    L: '0,0 0,4 2,4',
    M: '0,4 0,0 1,2 2,0 2,4',
    N: '0,4 0,0 2,4 2,0',
    O: '1,0 .2,.8 0,2 .2,3.2 1,4 1.8,3.2 2,2 1.8,.8 1,0',
    P: '0,4 0,0 1.6,0 2,1 1.6,2 0,2',
    Q: '1,0 .2,.8 0,2 .2,3.2 1,4 1.8,3.2 2,2 1.8,.8 1,0|1.3,3 2.1,4.2',
    R: '0,4 0,0 1.6,0 2,1 1.6,2 0,2|.8,2 2,4',
    S: '2,.6 1,0 .2,.8 .8,1.8 1.6,2.4 2,3.2 1,4 0,3.4',
    T: '0,0 2,0|1,0 1,4',
    U: '0,0 0,3.2 .8,4 1.4,4 2,3.2 2,0',
    V: '0,0 1,4 2,0',
    W: '0,0 .5,4 1,1.6 1.5,4 2,0',
    X: '0,0 2,4|2,0 0,4',
    Y: '0,0 1,2 2,0|1,2 1,4',
    Z: '0,0 2,0 0,4 2,4',
    '0': '1,0 .2,.8 0,2 .2,3.2 1,4 1.8,3.2 2,2 1.8,.8 1,0|.4,3.2 1.6,.8',
    '1': '.4,.8 1,0 1,4',
    '2': '0,.8 .8,0 1.8,.6 1.6,1.8 0,4 2,4',
    '3': '0,.3 1.4,0 1.8,1 1,2 1.8,3 1.4,4 0,3.7',
    '4': '1.5,4 1.5,0 0,2.8 2,2.8',
    '5': '2,0 .2,0 0,2 1.4,1.8 2,2.8 1.4,4 0,3.7',
    '6': '1.8,0 .6,1.4 0,3 .8,4 1.8,3.4 1.6,2.2 .2,2.4',
    '7': '0,0 2,0 .8,4',
    '8': '1,2 .2,1 1,0 1.8,1 1,2 .1,3 1,4 1.9,3 1,2',
    '9': '1.8,1.6 .6,1.8 .2,.8 1,0 1.8,.8 1.8,2.6 1,4 .2,3.6',
    "'": '1,0 .8,.9',
    '-': '.2,2 1.8,2',
    '%': '.2,3.8 1.8,.2|.3,.3 .7,.3 .7,.9 .3,.9 .3,.3|1.3,3.1 1.7,3.1 1.7,3.7 1.3,3.7 1.3,3.1',
    ':': '1,1.2 1,1.4|1,2.8 1,3',
    '.': '1,3.8 1.1,4',
  };
let cache;function scrawlStrokes(){return cache||(cache=Object.fromEntries(Object.entries(SCRAWL_ALPHA).map(([k,v])=>[k,v.split('|').map(s=>s.trim().split(' ').map(p=>p.split(',').map(Number)))])));}
let PK; const hx=c=>PK.rgb(c);
function oilStick(ctx,rng,p,color,w,opt){return PK.stick(ctx,rng,p,{...opt,color,w,alpha:1,press:.85,tooth:.25,wob:(opt.wob||0)/w});}
// Composition helper only. Existing native glyph paths and native oilStick.
// Exact text, no invented letters, fonts, bitmap overlays or new mark renderer.
function workWords(ctx,rng,text,x,y,h,col,opt){
  opt=opt||{};
  const glyphs=Object.assign({},scrawlStrokes(),{
    '?':[[[.05,.8],[.5,.1],[1.4,0],[2,.65],[1.8,1.3],[1.05,2.1],[.95,2.7]],[[.95,3.7],[1,4]]],
    '!':[[[.7,0],[.95,2.9]],[[.85,3.7],[1,4]]]
  }),angle=opt.angle||0,cs=Math.cos(angle),sn=Math.sin(angle);
  const color=typeof col==='string'?hx(col):col;
  let pen=0,base=0,index=0;
  for(const ch of text.toUpperCase()){
    if(ch===' '){pen+=h*.39*(opt.spacing||1);continue;}
    if(!glyphs[ch])throw Error('Missing native writing glyph '+ch);
    const hh=h*(1+rng.r(-1,1)*(opt.sizeVariation===undefined?.13:opt.sizeVariation));
    const wide=rng.r(.88,1.13),slant=rng.r(-.11,.10),dy=base+rng.r(-h*.035,h*.035);
    for(const stroke of glyphs[ch]){
      let P=stroke.map(([gx,gy])=>{
        const up=(4-gy)/4;
        const u=pen+gx*hh*.25*wide+up*hh*slant+rng.r(-1,1)*hh*.012;
        const v=dy-up*hh+rng.r(-1,1)*hh*.012;
        return [x+u*cs-v*sn,y+u*sn+v*cs];
      });
      if(P.length===1)P.push([P[0][0]+hh*.025,P[0][1]+hh*.05]);
      oilStick(ctx,rng,P,color,Math.max(2.3,hh*(opt.wMul||.065)*rng.r(.78,1.2)),
        {tooth:.61,over:1.2,dbl:.08,wob:1.15});
    }
    pen+=hh*.60*wide*(opt.spacing||1);base+=(opt.stepY||0)+rng.r(-h*.024,h*.032);index++;
  }
  return {width:pen,letters:index};
}

root.DogHand={write(kit,...args){PK=kit;return workWords(...args);}};
})(typeof self==='undefined'?globalThis:self);
