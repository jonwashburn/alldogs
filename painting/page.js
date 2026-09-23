/* The first frame is a cached render of scene.js. OffscreenCanvas repaints
   with the exact same brush without occupying the interaction thread. */
(() => {
  'use strict';
  if (!window.Worker || !window.OffscreenCanvas || navigator.connection?.saveData) return;
  const pieces = [...document.querySelectorAll('[data-paint]')];
  // Small pieces first. One worker and one queued piece keep memory bounded.
  const keys = [...new Set(pieces.map(p => p.dataset.paint))].sort((a,b) =>
    (a === 'ground' ? 1 : 0) - (b === 'ground' ? 1 : 0));
  let worker, timer;
  const stop = () => {clearTimeout(timer);worker?.terminate();};
  const start = () => {
    try { worker = new Worker('/painting/worker.js?v=20260923-watch1'); }
    catch { return; }
    const next = () => {
      clearTimeout(timer);
      const key=keys.shift();
      if(!key){stop();return;}
      timer=setTimeout(stop,25000);
      worker.postMessage({key});
    };
    worker.onmessage = ({data}) => {
      if(data.bitmap){
        for(const piece of pieces.filter(p=>p.dataset.paint===data.key)){
          const canvas=piece.querySelector('canvas');
          canvas.width=data.bitmap.width;canvas.height=data.bitmap.height;
          canvas.getContext('2d').drawImage(data.bitmap,0,0);
          piece.dataset.painted='true';
        }
        data.bitmap.close();
      }
      next();
    };
    worker.onerror=stop;
    next();
  };
  if('requestIdleCallback' in window) requestIdleCallback(start,{timeout:1800});
  else setTimeout(start,600);
  window.addEventListener('pagehide',stop,{once:true});
})();
