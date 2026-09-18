/* ALL DOGS, an invitation. Composed in the collection's physical paint and hand.
   The renderer is the frozen PaintKit used by the dogs, not a texture filter.
   Cached first frames and browser canvases execute this same score and seed. */
(function (root) {
  'use strict';
  const paper = '#eeeadd', ink = '#252f35', blue = '#3e5a78';
  const words = {
    wordmark: ['ALL DOGS', 470, 105, 65, ink],
    heading: ['A DOG OF YOUR OWN.', 1060, 150, 83, ink],
    invitation: ['AN INVITATION', 500, 75, 43, '#695a48'],
    work: ['THE WORK', 300, 68, 38, ink],
    personal: ['YOUR INVITATION', 495, 68, 38, ink],
    waitlist: ['JOIN WAITLIST', 495, 68, 38, ink],
    note: ['A NOTE FROM WUBBUSHI', 640, 68, 37, ink],
    only: ['INVITATION ONLY.', 470, 68, 35, '#5a6056'],
    journal: ['THE JOURNAL', 385, 68, 38, ink],
    quote: ['YOU MAKE THE RECORD ANYWAY.', 900, 80, 42, '#5a6056'],
    artist: ['PAINTINGS BY WUBBUSHI', 680, 68, 35, '#5a6056'],
    signature: ['WUBBUSHI', 440, 110, 58, '#51657d'],
    viewingTitle: ["HE THINKS HE'S YOUR DOG.", 1200, 150, 78, ink],
    collection: ['FROM THE COLLECTION', 680, 75, 35, '#5a6056'],
    record: ["THE DOG'S RECORD", 580, 75, 37, ink],
    life: ['A LIFE TOGETHER', 535, 75, 37, ink],
    return: ['BACK TO THE GATE', 575, 75, 37, ink],
    visit: ['VISIT YOUR DOG', 500, 75, 37, ink]
  };
  function spec(key) {
    if (words[key]) return {w: words[key][1], h: words[key][2], transparent: true};
    return {
      ground: {w: 1600, h: 1100},
      leafLeft: {w: 550, h: 610, transparent: true},
      leafRight: {w: 550, h: 610, transparent: true},
      card: {w: 410, h: 370, transparent: true},
      page: {w: 900, h: 1200}
    }[key];
  }
  function paint(PK, canvas, key) {
    const dim = spec(key);
    if (!dim) throw Error('Unknown painted piece: ' + key);
    canvas.width = dim.w; canvas.height = dim.h;
    const ctx = canvas.getContext('2d', {willReadFrequently: true});
    const seed = Array.from(key).reduce((a, c) => (Math.imul(a, 33) + c.charCodeAt(0)) >>> 0, 20260918);
    PK.reset();
    const rng = PK.makeRng(seed);
    PK.kit.substrate = {rng: PK.makeRng(seed ^ 0x5a17), opts: {
      relief: .28, shade: .32, grain: .018, spec: .06, stickUnlit: true
    }};
    PK.ground(ctx, rng, null, {color: paper, tooth: .025, mottle: .022, fibers: .3});
    const L = PK.kit.paint;
    let brushCalls = 0, stickCalls = 0;
    const brush = (points, color, w, opt = {}) => {
      brushCalls++;
      return PK.paint.brushStroke(L, rng, points, {
        color, w, alpha: 1, body: .92, thick: .43, press: .74, load: 2.05,
        wetness: .12, wet: false, scumble: .1, end: 'lift', taperEnd: .12,
        taper: .08, bow: .12, wob: .018, jitter: .025, ...opt
      });
    };
    const stick = (points, color = ink, w = 4, opt = {}) => {
      stickCalls++;
      return PK.stick(ctx, rng, points, {
        color, w, tooth: .34, press: .76, alpha: 1, wob: .16,
        dbl: .14, smooth: 2, ...opt
      });
    };
    const write = (text, x, y, h, color = ink, opt = {}) => {
      return root.DogHand.write(PK, ctx, rng, text, x, y, h, color,
        {sizeVariation: .075, wMul: .067, spacing: 1.02, ...opt});
    };
    if (words[key]) {
      const [text, w, h, letterHeight, color] = words[key];
      write(text, 17, h * .78, letterHeight, color, {angle: -.008, wMul: key === 'heading' || key === 'viewingTitle' ? .072 : .095});
    } else if (key === 'ground') {
      // The entire sheet is a painting. Broad quiet strokes surround an open
      // cream centre, where the invitation and the words can be read.
      const field = (poly,color,angle) => {
        brushCalls++;
        PK.paint.brushFill(L,rng,poly,{color,w:74,alpha:1,body:.92,thick:.43,
          press:.74,dry:.35,dryProb:1,wet:false,wetness:.08,loaded:0,
          bodyVar:0,scumble:.16,close:.88,shortAlt:false,load:2.05,
          angle,contour:0,under:null,cross:0});
      };
      field([[-50,-30],[570,-20],[488,64],[322,84],[296,267],[250,476],
        [329,681],[326,782],[-40,892]],'#b7ccd3',.12);
      field([[999,-20],[1660,-20],[1650,909],[1416,853],[1340,699],
        [1363,462],[1311,244],[1251,112]],'#b7ccd0',-.13);
      field([[365,-30],[1202,-30],[1141,61],[838,48],[513,77]],'#d1ded9',.04);
      field([[-30,846],[264,860],[403,914],[679,935],[956,914],
        [1188,850],[1437,818],[1640,867],[1650,1150],[-30,1150]],'#bdc6ad',.02);
      brush([[112,770],[197,804],[343,815]],'#ced3be',75,{load:1.4,press:.68});
      brush([[1490,797],[1335,801],[1168,843]],'#afc0af',78,{load:1.5,press:.69});
      brush([[89,995],[346,983],[529,1002]],'#d3d2b9',65,{load:1.6,press:.66});
      brush([[1232,1009],[1382,991],[1500,1008]],'#a5b6a0',71,{load:1.5,press:.68});
      brush([[613,20],[805,28],[977,13]],'#d6e0d8',55,{load:1.25,press:.68});
      stick([[75,873],[212,879],[368,871],[512,881]], '#8c998b', 2.7, {dbl: 0});
      stick([[1152,887],[1307,883],[1522,894]], '#788b80', 2.4, {dbl: 0});
      // Small uncorrected grass gestures, gathered at the edges of the sheet.
      for (const [x,y] of [[80,870],[120,868],[1443,880],[1496,889]]) {
        stick([[x-10,y],[x-2,y-24],[x+4,y]], '#677e70', 3.0, {dbl: 0});
      }
    } else if (key === 'leafLeft' || key === 'leafRight') {
      const right = key === 'leafRight';
      const flip = pts => right ? pts.map(([x,y])=>[550-x,y+(x<200?5:-3)]) : pts;
      const b = (p,c,w,o) => brush(flip(p),c,w,o);
      const s = (p,c,w,o) => stick(flip(p),c,w,o);
      // A slightly leaning gate drawn as a complete object. The paint crosses
      // and occasionally hides the oil-stick construction.
      const arch = [[33,552],[36,246],[109,191],[211,133],[332,91],[526,61],[529,551]];
      s(arch, '#333e48', 7.1, {wob: .2, dbl: .1});
      b([[40,245],[112,192],[214,133],[339,93],[523,66]], '#607b97', 15, {load: 2.5});
      b([[529,75],[527,261],[531,544]], blue, 16, {load: 2.7});
      b([[40,253],[37,402],[42,561]], '#48657c', 21, {load: 2.5});
      const bars = [[102,204,98],[171,163,179],[244,133,239],[320,105,326],[392,91,390],[466,74,470]];
      bars.forEach(([x,y,end],i)=>{
        b([[x,y],[x+(i%2?5:-3),331],[end,551]], i%3===1?'#778d9c':blue,
          i%2?11:13,{load:2.5,press:.63});
        if(i!==2)s([[x-4,y+7],[x-1,345],[end-3,547]], '#3b4e63', 3.3, {dbl: 0});
      });
      b([[39,405],[191,401],[352,407],[528,403]], '#586c81', 18, {load:2.9});
      s([[37,393],[264,398],[523,394]], '#2b3c50', 4.0, {dbl:0});
      b([[39,553],[213,549],[392,555],[530,550]], '#476278', 23, {load:2.6});
      s([[63,537],[265,443],[500,417]], '#455c6e', 5.0, {dbl:0,wob:.3});
      s([[66,421],[258,472],[507,539]], '#748594', 5.0, {dbl:0});
      b([[11,555],[15,337],[12,243]], '#52677c', 28, {load:2.8});
      b([[10,256],[38,257]], '#343f4a', 11, {load:1.2});
      b([[9,513],[40,513]], '#343f4a', 10, {load:1.2});
      b([[507,349],[543,350]], '#2c3b4c', 13, {load:1.25});
      b([[46,271],[47,401]], '#9aabb3', 4, {load:.85,press:.58});
      s([[19,577],[219,571],[408,580],[542,574]], '#7d887c', 2.2, {dbl:0});
    } else if (key === 'card') {
      // One little hand-painted invitation hanging by a red tie.
      brush([[59,96],[193,81],[350,94]], '#d1c7ae', 34, {load:1.7});
      PK.paint.brushFill(L,rng,[[52,80],[353,86],[365,329],[47,325]],{
        color:'#f4eedc',w:68,alpha:1,body:.92,thick:.43,press:.74,
        dry:.35,dryProb:1,wet:false,wetness:.08,load:2.05,
        scumble:.16,close:.88,shortAlt:false,angle:.02,contour:0
      }); brushCalls++;
      stick([[55,89],[51,226],[48,322],[216,329]], '#938770', 2.5, {dbl:0});
      stick([[183,82],[352,87],[360,214],[363,324]], '#ab9c82', 2.1, {dbl:0});
      stick([[196,85],[203,54],[210,19]], '#af4f3b', 5.1, {dbl:0});
      stick([[204,53],[178,31],[174,52],[202,60],[233,41],[234,59],[207,60]], '#ad4937', 4.9, {dbl:.1});
      write('ALL DOGS',112,140,26,'#6b6959',{spacing:1.05});
      write('COME IN.',86,219,43,'#384d63',{angle:-.016,wMul:.09});
      write('OPEN THE GATE',98,279,24,'#786c54',{spacing:.97,wMul:.09});
      stick([[153,299],[220,302],[253,298]],'#b48656',2.5,{dbl:0});
    } else if (key === 'page') {
      brush([[13,4],[16,471],[8,1020]], '#d6d7c6', 46, {load:3.3});
      brush([[885,1120],[889,624],[880,20]], '#d1d9cf', 40, {load:3.2});
      brush([[20,1177],[440,1180],[888,1168]], '#d2d5bf', 39, {load:2.8});
      brush([[89,16],[342,9],[738,19]], '#e1dfce', 42, {load:2.0});
    }
    PK.paintEnd(ctx);
    // Export only physically deposited pigment for moveable objects. RGB from
    // the renderer is unchanged; untouched support pixels become transparent.
    if (dim.transparent) {
      const img = ctx.getImageData(0,0,dim.w,dim.h);
      for (let i=0;i<L.hgt.length;i++) if (L.hgt[i]===0) img.data[i*4+3]=0;
      ctx.putImageData(img,0,0);
      if (words[key]) {
        // Crop only empty support around the writing. The authored glyphs,
        // paint and hand remain intact, and small navigation stays legible.
        let x0=dim.w,y0=dim.h,x1=0,y1=0;
        for(let y=0;y<dim.h;y++)for(let x=0;x<dim.w;x++)if(img.data[(y*dim.w+x)*4+3]){
          x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);
        }
        const crop=ctx.getImageData(Math.max(0,x0-9),Math.max(0,y0-9),x1-x0+19,y1-y0+19);
        canvas.width=crop.width;canvas.height=crop.height;
        ctx.putImageData(crop,0,0);
      }
    }
    const receipt = {key,seed,width:canvas.width,height:canvas.height,brushCalls,stickCalls,
      depositedMass:L.laid,pickedUpMass:L.taken,marks:PK.kit.marks,
      brush:'PK.paint.brushStroke / brushFill',hand:'All Dogs scrawl alphabet / workWords'};
    PK.reset();
    return receipt;
  }
  root.InvitationPainting={spec,paint,keys:['ground','leafLeft','leafRight','card',...Object.keys(words),'page']};
})(typeof self==='undefined'?globalThis:self);
