/*
 * Painted Georgian Bay scene, drawn entirely in SVG.
 * Day (7am–7pm, visitor's local time) or night; crossfades if the hour turns while the page is open.
 * Variants: "hero" (full scene with the figure) and "band" (a strip of shoreline for inner pages).
 */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const HORIZON = 600;
  const root = document.documentElement;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const PALETTES = {
    day: {
      sky: ["#86AFCB", "#C6D6D8", "#F1D8AE", "#F2B98A"],
      sun: "#FFF1C9", glow: "#F9D28A", sunAt: [1170, 570], sunR: 50,
      cloud: ["#FBF0E2", "#F4D2C3", "#EDBFA6", "#D9E3E4"],
      far: "#8FA79E", near: "#3F5C55", pine: "#24332E",
      water: ["#E8C59A", "#A4B7B2", "#406E78", "#22445A"],
      rock: ["#E2CDBE", "#B79C8E", "#7A625B"], crack: "#5E4A45",
      figure: "#2A2622", stars: 0,
    },
    night: {
      sky: ["#132238", "#2D4665", "#6C7EA0", "#D7A2A0"],
      sun: "#F1ECE3", glow: "#AFC0DA", sunAt: [1150, 512], sunR: 32,
      cloud: ["#5A6C90", "#8C8DB0", "#C8999F", "#3E5175"],
      far: "#3C4E6A", near: "#121D2A", pine: "#0A111A",
      water: ["#8E90AA", "#4A5D7C", "#1D3046", "#0E1A29"],
      rock: ["#646B86", "#3C4259", "#1E2333"], crack: "#141826",
      figure: "#0D131B", stars: 70,
    },
  };

  // a profile facing right: forehead, nose, lips, chin, throat, shoulders
  const PROFILE =
    "M140 1000 C150 900 230 860 290 840 C300 800 300 740 290 700 C240 680 210 620 215 540 " +
    "C220 400 320 300 430 305 C530 310 590 380 595 460 C597 490 600 510 612 530 " +
    "C618 545 612 555 618 565 C630 590 650 615 655 630 C657 640 645 648 632 650 " +
    "C628 662 640 672 638 682 C636 692 628 696 630 704 C634 714 628 724 622 730 " +
    "C625 755 610 775 585 780 C560 785 530 780 505 790 C495 830 500 870 530 900 " +
    "C600 930 680 960 720 1000 Z";

  function rng(seed) {
    return () => {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const f = (n) => n.toFixed(1);
  const pts = (list) => "M" + list.map(([x, y]) => `${f(x)} ${f(y)}`).join(" L") + " Z";

  // ---------- the far shore: tiered spruce and rounded hardwoods ----------
  function spruce(x, g, h) {
    const w = h * 0.3, tiers = 5, left = [];
    for (let k = 0; k < tiers; k++) {
      const t0 = k / tiers, t1 = (k + 1) / tiers;
      left.push([x - w * (1 - t0) * 0.5, g - h * t0 * 0.9], [x - w * (1 - t1) * 0.28, g - h * t1 * 0.9]);
    }
    const right = left.slice().reverse().map(([px, py]) => [2 * x - px, py]);
    return " " + pts([...left, [x, g - h], ...right]);
  }
  const dome = (x, g, r, ry) => ` M${f(x - r)} ${f(g)} a${f(r)} ${f(ry)} 0 0 1 ${f(2 * r)} 0 Z`;
  const blob = (cx, cy, rx, ry) =>
    ` M${f(cx - rx)} ${f(cy)} a${f(rx)} ${f(ry)} 0 1 1 ${f(2 * rx)} 0 a${f(rx)} ${f(ry)} 0 1 1 ${f(-2 * rx)} 0 Z`;
  function forest(rand, { x0 = -300, x1 = 1900, base = HORIZON, hill, phase = 0, min, max, gap = [3, 8] }) {
    const ground = (x) => base - hill * (0.5 + 0.5 * Math.sin(x * 0.0019 + phase)) - hill * 0.3 * Math.sin(x * 0.0063 + phase * 1.7);
    let d = `M${x0} ${base + 6}`;
    for (let x = x0; x <= x1; x += 25) d += ` L${x} ${f(ground(x) + 4)}`;
    d += ` L${x1} ${base + 6} Z`;
    for (let x = x0; x < x1;) {
      const g = ground(x) + 4, kind = rand(), h = min + rand() * (max - min);
      if (kind < 0.62) d += spruce(x, g, h);
      else d += dome(x, g, h * 0.38, h * 0.42) + dome(x + h * 0.25, g, h * 0.3, h * 0.3);
      x += gap[0] + rand() * (gap[1] - gap[0]);
    }
    return d;
  }

  // ---------- wind-swept Georgian Bay pine (local coords: base at 0,0, ~300 tall) ----------
  // The trunk bends with the prevailing wind; branches grow in a few irregular pads,
  // almost all on the leeward side, with sky showing between them.
  function pine(rand, color, id) {
    const H = 300;
    const P = (t) => [
      2 * (1 - t) * t * -34 + t * t * 38,
      2 * (1 - t) * t * -140 + t * t * -H,
    ];
    const L = [], R = [];
    for (let i = 0; i <= 14; i++) {
      const t = i / 14, [x, y] = P(t), w = 8 - t * 6.4;
      L.push([x - w, y]); R.unshift([x + w, y]);
    }
    let limbs = "", pads = "";

    const tiers = [
      { t: 0.44, reach: 150 }, { t: 0.58, reach: 120 }, { t: 0.66, reach: 70 },
      { t: 0.8, reach: 135 }, { t: 0.93, reach: 95 },
    ];
    for (const { t, reach: base } of tiers) {
      const [x, y] = P(t + (rand() - 0.5) * 0.03);
      const reach = base * (0.8 + rand() * 0.4);
      const tip = [x + reach, y - reach * 0.2];
      limbs += `<path d="M${f(x)} ${f(y)} Q${f(x + reach * 0.55)} ${f(y + 8)} ${f(tip[0])} ${f(tip[1])}"/>`;
      if (rand() < 0.5) {                     // a short windward stub
        const back = reach * (0.18 + rand() * 0.15);
        limbs += `<path d="M${f(x)} ${f(y)} Q${f(x - back * 0.5)} ${f(y - 2)} ${f(x - back)} ${f(y - 10)}"/>`;
        pads += blob(x - back, y - 12, 12 + rand() * 6, 5);
      }
      // a pad of foliage: overlapping, slightly upturned toward the tip
      const n = 6 + Math.floor(rand() * 4);
      for (let k = 0; k < n; k++) {
        const s = 0.3 + rand() * 0.75;
        const cx = x + (tip[0] - x) * s, cy = y + (tip[1] - y) * s - 6 + (rand() - 0.5) * 10;
        pads += blob(cx, cy, 12 + rand() * 20 * s + 6, 5 + rand() * 6);
      }
    }
    // the flat, wind-combed crown
    const [tx, ty] = P(1);
    pads += blob(tx + 30, ty + 2, 46, 11) + blob(tx + 70, ty + 10, 30, 8) + blob(tx + 8, ty - 4, 22, 9);

    return `<g fill="${color}" stroke="${color}" filter="url(#${id}-bristle)">
      <path d="${pts([...L, ...R])}" stroke="none"/>
      <g fill="none" stroke-width="3.2" stroke-linecap="round">${limbs}</g>
      <path d="${pads}" stroke="none"/>
    </g>`;
  }

  // ---------- pink granite whaleback sloping into the bay ----------
  function outcrop(p, rand, id) {
    const top =
      "M1140 708 C1170 700 1200 690 1240 686 C1270 668 1300 660 1340 662 C1380 664 1400 668 1420 660 " +
      "C1460 640 1500 630 1550 628 C1600 626 1640 612 1700 606 L1790 604";
    const shore =
      " L1790 940 L1700 905 C1640 880 1600 870 1560 850 C1520 830 1480 826 1450 808 " +
      "C1410 786 1370 780 1340 762 C1300 742 1260 735 1230 724 C1200 716 1170 714 1140 708 Z";
    const front = // a lower slab in the foreground
      "M1470 1010 C1500 950 1560 912 1640 896 C1690 886 1740 882 1790 884 L1790 1010 Z";
    // glacial scour: long, gentle grooves following the slope
    let grooves = "";
    for (let i = 0; i < 4; i++) {
      const o = 22 + i * 30;
      grooves += `M${1250 + i * 30} ${700 + o * 0.6} C${1360 + i * 20} ${688 + o} ${1520} ${650 + o * 1.4} ${1780} ${618 + o * 1.7} `;
    }
    let cracks = "";
    for (const [x, y] of [[1310, 690], [1470, 668], [1600, 650]]) {
      cracks += `M${x} ${y} q${f(8 + rand() * 8)} ${f(30 + rand() * 20)} ${f(2 + rand() * 6)} ${f(60 + rand() * 40)} `;
    }
    const juniper = dome(1318, 666, 20, 11) + dome(1336, 666, 13, 8) +
                    dome(1588, 630, 28, 13) + dome(1616, 624, 18, 10) + dome(1700, 610, 22, 10);
    const sitter = (x, y) =>
      `<circle cx="${x}" cy="${y - 21}" r="4.6"/>` +
      `<path d="M${x - 4.5} ${y - 15} Q${x - 6} ${y - 5} ${x - 4} ${y} L${x + 7} ${y} L${x + 11} ${y + 4} L${x + 9} ${y + 6} L${x + 4} ${y + 3} L${x - 2} ${y + 3} Z"/>`;

    return `
    <g filter="url(#${id}-ripple)" opacity=".35">
      <path d="M1140 710 C1200 720 1260 738 1340 766 C1420 792 1520 834 1700 908 L1700 940 C1520 868 1420 822 1340 792 C1260 764 1200 742 1140 722 Z" fill="${p.rock[2]}"/>
    </g>
    <g filter="url(#${id}-edge)">
      <path d="${dome(1104, 714, 22, 9)}${dome(1072, 716, 10, 4)}" fill="${p.rock[1]}"/>
      <path d="${top}${shore}" fill="url(#${id}-rock)"/>
      <path d="${grooves}" fill="none" stroke="${p.rock[0]}" stroke-width="1.6" opacity=".35"/>
      <path d="${cracks}" fill="none" stroke="${p.crack}" stroke-width="1.6" opacity=".4" stroke-linecap="round"/>
      <path d="M1140 708 C1200 720 1260 736 1340 764 C1420 792 1520 832 1700 906" fill="none" stroke="${p.rock[2]}" stroke-width="10" opacity=".5"/>
      <path d="${top}" fill="none" stroke="${p.rock[0]}" stroke-width="4" opacity=".75" stroke-linecap="round"/>
      <path d="${front}" fill="url(#${id}-rock)"/>
      <path d="M1470 1010 C1500 950 1560 912 1640 896 C1690 886 1740 882 1790 884" fill="none" stroke="${p.rock[0]}" stroke-width="4" opacity=".7"/>
      <path d="${juniper}" fill="${p.pine}"/>
    </g>
    <g transform="translate(1500 638) scale(.42)">${pine(rand, p.pine, id)}</g>`;
  }


  function clouds(rand, p, { n, x0, x1, y0, y1, rx, ry }) {
    let s = "";
    for (let i = 0; i < n; i++) {
      const cx = x0 + rand() * (x1 - x0), cy = y0 + rand() * (y1 - y0);
      const c = p.cloud[Math.floor(rand() * p.cloud.length)];
      s += `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx[0] + rand() * (rx[1] - rx[0]))}" ry="${f(ry[0] + rand() * (ry[1] - ry[0]))}" ` +
           `fill="${c}" opacity="${f(0.45 + rand() * 0.45)}" transform="rotate(${f(rand() * 6 - 3)} ${f(cx)} ${f(cy)})"/>`;
    }
    return s;
  }

  // broken column of light on the water beneath the sun / moon
  function sunPath(rand, p, cx, top, rows, spread) {
    let s = "";
    for (let i = 0; i < rows; i++) {
      const y = top + i * (spread / rows) * (1 + i * 0.04) + rand() * 3;
      const rx = (16 + rand() * 46) * (1 + i * 0.05);
      s += `<ellipse cx="${f(cx + (rand() - 0.5) * 18)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(1.2 + rand() * 2.4)}" ` +
           `fill="${i % 3 ? p.sun : p.glow}" opacity="${f(Math.max(0.1, (0.9 - i * 0.022) * (0.5 + rand() * 0.5)))}"/>`;
    }
    return s;
  }

  function glints(rand, p, n) {
    let s = "";
    for (let i = 0; i < n; i++) {
      const y = HORIZON + 6 + Math.pow(rand(), 1.5) * 390;
      const depth = (y - HORIZON) / 400;
      s += `<ellipse cx="${f(rand() * 1600)}" cy="${f(y)}" rx="${f(8 + depth * 90 * rand())}" ry="${f(0.8 + depth * 2.2)}" ` +
           `fill="${p.cloud[0]}" opacity="${f(0.12 + rand() * 0.25)}"/>`;
    }
    return s;
  }

  function stars(rand, n, [x0, y0, x1, y1]) {
    let s = "";
    for (let i = 0; i < n; i++) {
      s += `<circle cx="${f(x0 + rand() * (x1 - x0))}" cy="${f(y0 + rand() * (y1 - y0))}" r="${f(0.6 + rand() * 1.3)}" fill="#F3EDE2" opacity="${f(0.25 + rand() * 0.7)}"/>`;
    }
    return s;
  }

  // the figure: a woman in profile holding a pine island in the other light
  function figure(o, id) {
    const r = rng(31);
    const shore = forest(rng(9), { x0: 120, x1: 760, base: 640, hill: 4, min: 5, max: 13, gap: [2, 5] });
    const island = "M250 646 C275 622 330 606 395 606 C455 607 505 622 545 646 Z";
    return `
    <g filter="url(#${id}-edge)">
      <g clip-path="url(#${id}-figure)">
        <rect x="100" y="280" width="660" height="370" fill="url(#${id}-alt-sky)"/>
        ${stars(rng(21), o.stars / 3 | 0, [180, 300, 640, 600])}
        <circle cx="545" cy="520" r="${o.sunR * 3.2}" fill="url(#${id}-alt-glow)"/>
        <g filter="url(#${id}-soft)">${clouds(r, o, { n: 6, x0: 200, x1: 640, y0: 330, y1: 520, rx: [50, 130], ry: [5, 12] })}</g>
        <circle cx="545" cy="520" r="${o.sunR * 0.7}" fill="${o.sun}"/>
        <path d="${shore}" fill="${o.far}"/>
        <rect x="100" y="640" width="660" height="370" fill="url(#${id}-alt-water)"/>
        <g filter="url(#${id}-ripple)">${sunPath(rng(41), o, 545, 650, 22, 170)}</g>
        <path d="${island}" fill="url(#${id}-alt-rock)"/>
        <path d="M262 640 C300 618 360 610 400 611" fill="none" stroke="${o.rock[0]}" stroke-width="3" opacity=".6"/>
        <g transform="translate(392 612)">${pine(rng(51), o.pine, id)}</g>
      </g>
    </g>`;
  }

  function buildScene(time, variant) {
    const p = PALETTES[time];
    const o = PALETTES[time === "day" ? "night" : "day"];
    const id = `${time}-${variant}`;
    const r = rng(time === "day" ? 7 : 13);
    const [sx, sy] = p.sunAt;
    // same seeds day and night so the land doesn't shift when the light changes
    const far = forest(rng(3), { hill: 30, phase: 0.4, min: 7, max: 17, gap: [2, 6] });
    const near = forest(rng(5), { hill: 9, phase: 2.1, min: 14, max: 34 });

    return `
<svg class="scene" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" xmlns="${NS}" aria-hidden="true">
  <defs>
    <linearGradient id="${id}-sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${p.sky[0]}"/><stop offset=".5" stop-color="${p.sky[1]}"/>
      <stop offset=".82" stop-color="${p.sky[2]}"/><stop offset="1" stop-color="${p.sky[3]}"/>
    </linearGradient>
    <linearGradient id="${id}-alt-sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${o.sky[0]}"/><stop offset=".45" stop-color="${o.sky[1]}"/>
      <stop offset=".8" stop-color="${o.sky[2]}"/><stop offset="1" stop-color="${o.sky[3]}"/>
    </linearGradient>
    <linearGradient id="${id}-water" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${p.water[0]}"/><stop offset=".18" stop-color="${p.water[1]}"/>
      <stop offset=".55" stop-color="${p.water[2]}"/><stop offset="1" stop-color="${p.water[3]}"/>
    </linearGradient>
    <linearGradient id="${id}-alt-water" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${o.water[0]}"/><stop offset=".25" stop-color="${o.water[1]}"/>
      <stop offset=".7" stop-color="${o.water[2]}"/><stop offset="1" stop-color="${o.water[3]}"/>
    </linearGradient>
    <linearGradient id="${id}-rock" x1="0" y1="0" x2=".25" y2="1">
      <stop offset="0" stop-color="${p.rock[0]}"/><stop offset=".35" stop-color="${p.rock[1]}"/><stop offset="1" stop-color="${p.rock[2]}"/>
    </linearGradient>
    <linearGradient id="${id}-alt-rock" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${o.rock[0]}"/><stop offset=".5" stop-color="${o.rock[1]}"/><stop offset="1" stop-color="${o.rock[2]}"/>
    </linearGradient>
    <radialGradient id="${id}-glow"><stop offset="0" stop-color="${p.glow}" stop-opacity=".85"/><stop offset="1" stop-color="${p.glow}" stop-opacity="0"/></radialGradient>
    <radialGradient id="${id}-alt-glow"><stop offset="0" stop-color="${o.glow}" stop-opacity=".9"/><stop offset="1" stop-color="${o.glow}" stop-opacity="0"/></radialGradient>

    <!-- clouds: smeared, blurred strokes -->
    <filter id="${id}-soft" x="-20%" y="-60%" width="140%" height="220%">
      <feTurbulence type="fractalNoise" baseFrequency=".006 .03" numOctaves="3" seed="4" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="70" xChannelSelector="R" yChannelSelector="G" result="d"/>
      <feGaussianBlur in="d" stdDeviation="5"/>
    </filter>
    <!-- land: rough painted edge -->
    <filter id="${id}-paint" x="-5%" y="-30%" width="110%" height="160%">
      <feTurbulence type="fractalNoise" baseFrequency=".03 .06" numOctaves="2" seed="2" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="4" xChannelSelector="R" yChannelSelector="G" result="d"/>
      <feGaussianBlur in="d" stdDeviation=".6"/>
    </filter>
    <!-- small shapes: a slight wobble, like a loaded brush -->
    <filter id="${id}-edge" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="2" seed="8" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="6" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <!-- pine needles: a bristly edge on every pad -->
    <filter id="${id}-bristle" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="turbulence" baseFrequency=".18 .09" numOctaves="1" seed="3" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <filter id="${id}-blur"><feGaussianBlur stdDeviation="2.5"/></filter>
    <!-- water: horizontal ripple that drifts -->
    <filter id="${id}-ripple" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency=".0018 .07" numOctaves="2" seed="6" result="n">
        <animate attributeName="baseFrequency" dur="14s" repeatCount="indefinite"
                 values=".0018 .07; .0024 .082; .0018 .07"/>
      </feTurbulence>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="24" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <!-- oil-paint streaks laid over the whole canvas -->
    <filter id="${id}-streaks" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency=".0035 .22" numOctaves="3" seed="11"/>
      <feColorMatrix type="saturate" values="0"/>
    </filter>
    <clipPath id="${id}-figure">
      <path d="${PROFILE}"/>
      <circle cx="232" cy="418" r="62"/>
    </clipPath>
  </defs>

  <rect x="-300" y="-900" width="2200" height="${HORIZON + 900}" fill="url(#${id}-sky)"/>
  ${stars(r, p.stars, [-200, -650, 1800, 400])}
  <circle cx="${sx}" cy="${sy}" r="${p.sunR * 6}" fill="url(#${id}-glow)"/>
  <g filter="url(#${id}-soft)">${clouds(r, p, { n: 20, x0: -100, x1: 1700, y0: -600, y1: 470, rx: [140, 420], ry: [10, 30] })}</g>
  <circle cx="${sx}" cy="${sy}" r="${p.sunR}" fill="${p.sun}" filter="url(#${id}-edge)"/>

  <path d="${far}" fill="${p.far}" filter="url(#${id}-paint)"/>
  <path d="${near}" fill="${p.near}" filter="url(#${id}-paint)"/>

  <rect x="-300" y="${HORIZON}" width="2200" height="500" fill="url(#${id}-water)"/>
  <g filter="url(#${id}-ripple)">
    <g transform="translate(0 ${HORIZON * 2}) scale(1 -1)" opacity=".32" filter="url(#${id}-blur)">
      <path d="${far}" fill="${p.far}"/><path d="${near}" fill="${p.near}"/>
    </g>
    ${sunPath(r, p, sx, HORIZON + 6, 34, 330)}
    ${glints(r, p, 90)}
  </g>
  <g class="ripples" fill="none" stroke="${p.cloud[0]}"></g>
  ${outcrop(p, rng(61), id)}

  <rect x="-300" y="-900" width="2200" height="2000" filter="url(#${id}-streaks)" opacity=".2" style="mix-blend-mode:soft-light"/>
</svg>`;
  }

  // ---------- time of day ----------
  function currentTime() {
    const q = new URLSearchParams(location.search).get("time");
    if (q === "day" || q === "night") return q;
    const h = new Date().getHours();
    return h >= 7 && h < 19 ? "day" : "night";
  }

  const host = document.querySelector("[data-scene]");
  if (host) {
    const variant = host.dataset.scene;
    let svg;

    // inner-page bands show the shoreline; tall/narrow heroes reframe to keep the face in view
    function frame() {
      if (!svg) return;
      if (variant === "band") {
        svg.setAttribute("viewBox", innerWidth < 760 ? "0 120 1600 760" : "0 280 1600 600");
        svg.setAttribute("preserveAspectRatio", "xMaxYMin slice");
      } else {
        const tall = innerWidth / innerHeight < 0.85;
        svg.setAttribute("viewBox", tall ? "60 -700 780 1700" : "0 0 1600 1000");
        svg.setAttribute("preserveAspectRatio", tall ? "xMidYMax slice" : "xMidYMid slice");
      }
    }

    function paint(time) {
      const old = svg;
      host.insertAdjacentHTML("beforeend", buildScene(time, variant));
      svg = host.lastElementChild;
      frame();
      if (reduceMotion) svg.pauseAnimations();
      if (old) {
        svg.classList.add("scene--entering");
        requestAnimationFrame(() => requestAnimationFrame(() => svg.classList.remove("scene--entering")));
        setTimeout(() => old.remove(), 3000);
      }
    }

    let shown = root.dataset.time = currentTime();
    paint(shown);
    addEventListener("resize", frame);
    setInterval(() => {
      const t = currentTime();
      if (t !== shown) { shown = root.dataset.time = t; paint(t); }
    }, 60_000);

    // ripples where the pointer touches the water
    if (!reduceMotion) {
      let last = 0, lx = 0, ly = 0;
      host.parentElement.addEventListener("pointermove", (e) => {
        const now = performance.now();
        if (now - last < 90 || Math.hypot(e.clientX - lx, e.clientY - ly) < 28) return;
        const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
        if (pt.y < HORIZON + 8) return;
        last = now; lx = e.clientX; ly = e.clientY;
        ripple(svg.querySelector(".ripples"), pt.x, pt.y);
      });
    }
  }

  function ripple(group, x, y) {
    const depth = (y - HORIZON) / 400;           // ripples grow as they come closer
    const ring = document.createElementNS(NS, "ellipse");
    ring.setAttribute("cx", x); ring.setAttribute("cy", y);
    group.appendChild(ring);
    const t0 = performance.now(), dur = 1800;
    (function step(t) {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      ring.setAttribute("rx", 4 + e * 70 * (0.4 + depth));
      ring.setAttribute("ry", 1 + e * 9 * (0.4 + depth));
      ring.setAttribute("stroke-width", 1.6 - k);
      ring.setAttribute("opacity", 0.7 * (1 - k));
      k < 1 ? requestAnimationFrame(step) : ring.remove();
    })(t0);
  }

  // ---------- nav gains a backdrop once the page scrolls past the painting ----------
  const nav = document.querySelector(".nav");
  const onScroll = () => nav.classList.toggle("nav--solid", scrollY > (host ? host.offsetHeight - 80 : 40));
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();
