/**
 * Liquid Navbar "Waterline", from Nimbus UI by guglielmogiannattasio.it.
 * Ported from the React component to plain TypeScript; shader and physics unchanged.
 * A pill of water: the active drop stretches toward the picked item, splits into droplets on long
 * jumps and merges back with a ripple. The cursor lifts a meniscus and every tap sends a wave.
 * Without WebGL it falls back to a CSS drop (data-gl="off").
 */

const PAD = 14; // canvas bleed around the pill, for shadows and ripples

const VERT = `attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}`;
const FRAG = `precision highp float;
uniform vec2 uRes;uniform float uDpr;uniform float uTime;uniform vec4 uPill;
uniform vec4 uBlob[6];uniform float uSy[6];uniform vec4 uRip[6];uniform vec3 uMouse;uniform float uDark;uniform float uAmb;
float sdRB(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}
float sdCap(vec2 p,vec4 B,float sy){p-=B.xy;p.y/=sy;p.x=max(abs(p.x)-B.z,0.);return(length(p)-B.w)*min(1.,sy);}
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float dropD(vec2 p){float d=1e4;for(int i=0;i<6;i++){if(uBlob[i].w>.5){d=smin(d,sdCap(p,uBlob[i],uSy[i]),13.);}}return d;}
float pillD(vec2 p){vec2 h=uPill.zw*.5;return sdRB(p-uPill.xy-h,h,h.y);}
float lens(float d,float w){float t=clamp(-d/w,0.,1.);return sqrt(1.-(1.-t)*(1.-t));}
float waves(vec2 p){float w=0.;
 for(int i=0;i<6;i++){vec4 R=uRip[i];if(R.w>0.){float x=length(p-R.xy)-R.z*240.;w+=R.w*exp(-R.z*1.7)*sin(x*.3)*exp(-x*x/700.);}}
 vec2 m=p-uMouse.xy;w+=uMouse.z*3.6*exp(-dot(m,m)/1000.);
 w+=uAmb*(sin(p.x*.05+uTime*1.2)*.45+sin(p.x*.13-uTime*.85+p.y*.2)*.25);return w;}
float H(vec2 p){float dp=pillD(p);return lens(dp,uPill.w*.36)*2.4+lens(dropD(p),11.)*7.5+waves(p)*smoothstep(0.,7.,-dp);}
float caus(vec2 p,float t){vec2 q=p;float c=0.;for(int i=0;i<3;i++){q+=vec2(sin(q.y*1.1+t),cos(q.x*1.3-t*.7))*.6;c+=1./(1.+16.*abs(sin(q.x)*sin(q.y)));}return c/3.;}
void main(){
 vec2 p=vec2(gl_FragCoord.x,uRes.y*uDpr-gl_FragCoord.y)/uDpr;
 float dp=pillD(p);float dd=dropD(p);
 float h0=H(p);vec3 n=normalize(vec3(h0-H(p+vec2(1.,0.)),h0-H(p+vec2(0.,1.)),1.));
 vec3 V=vec3(0.,0.,1.);
 float spec=pow(max(dot(reflect(-normalize(vec3(-.45,-.8,.85)),n),V),0.),70.);
 float spec2=pow(max(dot(reflect(-normalize(vec3(.6,.75,.7)),n),V),0.),22.)*.3;
 float fres=clamp((1.-n.z)*4.,0.,1.);
 vec3 irid=.5+.5*cos(6.2831*(vec3(0.,.33,.67)+fres*.85+p.x*.0028+uTime*.035));
 float pm=smoothstep(1.,-1.,dp);float dm=smoothstep(1.,-1.,dd)*smoothstep(1.,-2.,dp);
 float sh=smoothstep(9.,-9.,dropD(p-vec2(0.,5.)))*(1.-dm)*pm*(.11+.07*uDark);
 vec3 c=vec3(0.,.14,.36)*sh;float a=sh;
 float pa=clamp(pm*(fres*.5+spec*.9+spec2),0.,1.);
 c=mix(vec3(1.),irid,.5*fres)*pa+c*(1.-pa);a=pa+a*(1.-pa);
 float th=lens(dd,11.);
 float cs=caus((p+n.xy*th*18.)*.085,uTime*.9);
 vec3 tint=mix(vec3(.80,.95,1.),vec3(.55,.82,1.),uDark);
 float rim=dm*(1.-smoothstep(0.,8.,-dd));
 float cres=dm*smoothstep(.12,.55,dot(n.xy,normalize(vec2(.55,.85))))*smoothstep(0.,3.,-dd);
 float body=.5+.5*clamp(-n.y*3.,-1.,1.);
 float da=dm*(.26+.14*body)*(1.-.35*uDark);vec3 dc=mix(tint,vec3(1.),body*.6);
 float la=rim*.22;vec3 lc=mix(vec3(0.,.42,.78),vec3(.1,.55,.95),uDark);dc=lc*la+dc*da*(1.-la);da=la+da*(1.-la);
 la=clamp(cres*.7+smoothstep(.6,1.,cs)*.28*th*dm,0.,1.);dc=vec3(1.)*la+dc*(1.-la);da=la+da*(1.-la);
 la=clamp(dm*(spec*1.2+spec2*.5),0.,1.);dc=vec3(1.)*la+dc*(1.-la);da=la+da*(1.-la);
 la=dm*smoothstep(-2.,0.,dd)*.4;dc=mix(vec3(1.),irid,.35)*la+dc*(1.-la);da=la+da*(1.-la);
 c=dc+c*(1.-da);a=da+a*(1.-da);
 gl_FragColor=vec4(c,a);
}`;

type Body = { x: number; v: number };
type Sat = { x: number; y: number; vx: number; vy: number; r: number; k: number };
type Rip = { x: number; y: number; age: number; amp: number };
type GLC = { gl: WebGLRenderingContext; u: Record<string, WebGLUniformLocation | null> };

function initGL(canvas: HTMLCanvasElement): GLC | null {
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false }) as WebGLRenderingContext | null;
  if (!gl) return null;
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  };
  const vs = sh(gl.VERTEX_SHADER, VERT);
  const fs = sh(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const p = gl.createProgram()!;
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return null;
  gl.useProgram(p);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(p, 'a');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const u: Record<string, WebGLUniformLocation | null> = {};
  for (const n of ['uRes', 'uDpr', 'uTime', 'uPill', 'uBlob', 'uSy', 'uRip', 'uMouse', 'uDark', 'uAmb']) u[n] = gl.getUniformLocation(p, n);
  return { gl, u };
}

function supportsRefraction() {
  const ua = navigator.userAgent;
  return /Chrome\/|Chromium\/|Edg\//.test(ua) && !/Firefox\//.test(ua) && CSS.supports?.('backdrop-filter', 'url(#a)');
}

export class LiquidNav {
  current = 0;
  private nav: HTMLElement;
  private items: HTMLElement[];
  private icons: (HTMLElement | null)[];
  private canvas: HTMLCanvasElement;
  private dropEl: HTMLElement;
  private dark = 0;
  private a: Body = { x: 0, v: 0 };
  private b: Body = { x: 0, v: 0 };
  private sy = { s: 1, v: 0 };
  private lead: 0 | 1 = 0;
  private lagFrom = 0;
  private sats: Sat[] = [];
  private rips: Rip[] = [];
  private t = { x: 0, cy: 0, q: 0, r: 21 };
  private q = 0;
  private mouse = { x: 0, y: 0, s: 0, on: false };
  private moving = false;
  private split = false;
  private ready = false;
  private w = 0;
  private h = 0;
  private visible = true;
  private reduce = false;
  private raf = 0;
  private last = 0;
  private time = 0;
  private glc: GLC | null = null;

  constructor(nav: HTMLElement, private onSelect?: (index: number) => void) {
    this.nav = nav;
    this.items = [...nav.querySelectorAll<HTMLElement>('.nimbus-item')];
    this.icons = this.items.map((el) => el.querySelector<HTMLElement>('.nv-ico'));
    this.canvas = nav.querySelector<HTMLCanvasElement>('.nimbus-water')!;
    this.dropEl = nav.querySelector<HTMLElement>('.nimbus-drop')!;
    this.current = Math.max(0, this.items.findIndex((el) => el.getAttribute('aria-current') === 'page'));
    this.dark = nav.dataset.tone === 'dark' ? 1 : 0;

    nav.dataset.refract = supportsRefraction() ? 'on' : 'off';
    this.reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.glc = initGL(this.canvas);
    if (!this.glc) nav.dataset.gl = 'off';
    this.canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.glc = null;
      nav.dataset.gl = 'off';
    });
    new IntersectionObserver(([e]) => {
      this.visible = e.isIntersecting;
      if (this.visible) this.loop();
    }).observe(nav);
    document.addEventListener('visibilitychange', () => {
      this.visible = document.visibilityState === 'visible';
      if (this.visible) this.loop();
    });
    let lastW = -1;
    new ResizeObserver(() => {
      if (nav.offsetWidth !== lastW) {
        lastW = nav.offsetWidth;
        this.ready = false;
        this.measure();
      }
    }).observe(nav);

    this.items.forEach((el, i) => el.addEventListener('click', () => this.select(i, true)));
    nav.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const n = (this.current + (e.key === 'ArrowRight' ? 1 : -1) + this.items.length) % this.items.length;
      this.items[n].focus();
    });
    nav.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const p = this.local(e.clientX, e.clientY);
      this.mouse.x = p.x;
      this.mouse.y = p.y;
      this.mouse.on = true;
      this.loop();
    });
    nav.addEventListener('pointerleave', () => {
      this.mouse.on = false;
      this.loop();
    });
    nav.addEventListener('pointerdown', (e) => {
      const p = this.local(e.clientX, e.clientY);
      this.ripple(p.x, p.y, 0.8);
    });
    this.measure();
  }

  setTone(tone: 'light' | 'dark') {
    this.nav.dataset.tone = tone;
    this.dark = tone === 'dark' ? 1 : 0;
    this.loop();
  }

  /** Move the drop to an item. `tap` plays the icon scene and reports the choice. */
  select(i: number, tap = false) {
    if (tap) {
      const icon = this.icons[i];
      const kind = this.items[i].dataset.fx || 'pop';
      if (icon && kind !== 'none') {
        icon.removeAttribute('data-fx');
        void icon.offsetWidth;
        icon.dataset.fx = kind;
      }
      const c = this.iconCenter(i);
      if (c && kind === 'drop') setTimeout(() => this.ripple(c.x, this.t.cy, 1.4), 430);
      if (c && kind === 'plane') this.ripple(c.x, c.y, 0.6);
      this.onSelect?.(i);
    }
    if (i === this.current) return;
    this.items[this.current]?.removeAttribute('aria-current');
    this.current = i;
    this.items[i].setAttribute('aria-current', 'page');
    this.measure();
  }

  private local(clientX: number, clientY: number) {
    const r = this.nav.getBoundingClientRect();
    return { x: clientX - r.left + PAD, y: clientY - r.top + PAD };
  }

  private ripple(x: number, y: number, amp: number) {
    if (this.reduce) return;
    this.rips.push({ x, y, age: 0, amp });
    this.loop();
  }

  private iconCenter(i: number) {
    const el = this.icons[i];
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return this.local(b.left + b.width / 2, b.top + b.height / 2);
  }

  private measure() {
    const el = this.items[this.current];
    if (!el) return;
    this.w = this.nav.offsetWidth;
    this.h = this.nav.offsetHeight;
    const T = this.t;
    T.r = el.offsetHeight / 2;
    T.q = Math.max(0, el.offsetWidth / 2 - T.r);
    T.cy = PAD + el.offsetTop + el.offsetHeight / 2;
    const nx = PAD + el.offsetLeft + el.offsetWidth / 2;
    if (!this.ready) {
      this.a.x = this.b.x = nx;
      this.q = T.q;
      this.ready = true;
    } else if (Math.abs(nx - T.x) > 0.5) {
      this.lead = Math.abs(nx - this.a.x) <= Math.abs(nx - this.b.x) ? 0 : 1;
      this.lagFrom = performance.now() + 70;
      this.moving = true;
      this.split = false;
    }
    T.x = nx;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const W = this.w + PAD * 2;
    const Hh = this.h + PAD * 2;
    if (this.canvas.width !== Math.round(W * dpr) || this.canvas.height !== Math.round(Hh * dpr)) {
      this.canvas.width = Math.round(W * dpr);
      this.canvas.height = Math.round(Hh * dpr);
      this.canvas.style.width = `${W}px`;
      this.canvas.style.height = `${Hh}px`;
    }
    this.loop();
  }

  private draw() {
    const T = this.t;
    const sep = Math.abs(this.a.x - this.b.x);
    const thin = Math.min(sep / (2 * (this.q + T.r) || 1), 1);
    const r = T.r * (1 - 0.3 * thin);
    if (this.glc) {
      const { gl: g, u } = this.glc;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      g.viewport(0, 0, g.drawingBufferWidth, g.drawingBufferHeight);
      g.uniform2f(u.uRes, this.w + PAD * 2, this.h + PAD * 2);
      g.uniform1f(u.uDpr, dpr);
      g.uniform1f(u.uTime, this.time);
      g.uniform4f(u.uPill, PAD, PAD, this.w, this.h);
      const blobs = new Float32Array(24);
      const sy = new Float32Array(6).fill(1);
      const head = this.lead === 0 ? this.a : this.b;
      const tail = this.lead === 0 ? this.b : this.a;
      blobs.set([head.x, T.cy, this.q * (1 - 0.25 * thin), T.r * (1 - 0.12 * thin), tail.x, T.cy, this.q * (1 - 0.8 * thin), T.r * (1 - 0.5 * thin)], 0);
      sy[0] = sy[1] = this.sy.s;
      this.sats.slice(0, 4).forEach((d, i) => blobs.set([d.x, d.y, 0, d.r], 8 + i * 4));
      g.uniform4fv(u.uBlob, blobs);
      g.uniform1fv(u.uSy, sy);
      const rips = new Float32Array(24);
      this.rips.slice(-6).forEach((p, i) => rips.set([p.x, p.y, p.age, p.amp], i * 4));
      g.uniform4fv(u.uRip, rips);
      g.uniform3f(u.uMouse, this.mouse.x, this.mouse.y, this.mouse.s);
      g.uniform1f(u.uDark, this.dark);
      g.uniform1f(u.uAmb, this.reduce ? 0 : 1);
      g.clearColor(0, 0, 0, 0);
      g.clear(g.COLOR_BUFFER_BIT);
      g.drawArrays(g.TRIANGLES, 0, 3);
    } else {
      const left = Math.min(this.a.x, this.b.x) - this.q - r - PAD;
      this.dropEl.style.width = `${sep + 2 * (this.q + r)}px`;
      this.dropEl.style.transform = `translateX(${left}px) scaleY(${this.sy.s})`;
    }
  }

  private step(dt: number, now: number) {
    const T = this.t;
    this.time += dt;
    this.q += (T.q - this.q) * Math.min(1, dt * 12);
    const bodies = [this.a, this.b];
    let still = true;
    if (this.reduce) {
      this.a.x = this.b.x = T.x;
      this.a.v = this.b.v = 0;
      this.sy.s = 1;
      this.sats = [];
    } else {
      bodies.forEach((B, i) => {
        const lead = i === this.lead;
        const k = lead ? 210 : 72;
        const c = lead ? 25 : 13;
        const f = !lead && now < this.lagFrom ? 0.08 : 1;
        B.v += (k * (T.x - B.x) - c * B.v) * dt * f;
        B.x += B.v * dt;
        const lo = PAD + 6 + this.q + T.r - 3;
        const hi = PAD + this.w - 6 - this.q - T.r + 3;
        if (B.x < lo || B.x > hi) {
          this.sy.v -= Math.min(Math.abs(B.v), 900) * 0.0016;
          B.x = Math.max(lo, Math.min(hi, B.x));
          B.v *= -0.25;
        }
        if (Math.abs(T.x - B.x) > 0.3 || Math.abs(B.v) > 3) still = false;
      });
      const L = bodies[this.lead];
      const syT = 1 - 0.2 * Math.min(Math.abs(L.v) / 1500, 1);
      this.sy.v += (280 * (syT - this.sy.s) - 9 * this.sy.v) * dt;
      this.sy.s += this.sy.v * dt;
      if (Math.abs(this.sy.s - 1) > 0.002 || Math.abs(this.sy.v) > 0.02) still = false;
      // break the neck: spawn droplets between head and tail
      const sep = Math.abs(this.a.x - this.b.x);
      const r = T.r * (1 - 0.3 * Math.min(sep / (2 * (T.q + T.r) || 1), 1));
      if (!this.split && this.moving && sep - 2 * T.q - 2 * r > -6) {
        this.split = true;
        const lo = bodies[1 - this.lead];
        const hi = bodies[this.lead];
        [0.3, 0.5, 0.72].forEach((t, j) => {
          this.sats.push({
            x: lo.x + (hi.x - lo.x) * t + (Math.random() - 0.5) * 6,
            y: T.cy + (Math.random() - 0.5) * 10,
            vx: (lo.v + hi.v) * 0.45,
            vy: (Math.random() - 0.5) * 60,
            r: 5 + Math.random() * 3 - j * 0.5,
            k: 70 + Math.random() * 90,
          });
        });
      }
      this.sats = this.sats.filter((d) => {
        d.vx += (d.k * (T.x - d.x) - 9 * d.vx) * dt;
        d.vy += (90 * (T.cy - d.y) - 7 * d.vy) * dt;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.x = Math.max(PAD + 8 + d.r, Math.min(PAD + this.w - 8 - d.r, d.x));
        d.y = Math.max(T.cy - T.r + d.r, Math.min(T.cy + T.r - d.r, d.y));
        if (Math.abs(T.x - d.x) < T.q + T.r * 0.5) d.r -= dt * 26;
        return d.r > 0.6;
      });
      if (this.sats.length) still = false;
    }
    if (this.moving && still) {
      this.moving = false;
      if (this.split || !this.reduce) this.rips.push({ x: T.x, y: T.cy, age: 0, amp: this.split ? 1.2 : 0.7 });
    }
    this.rips.forEach((p) => (p.age += dt));
    this.rips = this.rips.filter((p) => p.age < 2.4);
    const target = this.mouse.on ? 1 : 0;
    this.mouse.s += (target - this.mouse.s) * Math.min(1, dt * 7);
  }

  private loop() {
    if (this.raf) return;
    this.last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - this.last) / 1000, 1 / 30);
      this.last = now;
      this.step(dt, now);
      this.draw();
      const busy = this.moving || this.rips.length || this.sats.length || this.mouse.s > 0.01;
      // ambient water keeps moving while visible; reduced motion animates only on change
      if (this.visible && (!this.reduce || busy)) this.raf = requestAnimationFrame(tick);
      else this.raf = 0;
    };
    this.raf = requestAnimationFrame(tick);
  }
}
