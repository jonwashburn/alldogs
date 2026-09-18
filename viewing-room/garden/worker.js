importScripts('/painting/paintkit.js','/painting/hand.js','/viewing-room/garden/scene.js?v=20260918-garden1');
self.onmessage=({data})=>{
 try{const canvas=new OffscreenCanvas(1,1);const receipt=GardenPainting.paint(PK,canvas,data.key);const bitmap=canvas.transferToImageBitmap();self.postMessage({key:data.key,bitmap,receipt},[bitmap]);}
 catch(error){self.postMessage({key:data.key,error:error.message});}
};
