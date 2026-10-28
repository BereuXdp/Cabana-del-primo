(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  $('#year').textContent = new Date().getFullYear();

  // ---------- Header ----------
  const top = $('#top');
  const onScroll = () => top.classList.toggle('is-solid', scrollY > 60);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ---------- Menu mobile ----------
  const btn = $('#menuBtn');
  const sheet = $('#sheet');
  const setSheet = (open) => {
    sheet.classList.toggle('is-open', open);
    sheet.setAttribute('aria-hidden', String(!open));
    btn.setAttribute('aria-expanded', String(open));
    btn.textContent = open ? 'Fechar' : 'Menu';
    document.body.style.overflow = open ? 'hidden' : '';
  };
  btn.addEventListener('click', () => setSheet(!sheet.classList.contains('is-open')));
  $$('a', sheet).forEach((a) => a.addEventListener('click', () => setSheet(false)));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') setSheet(false); });

  // ---------- Entradas ----------
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -60px 0px' });
  $$('.fade, .reveal').forEach((el) => io.observe(el));

  // ---------- Carta: abas ----------
  const cartaImg = $('#cartaImg');
  $$('.tabs button').forEach((tab) => tab.addEventListener('click', () => {
    const cat = tab.dataset.cat;
    $$('.tabs button').forEach((b) => b.setAttribute('aria-selected', String(b === tab)));
    $$('.dishes').forEach((list) => {
      const on = list.dataset.cat === cat;
      list.hidden = !on;
      list.classList.toggle('is-active', on);
      if (on && cartaImg.getAttribute('src') !== list.dataset.img) {
        cartaImg.classList.add('is-swapping');
        setTimeout(() => {
          cartaImg.src = list.dataset.img;
          cartaImg.onload = () => cartaImg.classList.remove('is-swapping');
        }, 350);
      }
    });
  }));

  // ---------- Status das unidades (horário de Fortaleza) ----------
  const HOURS = {
    jardins: () => [12, 24],
    riomar: (day) => (day === 0 ? [12, 22] : [12, 24]),
  };
  const updateStatus = () => {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Fortaleza', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t).value;
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
    const h = (Number(get('hour')) % 24) + Number(get('minute')) / 60;
    $$('.status').forEach((el) => {
      const [o, c] = HOURS[el.dataset.unit](day);
      const open = h >= o && h < c;
      el.classList.toggle('is-open', open);
      el.textContent = open ? 'Aberto agora' : 'Abre às 12h';
    });
  };
  updateStatus();
  setInterval(updateStatus, 60000);

  // ---------- Pedido de evento via WhatsApp ----------
  const guests = $('#guests');
  const out = $('#guestsOut');
  guests.addEventListener('input', () => { out.textContent = guests.value; });
  $('#eventForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const date = f.get('data') ? new Date(`${f.get('data')}T12:00`).toLocaleDateString('pt-BR') : 'a definir';
    const msg = `Olá! Gostaria de uma proposta para o espaço privativo.\nOcasião: ${f.get('ocasiao')}\nData: ${date}\nConvidados: ${f.get('convidados')}`;
    open(`https://wa.me/5585992181362?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
  });

  // ---------- Parallax discreto ----------
  if (!reduced) {
    const heroImg = $('.hero__arch img');
    const resBg = $('.reservar__bg');
    let ticking = false;
    const move = () => {
      const y = scrollY;
      if (y < innerHeight) heroImg.style.translate = `0 ${y * 0.12}px`;
      const r = resBg.parentElement.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0) resBg.style.transform = `translateY(${(r.top + r.height / 2 - innerHeight / 2) * -0.15}px)`;
      ticking = false;
    };
    addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(move); }
    }, { passive: true });
  }
})();
