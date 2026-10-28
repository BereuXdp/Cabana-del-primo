(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  $('#year').textContent = new Date().getFullYear();

  // ---------- Aberto agora (horário de Fortaleza) ----------
  const HOURS = {
    // [dia da semana 0=dom..6=sáb] => [abre, fecha] em horas
    jardins: () => [12, 24],
    riomar: (d) => (d === 0 ? [12, 22] : [12, 24]),
  };
  const now = () => {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Fortaleza', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t).value;
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
    return { day, h: (Number(get('hour')) % 24) + Number(get('minute')) / 60 };
  };
  const isOpen = (unit) => {
    const { day, h } = now();
    const [o, c] = HOURS[unit](day);
    return h >= o && h < c;
  };
  const paint = (el, open, label) => {
    el.classList.toggle('is-open', open);
    $('em', el).textContent = label;
  };
  const updateStatus = () => {
    $$('[data-status]').forEach((el) => {
      const open = isOpen(el.dataset.status);
      paint(el, open, open ? 'Aberto agora' : 'Fechado · abre às 12h');
    });
    const any = Object.keys(HOURS).some(isOpen);
    paint($('[data-status-global]'), any, any ? 'Aberto agora' : 'Abrimos às 12h');
  };
  updateStatus();
  setInterval(updateStatus, 60000);

  // ---------- Drawer ----------
  const burger = $('#burger');
  const drawer = $('#drawer');
  const setDrawer = (open) => {
    drawer.classList.toggle('is-open', open);
    drawer.setAttribute('aria-hidden', String(!open));
    burger.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  };
  burger.addEventListener('click', () => setDrawer(!drawer.classList.contains('is-open')));
  $$('a', drawer).forEach((a) => a.addEventListener('click', () => setDrawer(false)));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') setDrawer(false); });

  // ---------- Manifesto: palavras acendem com o scroll ----------
  const manifesto = $('.split');
  const wrapWords = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === 3) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part.trim()) { frag.append(part); return; }
          const s = document.createElement('span');
          s.className = 'w';
          s.textContent = part;
          frag.append(s);
        });
        child.replaceWith(frag);
      } else {
        wrapWords(child);
      }
    });
  };
  wrapWords(manifesto);
  const words = $$('.w', manifesto);

  // ---------- Elementos de scroll ----------
  const bar = $('#bar');
  const hero = $('.hero');
  const heroWin = $('#heroWindow');
  const heroMedia = $('img', heroWin);
  const heroL = $('.hero__l');
  const heroR = $('.hero__r');
  const heroType = $('#heroType');
  const reel = $('#parrilla');
  const track = $('#reelTrack');
  const reelBar = $('#reelBar');
  const reelNum = $('#reelNum');
  const reelItems = $$('.reel__item');

  const progress = (el) => {
    const r = el.getBoundingClientRect();
    return clamp(-r.top / (r.height - innerHeight));
  };

  // Moldura inicial do vídeo (em %), lida do CSS para respeitar o breakpoint
  let startInset = [24, 32, 30, 32];
  let reelDistance = 0;
  const measure = () => {
    heroWin.style.clipPath = '';
    const m = getComputedStyle(heroWin).clipPath.match(/[\d.]+%/g);
    if (m) {
      // o navegador abrevia inset() como no shorthand de margin (1 a 4 valores)
      const [t, r = t, b = t, l = r] = m.map(parseFloat);
      startInset = [t, r, b, l];
    }
    reelDistance = Math.max(0, track.scrollWidth - innerWidth);
    reel.style.height = `${reelDistance + innerHeight}px`;
  };

  const onScroll = () => {
    const y = scrollY;
    bar.classList.toggle('is-solid', y > innerHeight * 0.4);

    if (!reduced) {
      const p = progress(hero);
      const t = clamp(p / 0.8);
      const e = t * t * (3 - 2 * t);
      const ins = startInset.map((v) => v * (1 - e));
      heroWin.style.clipPath = `inset(${ins[0]}% ${ins[1]}% ${ins[2]}% ${ins[3]}%)`;
      heroMedia.style.transform = `scale(${lerp(1.3, 1, e)})`;
      heroL.style.transform = `translateX(${-e * 45}vw)`;
      heroR.style.transform = `translateX(${e * 45}vw)`;
      heroType.style.opacity = 1 - clamp((p - 0.5) / 0.3);
    }

    // Manifesto
    const mr = manifesto.getBoundingClientRect();
    const mp = clamp((innerHeight * 0.85 - mr.top) / (mr.height + innerHeight * 0.35));
    const lit = Math.round(mp * words.length);
    words.forEach((w, i) => w.classList.toggle('on', i < lit));

    // Galeria horizontal
    const rp = progress(reel);
    track.style.transform = `translateX(${-rp * reelDistance}px)`;
    reelBar.style.transform = `scaleX(${rp})`;
    reelNum.textContent = String(Math.min(reelItems.length, Math.floor(rp * reelItems.length) + 1)).padStart(2, '0');
  };

  let ticking = false;
  addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { onScroll(); ticking = false; });
  }, { passive: true });
  addEventListener('resize', () => { measure(); onScroll(); });
  addEventListener('load', () => { measure(); onScroll(); });
  measure();
  onScroll();

  // ---------- Faíscas da brasa ----------
  const canvas = $('#sparks');
  if (!reduced && canvas) {
    const ctx = canvas.getContext('2d');
    let w, h, dpr;
    const sparks = [];
    const size = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const spawn = () => ({
      x: Math.random() * w,
      y: h + 10,
      vx: (Math.random() - 0.5) * 0.6,
      vy: -(0.6 + Math.random() * 1.6),
      r: 0.6 + Math.random() * 1.8,
      life: 0,
      max: 140 + Math.random() * 200,
      seed: Math.random() * 100,
    });
    size();
    addEventListener('resize', size);
    let visible = true;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);
    const tick = (t) => {
      requestAnimationFrame(tick);
      if (!visible) return;
      ctx.clearRect(0, 0, w, h);
      if (sparks.length < (w < 640 ? 40 : 80)) sparks.push(spawn());
      ctx.globalCompositeOperation = 'lighter';
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life++;
        s.x += s.vx + Math.sin((t / 600) + s.seed) * 0.35;
        s.y += s.vy;
        const k = 1 - s.life / s.max;
        if (k <= 0 || s.y < -10) { sparks.splice(i, 1); continue; }
        ctx.beginPath();
        ctx.fillStyle = `rgba(255, ${120 + Math.round(80 * k)}, 40, ${0.85 * k})`;
        ctx.shadowColor = 'rgba(255,107,23,.9)';
        ctx.shadowBlur = 8;
        ctx.arc(s.x, s.y, s.r * (0.5 + k * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
    };
    requestAnimationFrame(tick);
  }

  // ---------- Contadores ----------
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      countIO.unobserve(en.target);
      const end = Number(en.target.dataset.count);
      if (reduced) { en.target.textContent = end; return; }
      const t0 = performance.now();
      const step = (t) => {
        const k = clamp((t - t0) / 1400);
        en.target.textContent = Math.round(end * (1 - Math.pow(1 - k, 3)));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach((el) => countIO.observe(el));

  // ---------- Abas das unidades ----------
  $$('.tabs button').forEach((btn) => btn.addEventListener('click', () => {
    $$('.tabs button').forEach((b) => b.setAttribute('aria-selected', String(b === btn)));
    $$('.unit').forEach((u) => {
      const on = u.dataset.unit === btn.dataset.tab;
      u.hidden = !on;
      u.classList.toggle('is-active', on);
    });
  }));

  // ---------- Reveal ----------
  const rvIO = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('in'); rvIO.unobserve(en.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  $$('.sec-head > *, .cuts li, .facts li, .spec__list div, .spec__img, .adega__body > *, .unit__info > *, .foot__cols > div').forEach((el, i) => {
    el.classList.add('rv');
    el.style.transitionDelay = `${(i % 4) * 60}ms`;
    rvIO.observe(el);
  });
})();
