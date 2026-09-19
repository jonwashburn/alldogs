/* Wubbushi's garden. Authored with the collection's unchanged physical brush.
   The foreground and ground share a coordinate system with the invited dog. */
(function(root){
 'use strict';
 const words={
  chooseSupa:['I CHOOSE SUPA',490,100,58],
  chooseRep:['I CHOOSE ONE MORE REP',760,100,58],
  chooseDog:['I CHOOSE THIS DOG',610,100,58],
  gardenTitle:['WELCOME TO MY GARDEN.',1150,140,75],
  gardenInvitation:['YOUR INVITATION',570,86,43],
  gardenChoose:['THIS IS MY DOG',560,100,53],
  gardenOriginal:['SEE THE ORIGINAL',560,78,37],
  gardenWaiting:['A PLACE FOR YOUR DOG.',780,100,44]
 };
 function paint(PK,canvas,key){
  const word=words[key],transparent=Boolean(word)||key==='foreground';
  const W=word?word[1]:1600,H=word?word[2]:1000;
  canvas.width=W;canvas.height=H;const ctx=canvas.getContext('2d',{willReadFrequently:true});
  const seed=Array.from(key).reduce((s,c)=>(Math.imul(s,33)+c.charCodeAt(0))>>>0,20260919);
  PK.reset();const rng=PK.makeRng(seed);
  PK.kit.substrate={rng:PK.makeRng(seed^0x5a17),opts:{relief:.28,shade:.32,grain:.018,spec:.06,stickUnlit:true}};
  PK.ground(ctx,rng,null,{color:'#eeeadd',tooth:.025,mottle:.022,fibers:.3});
  const L=PK.kit.paint;let brushCalls=0,stickCalls=0;
  const b=(points,color,w,opt={})=>{brushCalls++;return PK.paint.brushStroke(L,rng,points,{color,w,alpha:1,body:.92,thick:.43,press:.70,load:2.05,wetness:.10,wet:false,scumble:.13,end:'lift',taperEnd:.16,taper:.08,bow:.12,wob:.018,jitter:.025,...opt});};
  const f=(poly,color,w=70,angle=.03)=>{brushCalls++;PK.paint.brushFill(L,rng,poly,{color,w,alpha:1,body:.92,thick:.43,press:.70,dry:.38,dryProb:1,wet:false,wetness:.08,loaded:0,bodyVar:0,scumble:.16,close:.88,shortAlt:false,load:2.05,angle,contour:0,under:null,cross:0});};
  const s=(points,color='#34392e',w=3,opt={})=>{stickCalls++;PK.stick(ctx,rng,points,{color,w,tooth:.34,press:.76,alpha:1,wob:.16,dbl:.10,smooth:2,...opt});};
  const leaves=(x,y,scale=1)=>{
   b([[x,y],[x-17*scale,y-28*scale],[x-31*scale,y-35*scale]],'#718761',12*scale,{load:1.25});
   b([[x+1,y-11*scale],[x+23*scale,y-40*scale]],'#94a378',10*scale,{load:1.25});
  };
  const flower=(x,y,h,color,lean=0)=>{
   s([[x,y],[x+lean*.4,y-h*.55],[x+lean,y-h]],'#4b6246',3.2);
   leaves(x+lean*.35,y-h*.35,.8);
   const cx=x+lean,cy=y-h;
   for(const [dx,dy] of [[-11,-5],[3,-12],[12,2],[-1,10]])b([[cx,cy],[cx+dx,cy+dy]],color,15,{load:1.5,press:.77});
   b([[cx-1,cy-1],[cx+2,cy+2]],'#bba44e',7,{load:1.1});
  };
  if(word){
   root.DogHand.write(PK,ctx,rng,word[0],17,H*.79,word[3],'#202821',{sizeVariation:.075,wMul:key==='gardenChoose'?.15:.10,spacing:1.02,angle:-.008});
  }else if(key==='ground'){
   // A clearing, with a path that continues out through the gate behind us.
   f([[-50,-40],[1650,-30],[1630,430],[1307,423],[1102,398],[829,429],[462,406],[-30,438]],'#d6e0d8',95,.04);
   b([[460,140],[732,123],[966,147]],'#e5e7d8',68,{load:1.5,press:.57});
   f([[-30,393],[316,387],[646,439],[987,414],[1320,377],[1650,403],[1650,1030],[-30,1040]],'#bcc6a3',95,-.03);
   f([[-20,551],[351,579],[497,698],[547,916],[349,1040],[-30,1020]],'#9fae85',82,.13);
   f([[1191,529],[1629,477],[1630,1020],[1220,1040],[1123,817]],'#a4b58d',90,-.12);
   f([[839,435],[902,438],[1019,674],[1011,775],[1190,1030],[598,1030],[762,790],[733,667]],'#d8d1b7',75,.11);
   f([[682,583],[1043,569],[1175,711],[1007,820],[681,822],[503,727]],'#cad1ad',70,.03);
   b([[788,856],[881,905],[1033,941]],'#e3dcc3',70,{load:1.45,press:.61});
   // A low warm wall, half hidden by the planting.
   b([[-10,391],[226,399],[442,416],[650,415]],'#bdb49c',42,{load:3.1,press:.61});
   b([[998,410],[1240,390],[1620,375]],'#c6bba0',44,{load:3.2,press:.61});
   s([[42,391],[252,397],[431,415],[647,414]],'#92917b',2.5,{dbl:0});
   // Broad quiet leaf masses surround the dog, leaving the middle open.
   f([[-20,339],[57,232],[154,264],[241,183],[337,266],[474,254],[541,375],[478,528],[182,572],[-20,541]],'#718b6d',71,.19);
   f([[-20,423],[192,385],[276,430],[404,396],[493,505],[373,576],[91,582],[-10,524]],'#8fa47d',65,-.2);
   f([[1179,273],[1286,218],[1352,257],[1464,176],[1607,205],[1630,606],[1471,625],[1287,514],[1192,441]],'#758e6e',77,-.15);
   f([[1175,412],[1323,357],[1401,421],[1590,373],[1623,567],[1436,656],[1261,527]],'#91a87a',69,.16);
   // The left tree leans over the path, drawn once with visible bark and gaps.
   s([[156,648],[183,445],[223,272],[226,109]],'#504e39',20);
   b([[157,644],[186,443],[226,267],[226,109]],'#85816a',37,{load:2.8,press:.68});
   s([[204,335],[291,218],[382,132]],'#505b43',9);
   b([[204,338],[290,221],[379,137]],'#85846b',18,{load:2.2});
   s([[221,273],[124,174],[72,107]],'#595f46',8);
   f([[-30,17],[115,-30],[227,14],[316,-30],[475,32],[503,124],[433,214],[324,205],[209,283],[98,242],[-20,283]],'#779171',73,.12);
   b([[13,88],[127,49],[291,78]],'#9eb38d',66,{load:2.6});
   b([[303,108],[396,77],[458,130]],'#8ea581',66,{load:2});
   b([[96,189],[181,176],[267,205]],'#9aaa85',53,{load:2.2});
   // A smaller tree and a bench under its branch.
   b([[1452,646],[1424,439],[1448,263],[1400,126]],'#7b7b62',31,{load:2.8});
   s([[1448,642],[1420,438],[1445,260],[1398,128]],'#4d5942',7);
   b([[1428,416],[1342,278],[1246,240]],'#7b7b62',18,{load:1.8});
   f([[1100,39],[1202,-20],[1307,33],[1421,-20],[1633,20],[1640,290],[1470,355],[1373,299],[1231,341],[1129,234]],'#839a73',78,-.13);
   b([[1173,86],[1280,119],[1374,100]],'#acb998',61,{load:2.3});
   b([[1438,185],[1519,164],[1617,189]],'#a1b48b',73,{load:2.1});
   s([[1156,522],[1324,511],[1338,546],[1161,557],[1156,522]],'#58624b',5);
   b([[1160,523],[1319,514]],'#acb2a0',17,{load:2.5});
   b([[1166,549],[1334,539]],'#7b9185',18,{load:2.3});
   s([[1176,551],[1172,604]],'#57614e',6);s([[1310,543],[1323,594]],'#57614e',6);
   // The two leaves are open toward the foreground, the familiar blue gate.
   const gate=(right)=>{
    const P=pts=>right?pts.map(([x,y])=>[1600-x,y+8]):pts;
    s(P([[51,985],[64,607],[244,701],[249,944]]),'#3d4b51',6);
    b(P([[61,976],[71,617],[242,709],[249,942]]),'#6c8c99',13,{load:2.8});
    for(let i=0;i<4;i++){const x=103+i*35;s(P([[x,634+i*18],[x+5,963-i*5]]),'#445e68',4.5);b(P([[x+3,650+i*18],[x+6,954-i*5]]),'#86a0a4',7,{load:1.9});}
    b(P([[61,864],[244,847]]),'#648591',12,{load:2.6});
    s(P([[63,958],[247,936]]),'#455e61',5);
   };gate(false);gate(true);
   // A few particular flowers, not a repeating border.
   [[335,689,105,'#d6a9ac',-18],[421,715,124,'#ede7cf',14],[365,741,90,'#bda2bc',20],[1224,717,128,'#b49dbb',-10],[1302,752,91,'#dfd9b9',17],[1391,743,108,'#c88e81',-7]].forEach(a=>flower(...a));
   b([[663,815],[810,823],[966,817]],'#9ba981',24,{load:1.1,press:.43});
   s([[708,869],[715,859],[730,870]],'#9b9f81',2);s([[915,942],[927,934],[938,941]],'#a3a088',2);
  }else if(key==='foreground'){
   // These few blades pass in front of the paws, joining the dog to the ground.
   b([[347,873],[418,864],[508,883]],'#a6b184',45,{load:1.5,press:.6});
   b([[1122,890],[1253,863],[1381,875]],'#99ac7a',44,{load:1.7,press:.61});
   for(const [x,y,h] of [[403,874,41],[471,895,39],[544,907,27],[1129,882,31],[1237,897,40],[1321,873,49]]){
    s([[x-9,y],[x-4,y-h],[x+2,y-6],[x+18,y-h*.66]],'#667c53',3.2);
   }
   flower(334,917,104,'#e1be8f',-16);flower(1265,929,131,'#dbc5c0',21);
  }else throw Error('Unknown garden piece');
  PK.paintEnd(ctx);
  if(transparent){const img=ctx.getImageData(0,0,W,H);for(let i=0;i<L.hgt.length;i++)if(L.hgt[i]===0)img.data[i*4+3]=0;ctx.putImageData(img,0,0);}
  const receipt={key,seed,width:W,height:H,brushCalls,stickCalls,depositedMass:L.laid,brush:'PK.paint.brushStroke / brushFill',hand:'DogHand / native oil-stick'};
  PK.reset();return receipt;
 }
 root.GardenPainting={paint,keys:['ground','foreground',...Object.keys(words)]};
})(typeof self==='undefined'?globalThis:self);
