'use strict';
importScripts('paintkit.js','hand.js','scene.js');
PK.setCanvasLib({createCanvas:(w,h)=>new OffscreenCanvas(w,h)});
self.onmessage = ({data}) => {
  try {
    const dim=InvitationPainting.spec(data.key);
    const canvas=new OffscreenCanvas(dim.w,dim.h);
    const receipt=InvitationPainting.paint(PK,canvas,data.key);
    const bitmap=canvas.transferToImageBitmap();
    self.postMessage({key:data.key,bitmap,receipt},[bitmap]);
  } catch(error) {
    self.postMessage({key:data.key,error:String(error)});
  }
};
