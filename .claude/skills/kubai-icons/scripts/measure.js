// Copyright (c) 2026 Kubai087. Licensed under the Kubai Icons License; see LICENSE.
// Measures an icon against the rules in PROMPT.md that can be measured. A plain script:
// load it into a page (or evaluate it) and it defines KubaiMeasure:
//   KubaiMeasure.geometry(svg)   one pose of a live <svg> in the page: its parts' roles,
//                                line widths, small details, thin gaps, outlines peeking
//                                out from behind a part, corners that miss an edge,
//                                edges with no outline, and its bounds
//   KubaiMeasure.motion(frames)  markup at equal steps of real time: how fast it moves
//                                at each step, and where it jumps
// scripts/check.mjs uses it for a set made with this skill; the icon library's
// tools/audit.mjs uses the same file.
var KubaiMeasure = (() => {
  // ----- geometry -----
  // What a shape is: an outline, a body (back or front piece), white content or a mark.
  // Marks are tinted (data-t, or a {token} in the library's template output) or white marks
  // (data-w, which a soft palette turns deep).
  const role = (el) => {
    if (el.closest('defs,mask,clipPath')) return null;
    const fill = el.getAttribute('fill') || '', stroke = el.getAttribute('stroke') || '';
    if ((el.getAttribute('mask') || '').startsWith('url(#ol-') || el.classList.contains('ol')) return 'outline';
    if (stroke.startsWith('url(') && fill === 'none') return null; // seam underlap
    if (/^url\(#(lo|loS|pure)-/.test(fill)) return 'back';
    if (/^url\(#(up|upS)-/.test(fill)) return 'front';
    if (/^url\(/.test(fill)) return 'back';
    if (el.hasAttribute('data-w')) return 'mark';
    if (fill.toLowerCase() === '#fff' || fill.toLowerCase() === '#ffffff') return 'content';
    if (el.hasAttribute('data-t') || /^\{/.test(fill) || /^\{/.test(stroke)) return 'mark';
    return null;
  };
  const visible = (el) => {
    for (let n = el; n && n.tagName !== 'svg'; n = n.parentNode) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.05) return false;
      if (n.getAttribute && Number(n.getAttribute('opacity') ?? 1) < 0.05) return false;
    }
    if (el.getAttribute('stroke-dasharray') === '1 1' && Number(el.getAttribute('stroke-dashoffset')) > 0.95) return false;
    return true;
  };
  // Clip paths on the element or its ancestors, as geometry elements to test points against.
  const clipsOf = (el, svg) => {
    const out = [];
    for (let n = el; n && n !== svg; n = n.parentNode) {
      const c = n.getAttribute && n.getAttribute('clip-path');
      const m = c && /url\(#([^)]+)\)/.exec(c);
      if (m) { const cp = svg.getElementById(m[1]); if (cp) out.push([...cp.querySelectorAll('path,rect,circle,ellipse,polygon')]); }
    }
    return out;
  };
  // Matrices relative to the icon's own user space (the viewBox), not to screen pixels.
  let base = null; // set by geometry() for the svg it measures
  const ctm = (el) => base.multiply(el.getCTM());
  const toLocal = (el, x, y) => new DOMPoint(x, y).matrixTransform(ctm(el).inverse());
  const toRoot = (el, x, y) => new DOMPoint(x, y).matrixTransform(ctm(el));
  const inFill = (el, x, y) => el.isPointInFill(toLocal(el, x, y));
  const inClips = (clips, x, y) => clips.every((list) => list.some((c) => inFill(c, x, y)));
  // Boundary samples of a shape in canvas units, pushed out by half its stroke when stroked.
  function samples(el, n = 72) {
    const len = el.getTotalLength();
    if (!(len > 0)) return [];
    const pts = [];
    for (let i = 0; i < n; i++) { const p = el.getPointAtLength(len * i / n); const r = toRoot(el, p.x, p.y); pts.push([r.x, r.y]); }
    return pts;
  }
  const scaleOf = (el) => { const m = ctm(el); return Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)); };
  const DIRS = Array.from({ length: 16 }, (_, i) => [Math.cos(i * Math.PI / 8), Math.sin(i * Math.PI / 8)]);
  const RADII = [0.1, 0.2, 0.3, 0.45, 0.6, 0.75, 0.9, 1.05, 1.2, 1.35, 1.5, 1.7, 1.9, 2.1];

  // With outlinesOnly, only the checks that matter mid-motion run: outlines peeking out,
  // corners missing an edge and edges with no outline. A gap may pass by during a motion.
  function geometry(svg, { outlinesOnly = false } = {}) {
    base = svg.getCTM().inverse();
    const els = [...svg.querySelectorAll('path,rect,circle,ellipse,line,polyline,polygon')];
    const shapes = [], outlines = [];
    for (const [order, el] of els.entries()) {
      const r = role(el);
      if (r === 'outline' && visible(el)) outlines.push({ el, order, clips: clipsOf(el, svg) });
      if (!r || r === 'outline' || !visible(el)) continue;
      const bb = el.getBBox();
      const corners = [[bb.x, bb.y], [bb.x + bb.width, bb.y], [bb.x, bb.y + bb.height], [bb.x + bb.width, bb.y + bb.height]].map(([x, y]) => toRoot(el, x, y));
      const box = [Math.min(...corners.map((p) => p.x)), Math.min(...corners.map((p) => p.y)), Math.max(...corners.map((p) => p.x)), Math.max(...corners.map((p) => p.y))];
      // A clipped shape shows only inside its clip.
      for (const list of clipsOf(el, svg)) {
        const cb = list.map((c) => { const b = c.getBBox(), p = toRoot(c, b.x, b.y), q = toRoot(c, b.x + b.width, b.y + b.height); return [Math.min(p.x, q.x), Math.min(p.y, q.y), Math.max(p.x, q.x), Math.max(p.y, q.y)]; });
        if (!cb.length) continue;
        box[0] = Math.max(box[0], Math.min(...cb.map((b) => b[0]))); box[1] = Math.max(box[1], Math.min(...cb.map((b) => b[1])));
        box[2] = Math.min(box[2], Math.max(...cb.map((b) => b[2]))); box[3] = Math.min(box[3], Math.max(...cb.map((b) => b[3])));
      }
      const fill = el.getAttribute('fill') || '';
      const stroked = (fill === 'none' || !fill) && el.getAttribute('stroke');
      // The width actually drawn: a stylesheet may set it over the attribute.
      const sw = stroked ? (parseFloat(getComputedStyle(el).strokeWidth) || Number(el.getAttribute('stroke-width')) || 1) * scaleOf(el) : 0;
      if (sw) { box[0] -= sw / 2; box[1] -= sw / 2; box[2] += sw / 2; box[3] += sw / 2; }
      shapes.push({ el, role: r, box, stroked: Boolean(stroked), sw, clips: clipsOf(el, svg), i: shapes.length, order });
    }
    const res = { layers: {}, widths: [], tiny: [], edge: [], pair: [], peek: [], joint: [], bare: [], text: svg.querySelectorAll('text').length };
    // Bounds of everything painted, outlines included (they reach 1 past their shape).
    const boxes = shapes.map((s) => s.box).concat(outlines.map((o) => {
      const bb = o.el.getBBox(), a = toRoot(o.el, bb.x, bb.y), b = toRoot(o.el, bb.x + bb.width, bb.y + bb.height);
      return [Math.min(a.x, b.x) - 1, Math.min(a.y, b.y) - 1, Math.max(a.x, b.x) + 1, Math.max(a.y, b.y) + 1];
    }));
    res.bounds = boxes.length ? [0, 1, 2, 3].map((i) => Math.round((i < 2 ? Math.min : Math.max)(...boxes.map((b) => b[i])) * 10) / 10) : null;
    for (const s of shapes) res.layers[s.role] = (res.layers[s.role] || 0) + 1;
    const area = (b) => (b[2] - b[0]) * (b[3] - b[1]);
    res.contentArea = Math.round(shapes.filter((s) => s.role === 'content').reduce((a, s) => a + area(s.box), 0) * 10) / 10;
    res.frontArea = Math.round(shapes.filter((s) => s.role === 'front').reduce((a, s) => a + area(s.box), 0) * 10) / 10;
    // A plain symbol body: the one back piece is the standard disc (Ø23) or tile (20.6) and
    // everything else is marks. PROMPT.md lets such interface symbols keep one layer.
    const backs = shapes.filter((s) => s.role === 'back' || s.role === 'front' || s.role === 'content');
    const near = (b, r) => b.every((v, i) => Math.abs(v - r[i]) < 0.35);
    res.plainBody = backs.length === 1 && backs[0].role === 'back'
      && (near(backs[0].box, [4, 1, 27, 24]) || near(backs[0].box, [5.2, 2.2, 25.8, 22.8]));
    const label = (s) => `${s.role}#${s.i}[${s.box.map((v) => v.toFixed(1)).join(',')}]`;

    // A point sits on a shape when it is inside the fill (or the stroke band of a stroked mark).
    const on = (s, x, y) => {
      // A point exactly on the line through a path's own vertices can test as outside, so
      // every test point is nudged off the grid by a hair.
      x += 0.0013; y += 0.0007;
      if (!inClips(s.clips, x, y)) return false;
      if (s.stroked) { const p = toLocal(s.el, x, y); return s.el.isPointInStroke(p); }
      return inFill(s.el, x, y);
    };

    const solid = shapes.filter((o) => o.role !== 'mark');
    if (!outlinesOnly) {
    // Line widths of stroked marks, and sizes of each piece of a mark.
    for (const s of shapes) {
      if (s.role !== 'mark') continue;
      // A wide stroke in the outline colour under a narrower fill stroke draws an outlined
      // tube (a shackle, a strand): a body, not a line. A stroke that stands on its own,
      // not over a body, is the object itself (Wi-Fi arcs, fog) and may be up to 2.8 wide.
      if (s.stroked && s.sw < 3) {
        const mid = s.el.getTotalLength() > 0 ? s.el.getPointAtLength(s.el.getTotalLength() / 2) : null;
        const c = mid && toRoot(s.el, mid.x, mid.y);
        const over = c && shapes.some((o) => o.i < s.i && o.role !== 'mark' && on(o, c.x, c.y));
        if (over || s.sw > 2.85) res.widths.push(Math.round(s.sw * 100) / 100);
      }
      const d = s.el.tagName === 'path' ? s.el.getAttribute('d') || '' : null;
      const parts = d ? d.split(/(?=M)/).filter((p) => p.trim()) : [null];
      for (const part of parts) {
        let box = s.box;
        if (part && parts.length > 1) {
          const tmp = s.el.cloneNode(); tmp.setAttribute('d', part); s.el.parentNode.appendChild(tmp);
          const bb = tmp.getBBox(); const a = toRoot(tmp, bb.x, bb.y), b = toRoot(tmp, bb.x + bb.width, bb.y + bb.height);
          box = [Math.min(a.x, b.x) - s.sw / 2, Math.min(a.y, b.y) - s.sw / 2, Math.max(a.x, b.x) + s.sw / 2, Math.max(a.y, b.y) + s.sw / 2];
          tmp.remove();
        }
        const w = box[2] - box[0], h = box[3] - box[1];
        if (Math.max(w, h) < 2.35 && Math.max(w, h) > 0.05) res.tiny.push(`${label(s)} ${w.toFixed(2)}×${h.toFixed(2)}`);
      }
    }
    // Distance from the boundary of `a` to the outside of container `c` (edge) or to shape `b` (pair).
    const visibleSamples = (s) => {
      let pts = samples(s.el);
      if (s.stroked) {
        // Offset the centreline both ways by half the width.
        const out = [];
        for (let i = 0; i < pts.length; i++) {
          const [x0, y0] = pts[(i + pts.length - 1) % pts.length], [x1, y1] = pts[(i + 1) % pts.length];
          const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, nx = -dy / l * s.sw / 2, ny = dx / l * s.sw / 2;
          out.push([pts[i][0] + nx, pts[i][1] + ny], [pts[i][0] - nx, pts[i][1] - ny]);
        }
        // Round and square caps reach past the ends of an open line.
        const cap = s.el.getAttribute('stroke-linecap');
        const len = s.el.getTotalLength();
        const a = len > 0 && s.el.getPointAtLength(0), b = len > 0 && s.el.getPointAtLength(len);
        if (a && (cap === 'round' || cap === 'square') && Math.hypot(a.x - b.x, a.y - b.y) > 0.01) {
          for (const end of [a, b]) {
            const c0 = toRoot(s.el, end.x, end.y);
            for (let k = 0; k < 16; k++) out.push([c0.x + Math.cos(k * Math.PI / 8) * s.sw / 2, c0.y + Math.sin(k * Math.PI / 8) * s.sw / 2]);
          }
        }
        pts = out;
      }
      s.raw = pts;
      return pts.filter(([x, y]) => inClips(s.clips, x, y));
    };
    // Only the parts of a shape that nothing painted later covers count.
    for (const s of shapes) s.pts = visibleSamples(s).filter(([x, y]) => !solid.some((o) => o.i > s.i && on(o, x, y)));
    const containers = shapes.filter((s) => s.role === 'back' || s.role === 'front' || s.role === 'content');
    for (const s of shapes) {
      if (s.role !== 'mark' && s.role !== 'content') continue;
      if (!s.pts.length) continue;
      const cx = (s.box[0] + s.box[2]) / 2, cy = (s.box[1] + s.box[3]) / 2;
      // The container: the topmost larger body painted before it that holds its centre.
      const c = containers.filter((o) => o.i < s.i && o !== s && area(o.box) > area(s.box) * 1.3 && (s.role === 'mark' || o.role !== 'content') && on(o, cx, cy)).pop();
      if (!c) continue;
      // Points of s outside c: it overlaps the edge, which counts as touching. A mark clipped
      // at the edge counts too, so the test uses the shape before its clip.
      const outside = s.raw.filter(([x, y]) => !on(c, x, y)).length;
      if (outside > 0) continue;
      let best = 9, at = null;
      for (const [x, y] of s.pts) {
        for (const r of RADII) {
          if (r >= best) break;
          // Past the container's edge, unless a later shape covers that spot (then the
          // mark meets that shape instead, which it overlaps).
          if (DIRS.some(([dx, dy]) => { const px = x + dx * r, py = y + dy * r; return !on(c, px, py) && !solid.some((o) => o.i > s.i && on(o, px, py)); })) { best = r; at = [x, y]; break; }
        }
      }
      if (best > 0.1 && best <= 1.35) res.edge.push(`${label(s)} in ${label(c)} gap≈${best} near ${at.map((v) => v.toFixed(1)).join(',')}`);
    }
    const marks = shapes.filter((s) => s.role === 'mark' && s.pts.length);
    for (let i = 0; i < marks.length; i++) for (let j = i + 1; j < marks.length; j++) {
      const a = marks[i], b = marks[j];
      const bx = [Math.max(a.box[0], b.box[0]) - 2.2, Math.max(a.box[1], b.box[1]) - 2.2, Math.min(a.box[2], b.box[2]) + 2.2, Math.min(a.box[3], b.box[3]) + 2.2];
      if (bx[0] > bx[2] || bx[1] > bx[3]) continue;
      if (a.pts.some(([x, y]) => on(b, x, y)) || b.pts.some(([x, y]) => on(a, x, y))) continue; // they touch
      let best = 9;
      for (const [x, y] of a.pts) for (const r of RADII) { if (r >= best) break; if (DIRS.some(([dx, dy]) => on(b, x + dx * r, y + dy * r))) { best = r; break; } }
      if (best > 0.1 && best <= 1.35) res.pair.push(`${label(a)} ~ ${label(b)} gap≈${best}`);
    }
    }
    // A covered part's outline must not show past the edge of the part in front of it. Walk
    // the middle of each outline band: a short visible stretch with covered stretches on
    // both sides is a bit of outline sticking out from behind something.
    const coveredAfter = (order, x, y) =>
      shapes.some((o) => o.order > order && o.role !== 'mark' && on(o, x, y))
      || outlines.some((o) => o.order > order && inClips(o.clips, x, y) && o.el.isPointInStroke(toLocal(o.el, x, y)));
    for (const o of outlines) {
      const len = o.el.getTotalLength();
      if (!(len > 0)) continue;
      const n = Math.min(600, Math.max(80, Math.round(len * 6))), step = len / n;
      const pts = [];
      for (let k = 0; k < n; k++) { const q = o.el.getPointAtLength(step * k); const r = toRoot(o.el, q.x, q.y); pts.push([r.x, r.y]); }
      const vis = pts.map(([x, y], k) => {
        const [ax, ay] = pts[(k + n - 1) % n], [bx, by] = pts[(k + 1) % n];
        const l = Math.hypot(bx - ax, by - ay);
        if (!(l > 1e-6) || l > step * 4) return null; // a jump between subpaths
        // The painted outline is the stroke outside the shape's own fill, mitred tips
        // included; test a fan of points across that band, since only its outer part, or
        // only a corner's tip, may stick out.
        return [0.5, 0.95].some((d) => DIRS.some(([dx, dy]) => {
          const px = x + dx * d, py = y + dy * d;
          if (inFill(o.el, px, py) || !o.el.isPointInStroke(toLocal(o.el, px, py))) return false;
          return inClips(o.clips, px, py) && !coveredAfter(o.order, px, py);
        }));
      });
      if (!vis.some((v) => v === false) || !vis.some((v) => v === true)) continue;
      const start = vis.findIndex((v) => v === false);
      let run = 0, from = -1;
      for (let j = 1; j <= n; j++) {
        const k = (start + j) % n, v = vis[k];
        if (v === true) { if (!run) from = k; run++; continue; }
        if (v === null) { run = 0; continue; }
        if (run && run * step < 2 && run * step > 0.15) {
          const mid = pts[(from + Math.floor(run / 2)) % n];
          res.peek.push(`${(run * step).toFixed(1)} long near ${mid.map((v) => v.toFixed(1)).join(',')}`);
        }
        run = 0;
      }
    }
    // Every edge of a coloured part that meets the background needs an outline. Step just
    // outside the part's boundary: if nothing is painted there, the edge must lie on an outline.
    const painted = (x, y) => shapes.some((q) => on(q, x, y)) || outlines.some((q) => inClips(q.clips, x, y) && q.el.isPointInStroke(toLocal(q.el, x, y)) && !inFill(q.el, x, y));
    for (const s of shapes) {
      // A solid deep fill (a tyre, a pipe) reads on its own and takes no outline.
      if ((s.role !== 'back' && s.role !== 'front') || /^url\(#pure-/.test(s.el.getAttribute('fill') || '')) continue;
      // A part shrunk to almost nothing (a sparkle before it appears) shows no edge at all.
      if (Math.max(s.box[2] - s.box[0], s.box[3] - s.box[1]) < 0.5) continue;
      const len = s.el.getTotalLength();
      if (!(len > 0)) continue;
      const n = Math.min(400, Math.max(60, Math.round(len * 3))), step = len / n;
      let run = 0, worst = 0, at = null;
      // The step out is taken in the part's own coordinates, so a part squashed mid-flip,
      // whose outline is squashed with it, is judged against that squashed outline.
      for (let k = 0; k <= n; k++) {
        const q = s.el.getPointAtLength(step * (k % n)), q2 = s.el.getPointAtLength(step * ((k + 1) % n));
        const a = toRoot(s.el, q.x, q.y);
        const l = Math.hypot(q2.x - q.x, q2.y - q.y);
        let bare = false;
        if (l > 1e-6 && l < step * 4) {
          const ux = -(q2.y - q.y) / l * 0.5, uy = (q2.x - q.x) / l * 0.5;
          const out1 = toRoot(s.el, q.x + ux, q.y + uy), out2 = toRoot(s.el, q.x - ux, q.y - uy);
          const o = on(s, out1.x, out1.y) ? out2 : out1;
          bare = inClips(s.clips, a.x, a.y) && !painted(o.x, o.y) && !solid.some((x) => x.i > s.i && on(x, a.x, a.y));
        }
        // Run lengths are measured on the canvas, whatever the part's own scale.
        const next = toRoot(s.el, q2.x, q2.y), d = Math.hypot(next.x - a.x, next.y - a.y);
        if (bare) { run += d; if (run > worst) { worst = run; at = [a.x, a.y]; } } else run = 0;
      }
      if (worst > 1) res.bare.push(`${worst.toFixed(1)} long near ${at.map((v) => v.toFixed(1)).join(',')}`);
    }

    // Sharp corners of outlined parts must either sit on another part's edge (a hinge, where
    // the outlines run on as one) or keep clear of it. A corner just off an edge makes the two
    // outlines meet in a small step, and the corner's mitred tip sticks out as a spike.
    for (const o of outlines) {
      const len = o.el.getTotalLength();
      if (!(len > 0)) continue;
      const n = Math.min(800, Math.max(100, Math.round(len * 8))), step = len / n;
      const pts = [];
      for (let k = 0; k < n; k++) { const q = o.el.getPointAtLength(step * k); const r = toRoot(o.el, q.x, q.y); pts.push([r.x, r.y]); }
      const dir = (k) => { const a = pts[(k + n - 1) % n], b = pts[(k + 1) % n]; return Math.atan2(b[1] - a[1], b[0] - a[0]); };
      const turn = (k) => { let d = Math.abs(dir((k + 2) % n) - dir((k + n - 2) % n)); if (d > Math.PI) d = 2 * Math.PI - d; return d; };
      for (let k = 0; k < n; k++) {
        const t = turn(k);
        if (t < 0.7 || t < turn((k + 1) % n) || t < turn((k + n - 1) % n)) continue;
        const [cx, cy] = pts[k];
        // Ignore a jump between subpaths, and corners hidden behind later parts.
        if (Math.hypot(pts[(k + 1) % n][0] - cx, pts[(k + 1) % n][1] - cy) > step * 4) continue;
        if (coveredAfter(o.order, cx, cy)) continue;
        // Only convex corners have a tip that points out; a corner of a hole points in.
        if (DIRS.filter(([dx, dy]) => inFill(o.el, cx + dx * 0.3, cy + dy * 0.3)).length > 7) continue;
        // The corner's mitred tip: the part of its painted outline 1–1.4 out from the corner.
        // It matters only where nothing else covers it.
        const bare = (x, y) => !outlines.some((q) => q !== o && (inFill(q.el, x, y) || q.el.isPointInStroke(toLocal(q.el, x, y))))
          && !shapes.some((q) => q.role !== 'mark' && q.el !== o.el && q.order !== o.order - 1 && on(q, x, y) && q.order > o.order);
        const tip = [1, 1.3].some((r) => DIRS.some(([dx, dy]) => {
          const x = cx + dx * r, y = cy + dy * r;
          return o.el.isPointInStroke(toLocal(o.el, x, y)) && !inFill(o.el, x, y) && bare(x, y);
        }));
        if (!tip) continue;
        for (const other of outlines) {
          if (other === o) continue;
          const inside = inFill(other.el, cx, cy);
          let d = 9;
          for (const r of [0.05, 0.15, 0.3, 0.45, 0.6, 0.8, 1]) {
            if (DIRS.some(([dx, dy]) => inFill(other.el, cx + dx * r, cy + dy * r) !== inside)) { d = r; break; }
          }
          if (d > 0.05 && d <= 1) { res.joint.push(`corner near ${cx.toFixed(1)},${cy.toFixed(1)} sits ${d} from another part's edge`); break; }
        }
      }
    }
    return res;
  }


  // ----- motion -----
  // The markup of an icon at equal steps of real time. Every start tag gets its transform
  // written as one matrix (identity when it has none), so an icon that drops its transform
  // when a swing reaches exactly 0 still reads as continuous.
  const NUM = /-?\d*\.?\d+(?:e-?\d+)?/g;
  const mul = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
  function matrix(tr) {
    let m = [1, 0, 0, 1, 0, 0];
    for (const [, name, body] of (tr || '').matchAll(/(\w+)\(([^)]*)\)/g)) {
      const n = body.trim().split(/[\s,]+/).map(Number);
      if (name === 'translate') m = mul(m, [1, 0, 0, 1, n[0], n[1] || 0]);
      else if (name === 'scale') m = mul(m, [n[0], 0, 0, n[1] ?? n[0], 0, 0]);
      else if (name === 'matrix') m = mul(m, n);
      else if (name === 'skewX') m = mul(m, [1, 0, Math.tan(n[0] * Math.PI / 180), 1, 0, 0]);
      else if (name === 'skewY') m = mul(m, [1, Math.tan(n[0] * Math.PI / 180), 0, 1, 0, 0]);
      else if (name === 'rotate') {
        const r = n[0] * Math.PI / 180, c = Math.cos(r), si = Math.sin(r), x = n[1] || 0, y = n[2] || 0;
        m = mul(m, [c, si, -si, c, x - c * x + si * y, y - si * x - c * y]);
      }
    }
    return m.map((v) => +v.toFixed(4));
  }
  const canonical = (svg) => svg.replace(/<([a-zA-Z]+)((?:\s+[:\w-]+="[^"]*")*)\s*(\/?)>/g, (all, tag, attrs, end) => {
    const tr = /\stransform="([^"]*)"/.exec(attrs);
    return `<${tag}${attrs.replace(/\stransform="[^"]*"/, '')} m="${matrix(tr && tr[1]).join(' ')}"${end}>`;
  });
  // Returns, per step between samples, how far the furthest number moved (null where the
  // structure changes), and the steps where one number jumps far more than around it.
  function motion(frames) {
    const marks = frames.map((svg) => {
      if (!svg) return null;
      const body = canonical(svg);
      return { shape: body.replace(NUM, '#'), nums: (body.match(NUM) || []).map(Number) };
    });
    const speed = marks.slice(1).map((b, k) => {
      const a = marks[k];
      if (!a || !b || a.shape !== b.shape) return null;
      return Math.round(Math.max(0, ...a.nums.map((n, i) => Math.abs(b.nums[i] - n))) * 1000) / 1000;
    });
    // steps: every step where the markup changes discontinuously; spikes: only those where a
    // number jumps (a change of structure, such as a flap moving behind, may be by design).
    const steps = [], spikes = [];
    for (let k = 0; k + 1 < marks.length; k++) {
      const a = marks[k], b = marks[k + 1];
      if (!a || !b) continue;
      if (a.shape !== b.shape) { steps.push(k); continue; }
      const step = (j, i) => (marks[j] && marks[j + 1] && marks[j].shape === marks[j + 1].shape ? Math.abs(marks[j + 1].nums[i] - marks[j].nums[i]) : 0);
      for (let i = 0; i < a.nums.length; i++) {
        const s = Math.abs(b.nums[i] - a.nums[i]);
        if (s > 0.5 && s > 4 * Math.max(step(k - 1, i), step(k + 1, i), 0.05)) { steps.push(k); spikes.push(k); break; }
      }
    }
    return { speed, steps, spikes };
  }
  // Each finding has a weight; an icon starts at 100 and loses the weight of every finding.
  const RULES = {
    error:        { w: 40, area: 'motion', text: 'draw() throws or writes NaN/undefined' },
    still:        { w: 25, area: 'motion', text: 'nothing moves on hover' },
    faint:        { w: 8,  area: 'motion', text: 'the hover barely changes the icon' },
    jump:         { w: 15, area: 'motion', text: 'a frame jumps: one step changes far more than the steps around it' },
    abrupt:       { w: 8,  area: 'motion', text: 'still moving fast when the hover ends, so it stops abruptly' },
    leaves:       { w: 10, area: 'motion', text: 'a frame reaches more than 2 units outside the 31×31 canvas' },
    endSize:      { w: 6,  area: 'motion', text: 'the hover end is much larger or smaller than the rest pose' },
    small:        { w: 12, area: 'shape',  text: 'the rest pose is smaller than its keyline' },
    large:        { w: 10, area: 'shape',  text: 'the rest pose is larger than the 23×23 keyline (plus outline)' },
    offCentre:    { w: 8,  area: 'shape',  text: 'the rest pose is off the centre (15.5, 12.5)' },
    light:        { w: 6,  area: 'shape',  text: 'covers much less area than the set at 24px (reads light)' },
    heavy:        { w: 6,  area: 'shape',  text: 'covers much more area than the set at 24px (reads heavy)' },
    oneLayer:     { w: 10, area: 'shape',  text: 'only one layer: no front piece and no large white content (a symbol on the plain disc or tile is exempt)' },
    strokeWidth:  { w: 5,  area: 'shape',  text: 'a mark uses a line width outside 1.6 / 2.2 / 2.6 / 2.0 / 1.2' },
    tiny:         { w: 6,  area: 'shape',  text: 'a mark or detail is smaller than 2.4 units' },
    edgeGap:      { w: 6,  area: 'shape',  text: 'a mark or white content leaves a sliver (under ~1.4 units) to the edge of its shape' },
    markGap:      { w: 3,  area: 'shape',  text: 'two marks leave a sliver (under ~1.4 units) between them' },
    text:         { w: 3,  area: 'shape',  text: 'uses <text>; allowed only when the glyph is the semantic core' },
    peek:         { w: 12, area: 'shape',  text: 'the outline of a covered part shows past the edge of the part in front' },
    bare:         { w: 20, area: 'shape',  text: 'a filled part meets the background with no outline along that edge' },
    joint:        { w: 12, area: 'shape',  text: 'a sharp corner of an outlined part sits just off another part\'s edge, so the outlines meet in a notch or spike' }
  };

  const ALLOWED = [1.6, 2.2, 2.6, 2.0, 1.2];
  const near = (a, b, t = 0.06) => Math.abs(a - b) <= t;
  // geo: [rest, end, ...poses during the motion]; mids gives the time of each of those poses.
  let mids = [];
  const tag = (i) => (i === 0 ? 'rest: ' : i === 1 ? 'end: ' : `t=${mids[i - 2]}: `);
  const uniq = (geo, key) => [...new Set(geo.flatMap((g, i) => (g && !g.failed && g[key] ? g[key].map((s) => tag(i) + s) : [])))];

  // The canvas box of every visible part of a live <svg>, in document order (null for a part
  // hidden in this pose). Compared frame by frame, these show a part that jumps on screen,
  // which numbers in the markup cannot: a path may list its points in another order and
  // still draw the same shape.
  function boxes(svg) {
    base = svg.getCTM().inverse();
    return [...svg.querySelectorAll('path,rect,circle,ellipse,line,polyline,polygon')].filter((el) => role(el)).map((el) => {
      if (!visible(el)) return null;
      const bb = el.getBBox();
      if (!(bb.width + bb.height > 0)) return null;
      const c = [[bb.x, bb.y], [bb.x + bb.width, bb.y], [bb.x, bb.y + bb.height], [bb.x + bb.width, bb.y + bb.height]].map(([x, y]) => toRoot(el, x, y));
      return [Math.min(...c.map((p) => p.x)), Math.min(...c.map((p) => p.y)), Math.max(...c.map((p) => p.x)), Math.max(...c.map((p) => p.y))].map((v) => Math.round(v * 100) / 100);
    });
  }
  // Steps where some part's box moves far more than it does in the steps around it.
  function boxJumps(frames) {
    const out = [];
    const move = (k, i) => {
      const a = frames[k] && frames[k][i], b = frames[k + 1] && frames[k + 1][i];
      return a && b ? Math.max(...a.map((v, j) => Math.abs(b[j] - v))) : null;
    };
    for (let k = 0; k + 1 < frames.length; k++) {
      const n = frames[k] ? frames[k].length : 0;
      for (let i = 0; i < n; i++) {
        const s = move(k, i);
        if (s === null) continue;
        const around = Math.max(move(k - 1, i) || 0, move(k + 1, i) || 0, 0.05);
        if (s > 0.8 && s > 4 * around) { out.push(k); break; }
      }
    }
    return out;
  }

  // Findings from geometry() of the rest pose and the end of the hover.
  function shapeFindings(geo, times = []) {
    mids = times;
    const found = [], add = (id, detail) => found.push({ id, detail });
    const [gr] = geo;
    if (gr && !gr.failed) {
      const L = gr.layers;
      const hasFront = (L.front || 0) > 0 && gr.frontArea > 20;
      const hasContent = gr.contentArea > 40;
      if (!hasFront && !hasContent && (L.back || 0) <= 1 && !gr.plainBody) add('oneLayer', JSON.stringify(L));
      const odd = [...new Set(gr.widths)].filter((w) => !ALLOWED.some((a) => near(w, a)));
      if (odd.length) add('strokeWidth', odd.join(', '));
      if (gr.tiny.length) add('tiny', gr.tiny.slice(0, 3).join('; '));
      if (gr.text) add('text', `${gr.text} <text>`);
    }
    const ends = geo.slice(0, 2);
    const edge = uniq(ends, 'edge'), pair = uniq(ends, 'pair'), peek = uniq(geo, 'peek'), bare = uniq(geo, 'bare'), joint = uniq(geo, 'joint');
    if (edge.length) add('edgeGap', edge.slice(0, 3).join('; '));
    if (peek.length) add('peek', peek.slice(0, 4).join('; '));
    if (bare.length) add('bare', bare.slice(0, 3).join('; '));
    if (joint.length) add('joint', joint.slice(0, 4).join('; '));
    if (pair.length) add('markGap', pair.slice(0, 3).join('; '));
    const failed = geo.find((g) => g && g.failed);
    if (failed) add('error', 'geometry: ' + failed.failed);
    return found;
  }

  // Findings from the rest and end bounds alone (outlines included): size, centring and
  // how far the hover reaches.
  function sizeFindings(rest, end) {
    const found = [], add = (id, detail) => found.push({ id, detail });
    if (!rest) return found;
    const w = rest[2] - rest[0], h = rest[3] - rest[1], mx = Math.max(w, h);
    // Keylines (fills) are 23 (circle), 20.6 (square), 23×18.4; outlines add 1 all round.
    // Thin or diagonal objects may run long; what counts is the space they take up.
    if (mx < 21.6 && w * h < 400) add('small', `${w.toFixed(1)}×${h.toFixed(1)}`);
    if (mx > 28.5 || (mx > 27.2 && w * h > 560) || Math.min(w, h) > 26) add('large', `${w.toFixed(1)}×${h.toFixed(1)}`);
    const cx = (rest[0] + rest[2]) / 2, cy = (rest[1] + rest[3]) / 2;
    if (Math.abs(cx - 15.5) > 1.3 || Math.abs(cy - 12.5) > 1.6) add('offCentre', `centre ${cx.toFixed(1)},${cy.toFixed(1)}`);
    if (end && (end[0] < -2 || end[1] < -5 || end[2] > 33 || end[3] > 30)) add('leaves', `end box ${end.join(',')}`);
    return found;
  }

  // Findings from motion() alone, for a set checked without pixels: nothing moves, the
  // markup jumps, or it is still moving fast at the end.
  function motionFindings(mo, jumpSteps) {
    const found = [], add = (id, detail) => found.push({ id, detail });
    const sp = mo.speed.filter((v) => v !== null), peak = Math.max(0, ...sp), last = mo.speed[mo.speed.length - 1] ?? 0;
    if (!sp.length || peak === 0) { add('still'); return found; }
    // The first step is the fastest by design (strong ease-out), so it is not judged.
    const jumps = (jumpSteps || mo.spikes).filter((k) => k > 0);
    if (jumps.length) add('jump', `between samples ${jumps.slice(0, 3).map((k) => `${k}–${k + 1}`).join(', ')} of ${mo.speed.length}`);
    if (last > 0.15 && last > peak * 0.3) add('abrupt', `last step moves ${last}, the fastest ${peak}`);
    return found;
  }
  const score = (found) => Math.max(0, 100 - found.reduce((a, x) => a + (RULES[x.id] ? RULES[x.id].w : 0), 0));
  // An icon may declare findings it keeps on purpose, each with its reason:
  //   allow: { leaves: 'the lid lifts clear of the bin' }
  // Those are reported apart, with the reason, and cost no points.
  const split = (found, allow) => ({
    found: found.filter((x) => !(allow && allow[x.id])),
    allowed: found.filter((x) => allow && allow[x.id]).map((x) => ({ ...x, reason: allow[x.id] }))
  });

  return { geometry, motion, boxes, boxJumps, role, RULES, shapeFindings, sizeFindings, motionFindings, score, split };
})();
