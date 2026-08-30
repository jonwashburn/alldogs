/* ALL DOGS generative portraits.
   CONTRACT (frozen, the harness depends on it):
     drawDog(canvas, seed, state)
       canvas : a 2d-capable canvas (browser canvas or @napi-rs/canvas), square.
       seed   : uint32. All randomness must derive from it. Same (seed, state)
                must paint identical pixels every time. No Math.random, no Date.
       state  : 'faithful' | 'zombie' | 'angel' | 'ghost'
   The module must export drawDog via module.exports (node) and
   window.ALLDOGS (browser). Everything else inside this file may change.

   Seed implementation: the naive hand-drawn style, adapted to the 4-state
   contract. The gauntlet exists to replace this with something far better. */
(function () {
  'use strict';

  // PRNG (sfc32)
  function R(seed) {
    let a = (seed ^ 0x9E3779B9) >>> 0,
        b = (seed ^ 0x243F6A88) >>> 0,
        c = (seed ^ 0xB7E15162) >>> 0,
        d = (Math.imul(seed, 0x85EBCA6B) + 1) >>> 0;
    function u() {
      let t = (a + b) >>> 0;
      t = (t + d) >>> 0;
      d = (d + 1) >>> 0;
      a = (b ^ (b >>> 9)) >>> 0;
      b = (c + ((c << 3) >>> 0)) >>> 0;
      c = ((((c << 21) >>> 0) | (c >>> 11)) + t) >>> 0;
      return t;
    }
    for (let i = 0; i < 12; i++) u();
    const f = () => u() / 4294967296;
    return {
      f,
      r: (lo, hi) => lo + f() * (hi - lo),
      pick: (xs) => xs[Math.floor(f() * xs.length) % xs.length],
    };
  }

  const hx = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16),
                   parseInt(h.slice(5, 7), 16)];
  const mix = (c1, c2, t) => c1.map((v, i) => Math.round(v + (c2[i] - v) * t));
  const css = c => 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';

  function smoothClosed(vals, passes) {
    const n = vals.length;
    for (let p = 0; p < (passes || 2); p++) {
      vals = vals.map((_, i) =>
        (vals[(i - 1 + n) % n] + vals[i] + vals[(i + 1) % n]) / 3);
    }
    return vals;
  }

  function blob(rng, cx, cy, rx, ry, n, mag, tilt) {
    n = n || 26; mag = mag === undefined ? 0.07 : mag; tilt = tilt || 0;
    const noise = smoothClosed(Array.from({ length: n }, () => rng.f() * 2 - 1));
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = tilt + i / n * Math.PI * 2;
      const r = 1 + noise[i] * mag;
      pts.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r]);
    }
    return pts;
  }

  function hand(rng, pts, jitter, closed) {
    const P = closed ? pts.concat([pts[0]]) : pts.slice();
    const out = [];
    for (let i = 0; i < P.length - 1; i++) {
      const x1 = P[i][0], y1 = P[i][1], x2 = P[i + 1][0], y2 = P[i + 1][1];
      const d = Math.hypot(x2 - x1, y2 - y1);
      const steps = Math.max(2, Math.floor(d / 16));
      for (let s = 0; s < steps; s++) {
        const t = s / steps;
        out.push([x1 + (x2 - x1) * t + (rng.f() * 2 - 1) * jitter,
                  y1 + (y2 - y1) * t + (rng.f() * 2 - 1) * jitter]);
      }
    }
    out.push(P[P.length - 1]);
    return out;
  }

  const PAPERS = ['#f2e9d6', '#e9d7c3', '#e6cfc4', '#ccd4c0', '#bcc7cf',
                  '#eedfad', '#dfae91', '#d8cfe0', '#e5e0d4'];
  const ACCENTS = ['#c8401f', '#2456a8', '#d99a1e', '#4e7d4a', '#b45a7d', '#3d7d80'];
  const LINE = '#2e2925';
  const SKINS = ['#a4713c', '#8a5a2b', '#c08a4e', '#6d4a26', '#b98a5e',
                 '#d9a55e', '#e0b87a', '#caa06a', '#e3c193'];
  const COLLARS = { faithful: '#2456a8', zombie: '#c8401f',
                    angel: '#d99a1e', ghost: '#b9b6ad' };

  function drawDog(canvas, seed, state) {
    const rng = R(seed >>> 0);
    const ctx = canvas.getContext('2d');
    const scale = canvas.width / 1000;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    let wf = 1.0;

    function stroke(pts, color, w, jitter, closed, passes) {
      w = w === undefined ? 7 : w;
      jitter = jitter === undefined ? 3.0 : jitter;
      ctx.strokeStyle = css(color);
      ctx.lineWidth = Math.max(2, Math.round(w * wf));
      for (let p = 0; p < (passes || 2); p++) {
        const q = hand(rng, pts, jitter, closed);
        ctx.beginPath();
        ctx.moveTo(q[0][0], q[0][1]);
        for (let i = 1; i < q.length; i++) ctx.lineTo(q[i][0], q[i][1]);
        ctx.stroke();
      }
    }
    function fill(pts, color) {
      ctx.fillStyle = css(color);
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath();
      ctx.fill();
    }
    function dot(x, y, r, color) {
      ctx.fillStyle = css(color);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    function hatch(cx, cy, rx, ry, color, n, w) {
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n * 2 - 1;
        const y = cy + t * ry * 0.85;
        const half = rx * Math.sqrt(Math.max(0.05, 1 - t * t)) * 0.9;
        const x1 = cx - half + rng.r(-14, 14);
        const x2 = cx + half + rng.r(-14, 14);
        stroke([[x1, y], [x2, y + rng.r(-10, 10)]], color, w || 5, 4, false, 1);
      }
    }

    const paper = hx(rng.pick(PAPERS));
    let line = hx(LINE);
    const accent = hx(rng.pick(ACCENTS));
    let skin = hx(rng.pick(SKINS));
    if (state === 'zombie') skin = mix(skin, hx('#6fae4e'), 0.55);
    if (state === 'angel') skin = mix(skin, hx('#f2d98a'), 0.4);
    if (state === 'ghost') {
      skin = mix(skin, paper, 0.62);
      line = mix(line, paper, 0.45);
    }

    ctx.fillStyle = css(paper);
    ctx.fillRect(0, 0, 1000, 1000);
    wf = rng.r(0.8, 1.45);

    const grain = mix(line, paper, 0.86);
    for (let i = 0; i < 240; i++) {
      dot(rng.f() * 1000, rng.f() * 1000, rng.r(0.8, 2.0), grain);
    }

    const hcx = 500 + rng.r(-70, 70), hcy = 470 + rng.r(-45, 35);
    const hrx = rng.r(185, 320);
    const hry = hrx * rng.r(1.02, 1.25);
    const tilt = rng.r(-0.09, 0.09);

    if (rng.f() < 0.45) {
      const wash = blob(rng, hcx + rng.r(-40, 40), hcy + rng.r(-40, 40),
                        hrx * rng.r(1.5, 1.9), hry * rng.r(1.3, 1.6), 22, 0.10);
      fill(wash, mix(accent, paper, 0.72));
    }

    const head = blob(rng, hcx, hcy, hrx, hry, 30, 0.06, tilt);
    const light = mix(skin, [255, 255, 255], 0.28);

    const earStyle = rng.pick(['floppy', 'floppy', 'pointy', 'mixed']);
    const earCol = mix(skin, line, rng.pick([0.10, 0.22, 0.30]));
    const exl = hcx - hrx * 0.78, exr = hcx + hrx * 0.78;
    const eyt = hcy - hry * 0.62;

    function ear(x, up, big, sidex) {
      let pts;
      if (up) {
        const ew = hrx * rng.r(0.20, 0.28) * big;
        const eh = hry * rng.r(0.42, 0.58) * big;
        const bx = hcx + sidex * hrx * 0.48;
        pts = blob(rng, bx, hcy - hry * 0.76 - eh * 0.14, ew, eh, 16, 0.12,
                   sidex * 0.14);
      } else {
        const ew = hrx * rng.r(0.18, 0.26) * big;
        const eh = hry * rng.r(0.55, 0.80) * big;
        pts = blob(rng, x + sidex * rng.r(-6, 18),
                   eyt + eh * rng.r(0.30, 0.45), ew, eh, 16, 0.10,
                   sidex * 0.12);
      }
      fill(pts, earCol);
      stroke(pts, line, 7, 3.5, true);
    }

    if (earStyle === 'floppy') {
      ear(exl, false, 1.0, -1);
      ear(exr, false, rng.r(0.85, 1.2), 1);
    } else if (earStyle === 'pointy') {
      ear(exl, true, 1.0, -1);
      ear(exr, true, rng.r(0.85, 1.2), 1);
    } else {
      ear(exl, rng.f() < 0.5, 1.0, -1);
      ear(exr, rng.f() < 0.5, rng.r(0.85, 1.2), 1);
    }

    fill(head, skin);
    stroke(head, line, 8, 3.5, true);

    const side = rng.f() < 0.5 ? -1 : 1;
    hatch(hcx + side * hrx * 0.55, hcy + hry * 0.1, hrx * 0.30, hry * 0.55,
          mix(skin, line, 0.14), 8);

    if (rng.f() < 0.28) {
      const px = hcx + rng.pick([-1, 1]) * hrx * 0.34;
      const patch = blob(rng, px, hcy - hry * 0.18, hrx * 0.26, hry * 0.22,
                         14, 0.14);
      fill(patch, mix(skin, line, 0.30));
    }

    const mzy = hcy + hry * 0.34;
    const mz = blob(rng, hcx, mzy, hrx * 0.46, hry * 0.30, 20, 0.09);
    fill(mz, light);
    stroke(mz, line, 7, 3, true);

    const ny = mzy - hry * 0.16;
    const nose = blob(rng, hcx, ny, hrx * 0.13, hry * 0.085, 12, 0.12);
    fill(nose, state !== 'ghost' ? line : mix(line, paper, 0.2));

    const mw = hrx * 0.22;
    stroke([[hcx, ny + hry * 0.07], [hcx, ny + hry * 0.16],
            [hcx - mw, ny + hry * 0.22], [hcx, ny + hry * 0.16],
            [hcx + mw, ny + hry * 0.22]], line, 6, 2.5);

    if (rng.f() < 0.3 && state !== 'zombie') {
      const tg = blob(rng, hcx + rng.r(-20, 20), ny + hry * 0.30,
                      hrx * 0.10, hry * 0.10, 12, 0.12);
      fill(tg, hx('#c96f6f'));
      stroke(tg, line, 5, 2, true);
    }

    const eyy = hcy - hry * 0.16;
    const exo = hrx * 0.38;
    [-1, 1].forEach(sidex => {
      const ex = hcx + sidex * exo + rng.r(-10, 10);
      const ey = eyy + rng.r(-16, 16);
      const er = rng.r(11, 19);
      if (state === 'zombie' && sidex === 1) {
        const s = er * 1.6;
        stroke([[ex - s, ey - s], [ex + s, ey + s]], line, 7);
        stroke([[ex - s, ey + s], [ex + s, ey - s]], line, 7);
      } else if (state === 'ghost') {
        stroke(blob(rng, ex, ey, er * 1.3, er * 1.5, 12, 0.1), line, 5, 2, true);
      } else {
        dot(ex, ey, er, line);
        dot(ex - er * 0.3, ey - er * 0.35, er * 0.28, paper);
      }
    });

    if (rng.f() < 0.4) {
      [-1, 1].forEach(sidex => {
        const bx = hcx + sidex * exo;
        const by = eyy - hry * 0.14 + rng.r(-8, 8);
        stroke([[bx - 34, by + rng.r(-6, 6)], [bx + 34, by - 8]], line, 7, 3);
      });
    }

    if (rng.f() < 0.55 && state !== 'ghost') {
      const chx = hcx - side * hrx * 0.52;
      const chy = hcy + hry * 0.16;
      const cc = mix(hx('#c8401f'), skin, 0.45);
      for (let i = 0; i < 4; i++) {
        stroke([[chx - 34, chy - 10 + i * 9], [chx + 34, chy - 14 + i * 9]],
               cc, 6, 4, false, 1);
      }
    }

    [-1, 1].forEach(sidex => {
      for (let i = 0; i < 3; i++) {
        dot(hcx + sidex * hrx * rng.r(0.18, 0.34), mzy + rng.r(-6, 30), 3.2,
            mix(line, skin, 0.25));
      }
    });

    const jaw = hcy + hry * 0.94;
    const nw = hrx * rng.r(0.44, 0.52);
    stroke([[hcx - nw, jaw - 8], [hcx - nw * 1.12, 970]], line, 8, 3);
    stroke([[hcx + nw, jaw - 8], [hcx + nw * 1.12, 970]], line, 8, 3);

    const ccol = hx(COLLARS[state]);
    const cy1 = jaw + (970 - jaw) * 0.30;
    const band = [[hcx - nw * 1.05, cy1], [hcx, cy1 + 18], [hcx + nw * 1.05, cy1]];
    const band2 = [[hcx - nw * 1.06, cy1 + 34], [hcx, cy1 + 54],
                   [hcx + nw * 1.06, cy1 + 34]];
    fill(band.concat(band2.slice().reverse()), ccol);
    stroke(band, line, 6, 2.5);
    stroke(band2, line, 6, 2.5);
    dot(hcx, cy1 + 74, 20, mix(ccol, [255, 255, 255], 0.35));
    stroke(blob(rng, hcx, cy1 + 74, 22, 22, 10, 0.1), line, 5, 2, true);

    if (state === 'angel') {
      stroke(blob(rng, hcx, hcy - hry - 60, hrx * 0.42, 26, 18, 0.06),
             hx('#d99a1e'), 10, 3, true);
    }
  }

  const api = { drawDog: drawDog };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ALLDOGS = api;
})();
