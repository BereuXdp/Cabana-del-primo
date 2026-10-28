/* Cabaña del Primo · modelo 3
   GSAP + ScrollTrigger: scroll, slideshow e parallax.
   anime.js: texto quebrado em letras/palavras, contadores e microinterações.
   Acessibilidade: gsap.matchMedia() com prefers-reduced-motion + botão "Reduzir movimento". */
(() => {
  const { animate, stagger, splitText, utils } = anime;
  gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  $('#year').textContent = new Date().getFullYear();

  // ---------- Header e menu ----------
  const hd = $('#hd');
  ScrollTrigger.create({ start: 80, onToggle: (self) => hd.classList.toggle('is-solid', self.isActive) });

  const burger = $('#burger');
  const sheet = $('#navSheet');
  const setSheet = (open) => {
    sheet.classList.toggle('is-open', open);
    sheet.setAttribute('aria-hidden', String(!open));
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    document.body.style.overflow = open ? 'hidden' : '';
  };
  burger.addEventListener('click', () => setSheet(!sheet.classList.contains('is-open')));
  $$('a', sheet).forEach((a) => a.addEventListener('click', () => setSheet(false)));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') setSheet(false); });

  // ---------- Aberto agora (horário de Fortaleza) ----------
  const HOURS = { jardins: () => [12, 24], riomar: (d) => (d === 0 ? [12, 22] : [12, 24]) };
  const updateOpen = () => {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Fortaleza', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t).value;
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
    const h = (Number(get('hour')) % 24) + Number(get('minute')) / 60;
    $$('.open').forEach((el) => {
      const [o, c] = HOURS[el.dataset.unit](day);
      const open = h >= o && h < c;
      el.classList.toggle('is-open', open);
      el.textContent = open ? 'Aberto agora' : 'Abre às 12h';
    });
  };
  updateOpen();
  setInterval(updateOpen, 60000);


  // ---------- Voltar ao início ----------
  const toTop = $('#toTop');
  const toTopRing = $('#toTopRing');
  const RING = 2 * Math.PI * 22;
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: (self) => {
      toTop.classList.toggle('is-visible', scrollY > innerHeight * 0.8);
      toTopRing.style.strokeDashoffset = RING * (1 - self.progress);
    },
  });
  // Volta direto para o hero, sem rolagem animada
  toTop.addEventListener('click', () => {
    scrollTo({ top: 0, behavior: 'instant' });
    $('#inicio').focus({ preventScroll: true });
  });
  // ---------- Elementos ----------
  const slides = $$('.slide');
  const titles = $$('.ht');
  const dots = $$('#dots li');
  const dotBars = dots.map((li) => $('i', li));
  const chapters = $$('.chapter');
  const panels = $$('.panel');
  const ROMAN = ['I', 'II', 'III'];
  const SLIDE_TIME = 6.5;

  // Letras dos títulos do hero (anime.js já cria cópia acessível e aria-hidden)
  const titleChars = titles.map((t) => splitText(t, { chars: { wrap: 'clip' } }).chars);

  // Estado inicial sem depender de classes
  gsap.set(slides, { autoAlpha: (i) => (i === 0 ? 1 : 0) });
  gsap.set(titles, { autoAlpha: (i) => (i === 0 ? 1 : 0) });

  let reduced = false;
  let current = 0;
  let progressTween = null;
  let kenBurns = null;
  let heroVisible = true;
  let hovering = false;

  // ---------- Slideshow ----------
  const runProgress = () => {
    progressTween?.kill();
    dotBars.forEach((b, i) => gsap.set(b, { '--p': i === current ? (reduced ? 1 : 0) : 0 }));
    if (reduced) return; // sem troca automática com movimento reduzido
    progressTween = gsap.to(dotBars[current], {
      '--p': 1, duration: SLIDE_TIME, ease: 'none',
      onComplete: () => goTo(current + 1),
    });
    if (!heroVisible || hovering || document.hidden) progressTween.pause();
  };

  const goTo = (n) => {
    const prev = current;
    current = (n + slides.length) % slides.length;
    if (prev !== current) {
      dots.forEach((li, i) => li.classList.toggle('is-active', i === current));
      if (reduced) {
        gsap.to(slides[prev], { autoAlpha: 0, duration: 0.6 });
        gsap.to(slides[current], { autoAlpha: 1, duration: 0.6 });
        gsap.set(titles, { autoAlpha: (i) => (i === current ? 1 : 0) });
      } else {
        gsap.to(slides[prev], { autoAlpha: 0, duration: 1.6, ease: 'power2.inOut' });
        gsap.to(slides[current], { autoAlpha: 1, duration: 1.6, ease: 'power2.inOut' });
        kenBurns?.kill();
        kenBurns = gsap.fromTo($('img', slides[current]), { scale: 1.14 }, { scale: 1, duration: SLIDE_TIME + 2, ease: 'none' });

        animate(titleChars[prev], {
          translateY: ['0%', '-105%'], duration: 700, delay: stagger(22), ease: 'inQuart',
          onComplete: () => gsap.set(titles[prev], { autoAlpha: 0 }),
        });
        gsap.set(titles[current], { autoAlpha: 1 });
        animate(titleChars[current], { translateY: ['105%', '0%'], duration: 1200, delay: stagger(32, { start: 450 }), ease: 'outExpo' });
      }
    }
    runProgress();
  };

  dots.forEach((li, i) => $('button', li).addEventListener('click', () => goTo(i)));

  // Pausa: fora da tela, aba oculta, ou enquanto a pessoa interage com o hero (WCAG 2.2.2)
  const hero = $('.hero');
  const heroST = ScrollTrigger.create({
    trigger: hero, start: 'top bottom', end: 'bottom top',
    onToggle: (self) => { heroVisible = self.isActive; heroVisible && !hovering ? progressTween?.resume() : progressTween?.pause(); },
  });
  heroVisible = heroST.isActive;
  document.addEventListener('visibilitychange', () => { document.hidden ? progressTween?.pause() : heroVisible && !hovering && progressTween?.resume(); });

  // ---------- História: capítulos deslizam para o lado com o scroll ----------
  const story = $('#historia');
  const storyPin = $('.story__pin');
  const storyTrack = $('#storyTrack');
  const storyNum = $('#storyNum');
  const storyBar = $('#storyBar');

  const setupStory = () => {
    story.classList.add('story--h');
    const n = chapters.length;
    const slide = gsap.to(storyTrack, {
      x: () => -(n - 1) * innerWidth,
      ease: 'none',
      scrollTrigger: {
        // mais rolagem por capítulo + scrub alto = deslize lento e amortecido
        trigger: storyPin, pin: true, start: 'top top', end: () => `+=${(n - 1) * innerWidth * 1.6}`,
        scrub: 1.6, invalidateOnRefresh: true,
        snap: { snapTo: 1 / (n - 1), duration: { min: 0.6, max: 1.4 }, delay: 0.15, ease: 'power3.inOut' },
        onUpdate: (self) => {
          storyBar.style.transform = `scaleX(${self.progress})`;
          storyNum.textContent = ROMAN[Math.round(self.progress * (n - 1))];
        },
      },
    });

    chapters.forEach((ch, i) => {
      // foto desliza um pouco mais devagar que o quadro (parallax lateral)
      gsap.fromTo($('.chapter__img img', ch), { xPercent: -5 }, {
        xPercent: 5, ease: 'none',
        scrollTrigger: { trigger: ch, containerAnimation: slide, start: 'left right', end: 'right left', scrub: true },
      });
      // texto entra quando o capítulo chega
      gsap.from($$('.chapter__body > *:not(.chapter__num)', ch), {
        autoAlpha: 0, x: 30, duration: 1.4, stagger: 0.1, ease: 'power2.out',
        // o 1º capítulo já começa na tela: entra quando a seção chega (scroll vertical); os outros, quando deslizam
        scrollTrigger: i === 0
          ? { trigger: storyPin, start: 'top 70%', toggleActions: 'play none none reverse' }
          : { trigger: ch, containerAnimation: slide, start: 'left 55%', toggleActions: 'play none none reverse' },
      });
      gsap.fromTo($('.chapter__num', ch), { xPercent: 25 }, {
        xPercent: -25, ease: 'none',
        scrollTrigger: { trigger: ch, containerAnimation: slide, start: 'left right', end: 'right left', scrub: true },
      });
    });

    return () => {
      story.classList.remove('story--h');
      gsap.set([storyTrack, storyBar, ...$$('.chapter__img img, .chapter__body > *', story)], { clearProps: 'all' });
    };
  };

  // ---------- Modal de reserva ----------
  const dlg = $('#booking');
  const bkPanel = $('.bk__panel', dlg);
  const bkScrim = $('.bk__scrim', dlg);
  const bkForm = $('#bkForm');
  const bkDays = $('#bkDays');
  const bkTimes = $('#bkTimes');
  const bkPeople = $('#bkPeople');
  const bkSummary = $('#bkSummary');
  const bkGoTxt = $('#bkGoTxt');
  const UNIT_NAME = { jardins: 'Jardins', riomar: 'RioMar' };
  const TIMES = ['12:00', '12:30', '13:00', '13:30', '14:00', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30'];
  let people = 2;

  const iso = (d) => d.toLocaleDateString('en-CA');
  const dayLabel = (d) => d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
  const dayNum = (d) => `${d.getDate()}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  const chip = (name, value, html, checked) => {
    const l = document.createElement('label');
    l.className = 'chip';
    l.innerHTML = `<input type="radio" name="${name}" value="${value}"${checked ? ' checked' : ''}><span>${html}</span>`;
    return l;
  };

  // Hoje + 6 dias; o último chip abre o calendário para outra data
  const buildDays = () => {
    bkDays.textContent = '';
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const top = i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : dayLabel(d);
      bkDays.appendChild(chip('dia', iso(d), `${top}<small>${dayNum(d)}</small>`, i === 0));
    }
    const other = document.createElement('label');
    other.className = 'chip chip--date';
    other.innerHTML = '<input type="date" aria-label="Escolher outra data"><input type="radio" name="dia" value=""><span>Outra<small>data</small></span>';
    bkDays.appendChild(other);
    const [otherDate, otherRadio] = $$('input', other);
    otherDate.min = iso(new Date());
    other.addEventListener('click', (e) => {
      e.preventDefault();
      try { otherDate.showPicker(); } catch (err) { otherDate.focus(); }
    });
    otherDate.addEventListener('change', () => {
      if (!otherDate.value) return;
      const d = new Date(`${otherDate.value}T12:00`);
      otherRadio.value = otherDate.value;
      otherRadio.checked = true;
      $('span', other).innerHTML = `${dayLabel(d)}<small>${dayNum(d)}</small>`;
      syncSummary();
    });
  };

  const buildTimes = () => {
    bkTimes.textContent = '';
    TIMES.forEach((t) => bkTimes.appendChild(chip('hora', t, t, t === '20:00')));
  };

  // RioMar fecha às 22h no domingo: desativa horários que não cabem
  const syncTimes = () => {
    const unit = bkForm.elements.unidade.value;
    const day = bkForm.elements.dia.value;
    const sunday = day && new Date(`${day}T12:00`).getDay() === 0;
    const inputs = $$('input', bkTimes);
    inputs.forEach((inp) => {
      inp.disabled = unit === 'riomar' && sunday && inp.value >= '21:30';
      if (inp.disabled && inp.checked) inputs.find((x) => x.value === '20:00').checked = true;
    });
  };

  const syncSummary = () => {
    syncTimes();
    const f = bkForm.elements;
    const dayInput = $$('input[name="dia"]', bkDays).find((i) => i.checked);
    const label = dayInput ? dayInput.nextElementSibling.firstChild.textContent : '';
    const num = dayInput?.value ? dayNum(new Date(`${dayInput.value}T12:00`)) : '';
    bkSummary.textContent = `${UNIT_NAME[f.unidade.value]} · ${label}${num ? ` ${num}` : ''} · ${f.hora.value} · ${people} ${people > 1 ? 'pessoas' : 'pessoa'}`;
    // RioMar não tem WhatsApp divulgado: a reserva é por telefone
    bkGoTxt.textContent = f.unidade.value === 'riomar' ? 'Ligar para o RioMar' : 'Reservar pelo WhatsApp';
  };

  const stepBtns = $$('.stepper button', dlg);
  const setPeople = (n) => {
    people = Math.min(20, Math.max(1, n));
    bkPeople.textContent = people;
    stepBtns[0].disabled = people === 1;
    stepBtns[1].disabled = people === 20;
    syncSummary();
  };
  stepBtns.forEach((b) => b.addEventListener('click', () => {
    setPeople(people + Number(b.dataset.step));
    animate(bkPeople, { scale: [1.25, 1], duration: 400, ease: 'outBack' });
  }));

  buildDays();
  buildTimes();
  bkForm.addEventListener('change', syncSummary);
  setPeople(2);

  bkForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = bkForm.elements;
    if (f.unidade.value === 'riomar') { location.href = 'tel:+558530353691'; return; }
    const day = f.dia.value ? new Date(`${f.dia.value}T12:00`).toLocaleDateString('pt-BR') : 'a combinar';
    const msg = `Olá! Gostaria de reservar uma mesa na unidade Jardins.\nData: ${day}\nHorário: ${f.hora.value}\nPessoas: ${people}`;
    window.open(`https://wa.me/5585992181362?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
  });

  // Abrir / fechar: o painel sobe de baixo e o fundo escurece
  let lastFocus = null;
  const openBooking = () => {
    if (dlg.open) return;
    lastFocus = document.activeElement;
    syncSummary();
    dlg.showModal();
    document.body.style.overflow = 'hidden';
    progressTween?.pause();
    if (reduced) {
      gsap.set([bkScrim, bkPanel], { autoAlpha: 1, yPercent: 0 });
      return;
    }
    gsap.fromTo(bkScrim, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, ease: 'power2.out' });
    gsap.fromTo(bkPanel, { yPercent: 100 }, { yPercent: 0, duration: 0.8, ease: 'power4.out' });
    gsap.fromTo($$('.bk__step, .bk__foot', bkPanel), { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.06, delay: 0.25, ease: 'power3.out' });
  };
  const finishClose = () => {
    dlg.close();
    document.body.style.overflow = '';
    if (heroVisible) progressTween?.resume();
    lastFocus?.focus({ preventScroll: true });
  };
  const closeBooking = () => {
    if (!dlg.open) return;
    if (reduced) { finishClose(); return; }
    gsap.to(bkScrim, { autoAlpha: 0, duration: 0.4 });
    gsap.to(bkPanel, { yPercent: 100, duration: 0.5, ease: 'power3.in', onComplete: finishClose });
  };
  $$('[data-booking]').forEach((b) => b.addEventListener('click', (e) => {
    e.preventDefault();
    if (sheet.classList.contains('is-open')) setSheet(false);
    openBooking();
  }));
  $$('[data-close]', dlg).forEach((b) => b.addEventListener('click', closeBooking));
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); closeBooking(); });

  // ---------- Ambientes: painéis ----------
  const openPanel = (p) => {
    if (p.classList.contains('is-open')) return;
    panels.forEach((el) => el.classList.toggle('is-open', el === p));
    if (matchMedia('(min-width: 901px)').matches) {
      gsap.to(panels, { flexGrow: (i, el) => (el === p ? 3.6 : 1), duration: reduced ? 0 : 1, ease: 'power3.inOut' });
    }
    const txt = $('p', p);
    if (!reduced) animate(txt, { opacity: [0, 1], translateY: [16, 0], duration: 800, delay: 250, ease: 'outCubic' });
  };
  panels.forEach((p) => {
    p.addEventListener('click', () => openPanel(p));
    p.addEventListener('focus', () => openPanel(p));
    p.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPanel(p); } });
    p.addEventListener('mouseenter', () => openPanel(p));
  });
  const sizePanels = () => {
    const desktop = matchMedia('(min-width: 901px)').matches;
    gsap.set(panels, { flexGrow: (i, el) => (desktop ? (el.classList.contains('is-open') ? 3.6 : 1) : '') });
  };
  sizePanels();
  addEventListener('resize', sizePanels);

  // ---------- Contadores (anime.js) ----------
  $$('.events__stats dt').forEach((dt) => {
    const end = Number(dt.textContent);
    if (!Number.isFinite(end) || end < 2) return;
    ScrollTrigger.create({
      trigger: dt, start: 'top 85%', once: true,
      onEnter: () => {
        if (reduced) return;
        const counter = { v: 0 };
        animate(counter, { v: end, duration: 1800, ease: 'outExpo', modifier: utils.round(0), onUpdate: () => { dt.textContent = counter.v; } });
      },
    });
  });

  // ---------- Abertura: as portas da casa se abrem sozinhas e revelam o hero ----------
  const intro = $('#intro');
  const doorL = $('.door--l');
  const doorR = $('.door--r');
  const introKicker = $('.intro__kicker');
  const html = document.documentElement;
  let introRunning = html.classList.contains('js-intro');
  let introTl = null;
  let introPlayed = false;

  const endIntro = () => {
    introRunning = false;
    intro.hidden = true;
    html.classList.remove('js-intro');
  };

  // Hero e header entram depois das portas (ou direto, se não houver abertura)
  const heroEnter = (withHeader) => {
    animate(titleChars[current], { translateY: ['105%', '0%'], duration: 1400, delay: stagger(40, { start: 150 }), ease: 'outExpo' });
    gsap.fromTo('.hero__dots, .hero__copy .eyebrow', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 1, delay: 0.5, ease: 'power3.out' });
    gsap.fromTo('.hero__cta', { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 1.1, delay: 0.75, ease: 'power3.out' });
    kenBurns = gsap.fromTo($('img', slides[current]), { scale: 1.14 }, { scale: 1, duration: SLIDE_TIME + 2, ease: 'none' });
    if (withHeader) gsap.fromTo(hd, { yPercent: -110 }, { yPercent: 0, duration: 1.1, delay: 0.9, ease: 'power3.out', clearProps: 'transform' });
  };

  const playIntro = () => {
    const words = $$('.door__word').map((w) => splitText(w, { chars: { wrap: 'clip' } }));
    const chars = words.flatMap((s) => s.chars);
    utils.set(chars, { translateY: '105%' });
    gsap.set(hd, { yPercent: -110 });

    introTl = gsap.timeline({
      onComplete: () => { words.forEach((s) => s.revert()); endIntro(); runProgress(); },
    });
    introTl
      .from(introKicker, { autoAlpha: 0, y: 12, duration: 0.9, ease: 'power3.out' }, 0.2)
      .add(() => animate(chars, { translateY: ['105%', '0%'], duration: 1300, delay: stagger(45), ease: 'outExpo' }), 0.35)
      .to(introKicker, { autoAlpha: 0, duration: 0.4 }, 1.9)
      .fromTo(doorL, { rotationY: 0, filter: 'brightness(1)' }, { rotationY: 105, filter: 'brightness(.4)', duration: 1.9, ease: 'power3.inOut' }, 2.1)
      .fromTo(doorR, { rotationY: 0, filter: 'brightness(1)' }, { rotationY: -105, filter: 'brightness(.4)', duration: 1.9, ease: 'power3.inOut' }, 2.1)
      .fromTo('.slides', { scale: 1.12 }, { scale: 1, duration: 2.4, ease: 'power2.out', clearProps: 'transform' }, 2.1)
      .add(() => heroEnter(true), 3.1)
      .to(intro, { autoAlpha: 0, duration: 0.3 }, 3.8);

    // Qualquer interação acelera a abertura
    const hurry = () => introTl?.timeScale(5);
    $('#introSkip').addEventListener('click', hurry);
    ['wheel', 'touchstart', 'keydown'].forEach((ev) => addEventListener(ev, hurry, { once: true, passive: true }));
  };

  // ---------- Carta: roda de pratos que gira com o scroll ----------
  const wheel = $('#carta');
  const wheelPin = $('.wheel__pin');
  const plates = $$('.plate', wheel);
  const wheelTag = $('#wheelTag');
  const wheelName = $('#wheelName');
  const wheelDesc = $('#wheelDesc');
  const wheelNum = $('#wheelNum');

  const setupWheel = () => {
    wheel.classList.add('wheel--live');
    let R = 900;
    let D = 360;
    let STEP = 30;
    let active = 0;

    const measure = () => {
      const mobile = innerWidth < 900;
      D = mobile ? Math.min(innerWidth * 0.62, innerHeight * 0.36) : Math.min(innerHeight * 0.5, 440);
      R = mobile ? innerWidth * 1.15 : Math.max(innerWidth * 0.6, 820);
      // ângulo entre pratos para deixar um respiro de ~35% do diâmetro
      STEP = (2 * Math.asin(Math.min(1, (D * 1.35) / (2 * R))) * 180) / Math.PI;
      wheel.style.setProperty('--R', `${R}px`);
      wheel.style.setProperty('--D', `${D}px`);
    };

    const setInfo = () => {
      const fields = [wheelTag, wheelName, wheelDesc];
      animate(fields, {
        opacity: [1, 0], translateY: [0, -8], duration: 280, ease: 'inOutSine',
        onComplete: () => {
          const p = plates[active];
          wheelTag.textContent = p.dataset.tag;
          wheelName.textContent = $('b', p).textContent;
          wheelDesc.textContent = p.dataset.desc;
          animate(fields, { opacity: [0, 1], translateY: [10, 0], duration: 1000, delay: stagger(90), ease: 'outCubic' });
        },
      });
      wheelNum.textContent = String(active + 1).padStart(2, '0');
    };

    const render = (progress) => {
      const pos = progress * (plates.length - 1);
      plates.forEach((pl, i) => {
        const d = i - pos;
        const a = (d * STEP * Math.PI) / 180;
        gsap.set(pl, {
          x: Math.sin(a) * R,
          y: -Math.cos(a) * R,
          rotation: d * STEP,
          scale: 1 - Math.min(Math.abs(d), 1.6) * 0.28,
          autoAlpha: Math.abs(d) > 2.6 ? 0 : 1,
        });
      });
      const idx = Math.round(pos);
      if (idx !== active) { active = idx; setInfo(); }
    };

    measure();
    const st = ScrollTrigger.create({
      trigger: wheelPin, pin: true, start: 'top top',
      // mais rolagem por prato + scrub alto = giro lento e amortecido
      end: () => `+=${(plates.length - 1) * innerHeight * 1.15}`,
      scrub: 1.6,
      snap: { snapTo: 1 / (plates.length - 1), duration: { min: 0.6, max: 1.4 }, delay: 0.15, ease: 'power3.inOut' },
      invalidateOnRefresh: true,
      onUpdate: (self) => render(self.progress),
      onRefreshInit: measure,
      onRefresh: (self) => render(self.progress),
    });
    render(st.progress);

    // Clique (ou Enter) num prato gira a roda até ele
    const clicks = new AbortController();
    const goPlate = (i) => {
      const y = st.start + (st.end - st.start) * (i / (plates.length - 1));
      gsap.to(window, { scrollTo: { y, autoKill: true }, duration: 1.3, ease: 'power3.inOut', overwrite: true });
    };
    plates.forEach((pl, i) => {
      pl.tabIndex = 0;
      pl.setAttribute('role', 'button');
      pl.setAttribute('aria-label', `Ver ${$('b', pl).textContent}`);
      pl.addEventListener('click', () => { if (i !== active) goPlate(i); }, { signal: clicks.signal });
      pl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goPlate(i); }
      }, { signal: clicks.signal });
    });

    return () => {
      st.kill(true);
      wheel.classList.remove('wheel--live');
      wheel.style.removeProperty('--R');
      wheel.style.removeProperty('--D');
      clicks.abort();
      plates.forEach((pl) => { pl.removeAttribute('tabindex'); pl.removeAttribute('role'); pl.removeAttribute('aria-label'); });
      gsap.set(plates, { clearProps: 'all' });
    };
  };

  // ---------- Animações de entrada e scroll (só com movimento liberado) ----------
  const setupMotion = () => {
    const splits = [];
    const undoStory = setupStory(); // antes da carta: os pins precisam ser criados na ordem da página
    const undoWheel = setupWheel();

    // Títulos de seção: palavras sobem de dentro de uma máscara (anime.js)
    $$('.h2:not(.chapter .h2)').forEach((h) => {
      const s = splitText(h, { words: { wrap: 'clip' } });
      splits.push(s);
      utils.set(s.words, { translateY: '105%' });
      ScrollTrigger.create({
        trigger: h, start: 'top 86%', once: true,
        onEnter: () => animate(s.words, { translateY: ['105%', '0%'], duration: 1300, delay: stagger(70), ease: 'outExpo' }),
      });
    });

    // Textos e legendas (GSAP)
    $$('.eyebrow:not(.intro__kicker):not(.hero__copy .eyebrow):not(.chapter .eyebrow), .events__inner > p:not(.eyebrow), .events__stats, .events .cta, .unit__body > *').forEach((el) => {
      gsap.from(el, { autoAlpha: 0, y: 24, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });

    // Imagens: cortina + parallax
    $$('.unit').forEach((fig) => {
      const img = $('img', fig);
      gsap.from(fig, { clipPath: 'inset(18% 0% 0% 0%)', duration: 1.5, ease: 'power4.out', scrollTrigger: { trigger: fig, start: 'top 88%', once: true } });
      gsap.fromTo(img, { scale: 1.12, yPercent: -4 }, { yPercent: 4, ease: 'none', scrollTrigger: { trigger: fig, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    gsap.fromTo('.events__bg', { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: '.events', start: 'top bottom', end: 'bottom top', scrub: true } });

    // Hero se afasta ao rolar
    gsap.to('.hero__copy', { yPercent: -18, autoAlpha: 0.15, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });

    // Painéis entram em sequência
    gsap.from(panels, { autoAlpha: 0, y: 40, duration: 1.2, stagger: 0.1, ease: 'power3.out', scrollTrigger: { trigger: '.panels', start: 'top 82%', once: true } });

    // Entrada do hero: depois das portas, ou direto quando a abertura já passou
    if (introRunning) playIntro();
    else if (!introPlayed) heroEnter(false);
    introPlayed = true;

    return () => {
      undoWheel();
      undoStory();
      splits.forEach((s) => s.revert());
      kenBurns?.kill();
      gsap.set($$('.slide img'), { clearProps: 'transform' });
    };
  };

  // ---------- Preferência de movimento ----------
  const STORE = 'cdp-motion';
  let forcedReduce = false;
  try { forcedReduce = localStorage.getItem(STORE) === 'reduce'; } catch (e) { /* sem storage */ }
  const toggle = $('#motionToggle');
  let mm;

  const build = () => {
    mm?.revert();
    mm = gsap.matchMedia();
    mm.add({ ok: '(prefers-reduced-motion: no-preference)', reduce: '(prefers-reduced-motion: reduce)' }, (ctx) => {
      reduced = ctx.conditions.reduce || forcedReduce;
      toggle.setAttribute('aria-pressed', String(reduced));
      toggle.textContent = reduced ? 'Ativar movimento' : 'Reduzir movimento';
      toggle.hidden = ctx.conditions.reduce; // o sistema já pediu menos movimento
      const cleanup = reduced ? null : setupMotion();
      if (reduced && introRunning) { endIntro(); gsap.set(hd, { clearProps: 'transform' }); }
      if (!introRunning) runProgress();
      return () => {
        progressTween?.kill();
        cleanup?.();
        if (introRunning) { endIntro(); gsap.set([hd, intro], { clearProps: 'all' }); }
      };
    });
    // o pin da carta mudam a altura da página: reordena e recalcula os gatilhos criados antes deles
    ScrollTrigger.sort();
    ScrollTrigger.refresh();
  };

  toggle.addEventListener('click', () => {
    forcedReduce = !forcedReduce;
    try { localStorage.setItem(STORE, forcedReduce ? 'reduce' : 'full'); } catch (e) { /* sem storage */ }
    build();
  });

  build();
  addEventListener('load', () => ScrollTrigger.refresh());
})();
