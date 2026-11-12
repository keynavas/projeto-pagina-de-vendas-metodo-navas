/* ==========================================================================
   Método Navas — Interações da página
   ========================================================================== */
(function () {
  "use strict";

  const prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  /* ------------------------------------------------------------------
     Menu mobile
     ------------------------------------------------------------------ */
  function setupMobileMenu() {
    const toggle = $(".menu-toggle");
    const panel = $(".mobile-menu");
    if (!toggle || !panel) return;

    const setOpen = (open) => {
      panel.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    };

    toggle.addEventListener("click", () => setOpen(!panel.classList.contains("is-open")));
    panel.addEventListener("click", (ev) => { if (ev.target.closest("a")) setOpen(false); });
    document.addEventListener("click", (ev) => {
      if (!panel.classList.contains("is-open")) return;
      if (!ev.target.closest(".mobile-menu") && !ev.target.closest(".menu-toggle")) setOpen(false);
    });
    document.addEventListener("keydown", (ev) => { if (ev.key === "Escape") setOpen(false); });
  }

  /* ------------------------------------------------------------------
     Indicador da seção ativa no menu
     ------------------------------------------------------------------ */
  function setupNavIndicator() {
    const nav = $(".nav");
    const bar = $(".nav__indicator");
    if (!nav || !bar) return;
    const ids = ["oportunidade", "projetos", "metodo", "historia", "numeros", "depoimentos", "preco", "faq"];

    const update = () => {
      let active = null;
      const probe = window.innerHeight * 0.35;
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.top <= probe && r.bottom > probe) { active = id; break; }
      }
      $$("[data-nav]", nav).forEach((a) => {
        a.style.color = a.dataset.nav === active ? "#FFFFFF" : "#E5E5E5";
        a.style.fontWeight = a.dataset.nav === active ? "700" : "500";
      });
      if (!active) { bar.style.opacity = "0"; bar.style.width = "0px"; return; }
      const link = $('[data-nav="' + active + '"]', nav);
      if (!link) return;
      bar.style.opacity = "1";
      bar.style.left = (link.offsetLeft - nav.scrollLeft) + "px";
      bar.style.width = link.offsetWidth + "px";
    };

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  /* ------------------------------------------------------------------
     Rolagem suave para as âncoras (compensa o header fixo)
     ------------------------------------------------------------------ */
  function setupAnchorScroll() {
    let anchorFix = null;

    document.addEventListener("click", (ev) => {
      const a = ev.target.closest ? ev.target.closest('a[href^="#"]') : null;
      if (!a) return;
      let id = a.getAttribute("href").slice(1);
      if (!id) return;
      if (id === "oferta" || id === "chamada") id = "preco";
      const el = document.getElementById(id);
      if (!el) return;
      ev.preventDefault();

      const header = $(".header");
      const hh = header ? header.getBoundingClientRect().height : 60;
      const mobile = window.innerWidth <= 940;
      const offset = hh + (mobile ? 18 : 28) - (mobile ? 40 : 80) - (id === "preco" ? (mobile ? 30 : 50) : 0);

      // offsetTop ignora os transforms das seções: destino sempre exato
      const docTop = (node) => { let y = 0, n = node; while (n) { y += n.offsetTop; n = n.offsetParent; } return y; };
      const maxY = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const target = () => Math.min(Math.max(0, docTop(el) - offset), maxY());

      window.scrollTo({ top: target(), behavior: "smooth" });

      // corrige o destino depois que a animação de rolagem termina
      let tries = 0;
      clearInterval(anchorFix);
      const stop = () => {
        clearInterval(anchorFix);
        window.removeEventListener("wheel", stop);
        window.removeEventListener("touchstart", stop);
      };
      window.addEventListener("wheel", stop, { passive: true });
      window.addEventListener("touchstart", stop, { passive: true });
      anchorFix = setInterval(() => {
        const want = target();
        if (Math.abs(window.pageYOffset - want) > 2 && tries < 12) window.scrollTo({ top: want, behavior: "smooth" });
        if (++tries >= 12) clearInterval(anchorFix);
      }, 220);
    });
  }

  /* ------------------------------------------------------------------
     Efeito de "card" nas seções durante a rolagem
     ------------------------------------------------------------------ */
  function setupSectionCards() {
    const cards = $$("section").filter((s) => !s.dataset.nocard);
    if (!cards.length || prefersReducedMotion) return;

    cards.forEach((c) => {
      c.style.transformOrigin = "50% 50%";
      c.style.willChange = "transform, opacity";
      c.style.backfaceVisibility = "hidden";
    });

    let ticking = false, raf = null;
    const update = () => {
      ticking = false;
      const vh = window.innerHeight || 1;
      const mid = vh / 2;
      const rects = cards.map((c) => c.getBoundingClientRect());
      cards.forEach((c, i) => {
        const r = rects[i];
        if (r.bottom < -vh * 0.5 || r.top > vh * 1.5) { if (c._far) return; c._far = true; }
        else c._far = false;
        // distância entre o centro da tela e a parte mais próxima do card
        const dist = r.top > mid ? r.top - mid : (r.bottom < mid ? mid - r.bottom : 0);
        const near = 1 - Math.min(dist / (vh * 0.6), 1);
        const e = near * near * (3 - 2 * near);
        const sc = 0.9 + e * 0.1;
        const ty = (1 - e) * 44 * (r.top > mid ? 1 : -1);
        const op = 0.35 + e * 0.65;
        const tf = "translate3d(0," + ty.toFixed(1) + "px,0) scale(" + sc.toFixed(3) + ")";
        const o = op.toFixed(3);
        if (c._tf !== tf) { c.style.transform = tf; c._tf = tf; }
        if (c._op !== o) { c.style.opacity = o; c._op = o; }
      });
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    // iOS/Android: mantém o efeito fluido durante o arrasto e a inércia
    const onTouch = () => {
      onScroll();
      let frames = 0;
      const loop = () => { update(); if (++frames < 90) raf = requestAnimationFrame(loop); };
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    window.addEventListener("orientationchange", onScroll, { passive: true });
    window.addEventListener("touchstart", onTouch, { passive: true });
    window.addEventListener("touchmove", onScroll, { passive: true });
    window.addEventListener("touchend", onTouch, { passive: true });
    update();
  }

  /* ------------------------------------------------------------------
     Contagem regressiva da oferta: 23h a partir da primeira visita
     (salva no navegador do visitante)
     ------------------------------------------------------------------ */
  function setupCountdown() {
    const els = { h: $('[data-cd="h"]'), m: $('[data-cd="m"]'), s: $('[data-cd="s"]') };
    if (!els.h) return;
    const KEY = "metodoNavasOfertaPrimeiraVisita";
    const FULL = 23 * 3600 * 1000;
    let first = 0;
    try { first = parseInt(localStorage.getItem(KEY) || "0", 10); } catch (e) {}
    if (!first || isNaN(first) || first > Date.now()) {
      first = Date.now();
      try { localStorage.setItem(KEY, String(first)); } catch (e) {}
    }
    const end = first + FULL;
    const pad = (n) => String(n).padStart(2, "0");
    const tick = () => {
      const t = Math.floor(Math.max(0, end - Date.now()) / 1000);
      els.h.textContent = pad(Math.floor(t / 3600));
      els.m.textContent = pad(Math.floor((t % 3600) / 60));
      els.s.textContent = pad(t % 60);
    };
    tick();
    setInterval(tick, 1000);
    // atualiza na hora quando o visitante volta para a aba
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("pageshow", tick);
  }

  /* ------------------------------------------------------------------
     Timeline dos módulos (destaque ao passar o mouse)
     ------------------------------------------------------------------ */
  function setupTimeline() {
    const box = $("[data-tl]");
    if (!box) return;
    const fill = $("[data-tl-fill]", box);
    if (fill) fill.style.display = "none";
    const ease = "cubic-bezier(.2,.8,.2,1)";

    $$("[data-tl-row]", box).forEach((r) => {
      const dot = $("[data-tl-dot]", r);
      const card = $("[data-tl-card]", r);
      dot.style.transition = "transform 0.5s " + ease + ", filter 0.5s";
      card.style.transition = "transform 0.6s " + ease + ", border-color 0.5s, filter 0.5s";
      const set = (on) => {
        dot.style.transform = on ? "scale(1.12)" : "scale(1)";
        dot.style.filter = on ? "brightness(1.35) drop-shadow(0 0 14px rgba(0,155,255,0.9))" : "none";
        card.style.transform = on ? "translate3d(8px,0,0)" : "translate3d(0,0,0)";
        card.style.borderColor = on ? "rgba(0,155,255,0.7)" : "";
        card.style.filter = on ? "brightness(1.25)" : "none";
      };
      r.addEventListener("mouseenter", () => set(true));
      r.addEventListener("mouseleave", () => set(false));
    });
  }

  /* ------------------------------------------------------------------
     Leque de projetos
     ------------------------------------------------------------------ */
  function setupFan() {
    const box = $("[data-fan]");
    if (!box) return;
    const cards = $$("[data-fan-card]", box);
    const caps = $$("[data-fan-cap]");
    const dots = $$("[data-fan-dot]");
    const n = cards.length;
    let open = false, shown = false;
    let active = 0;

    const layout = () => {
      const cw = box.clientWidth, small = cw < 640;
      const W = cards[0].offsetWidth, H = cards[0].offsetHeight;
      const side = small ? 0.78 : 0.74;
      const gap = small ? W * 0.5 : Math.min(W * 0.62, cw / 2 - (W * side) / 2 - 8);
      const amp = H * (small ? 0.14 : 0.18), rot = small ? 6 : 9;
      const far = small ? gap * 1.55 : Math.min(gap * 1.7, cw / 2 - (W * side * 0.82) / 2 - 4);
      const slot = (d) => {
        if (d === 0) return { x: 0, y: amp * 0.45, r: 0, s: 1, z: 10 };
        const sg = Math.sign(d), ad = Math.abs(d);
        if (ad === 1) return { x: sg * gap, y: -amp * 0.55, r: -sg * rot, s: side, z: 5 };
        if (ad === 2) return { x: sg * far, y: -amp * 1.7, r: -sg * rot * 1.8, s: side * 0.82, z: 3 };
        return { x: sg * far * 1.35, y: -amp * 2.6, r: -sg * rot * 2.4, s: side * 0.7, z: 1, o: 0 };
      };
      const tf = (p) => "translate(" + Math.round(p.x - W / 2) + "px," + Math.round(p.y - H / 2) + "px) rotate(" + p.r.toFixed(2) + "deg) scale(" + p.s.toFixed(3) + ")";

      cards.forEach((c, i) => {
        let d = i - active;
        if (d > Math.floor(n / 2)) d -= n;
        if (d < -Math.floor(n / 2)) d += n;
        const on = d === 0;
        let p = slot(d), o = p.o === 0 ? 0 : 1;
        if (!open) { p = { x: 0, y: H * 0.55, r: 0, s: 0.82, z: 1 }; o = 0; }
        if (open && c._d !== undefined && Math.abs(d - c._d) > 2) {
          const tr = c.style.transition;
          c.style.transition = "none";
          c.style.opacity = "0";
          c.style.transform = tf(slot(d < 0 ? -3 : 3));
          void c.offsetWidth;
          c.style.transition = tr;
        }
        if (open) c._d = d;
        c.style.transform = tf(p);
        c.style.zIndex = String(p.z);
        c.style.opacity = String(o);
        c.style.transitionDelay = open && !shown ? (Math.abs(d) * 0.12).toFixed(2) + "s" : "0s";
        c.style.borderColor = on ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.08)";
        c.style.boxShadow = on ? "0 40px 90px rgba(0,0,0,0.75)" : "0 20px 50px rgba(0,0,0,0.5)";
        c.style.filter = on || !open ? "none" : "blur(" + (small ? 2 : 3) + "px) brightness(0.6) saturate(0.8)";
      });
      caps.forEach((p, i) => {
        p.classList.toggle("is-active", i === active);
        p.style.transform = i === active ? "translateY(0)" : "translateY(8px)";
      });
      dots.forEach((d, i) => {
        const dv = d.firstElementChild || d;
        dv.style.width = i === active ? "26px" : "8px";
        dv.style.backgroundColor = i === active ? "#009BFF" : "rgba(255,255,255,0.28)";
      });
    };

    const set = (i) => { active = (i + n) % n; layout(); };
    cards.forEach((c, i) => {
      c.addEventListener("click", () => set(i));
      c.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); set(i); } });
    });
    dots.forEach((d, i) => d.addEventListener("click", () => set(i)));

    let sx = null;
    box.addEventListener("touchstart", (ev) => { sx = ev.touches[0].clientX; }, { passive: true });
    box.addEventListener("touchend", (ev) => {
      if (sx === null) return;
      const dx = ev.changedTouches[0].clientX - sx;
      sx = null;
      if (Math.abs(dx) > 40) set(active + (dx < 0 ? 1 : -1));
    }, { passive: true });

    layout();
    new IntersectionObserver((en) => {
      if (en[0].isIntersecting && !open) {
        open = true; shown = false; layout();
        setTimeout(() => { shown = true; }, 1300);
      }
    }, { threshold: 0.35 }).observe(box);
    window.addEventListener("resize", layout);
  }

  /* ------------------------------------------------------------------
     Avaliações: transforma a grade em uma faixa infinita rolando sozinha
     ------------------------------------------------------------------ */
  function setupReviews() {
    const src = $("[data-rv]");
    if (!src || !src.parentNode || prefersReducedMotion) return;

    const view = document.createElement("div");
    view.className = "reviews-marquee";
    const track = document.createElement("div");
    track.className = "reviews-marquee__track";
    const cards = Array.from(src.children);
    // 3 cópias dos cards para o loop não ter emenda
    for (let k = 0; k < 3; k++) {
      cards.forEach((card) => {
        const cl = card.cloneNode(true);
        if (k) cl.setAttribute("aria-hidden", "true");
        track.appendChild(cl);
      });
    }
    view.appendChild(track);
    src.parentNode.insertBefore(view, src.nextSibling);
    src.style.display = "none";

    const st = { off: 0, half: 0, speed: 34 }; // velocidade em px por segundo
    const measure = () => {
      const k = track.children;
      if (k.length > cards.length) st.half = k[cards.length].offsetLeft - k[0].offsetLeft;
    };
    measure();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    setTimeout(measure, 600);
    window.addEventListener("resize", measure);

    let visible = false, last = 0, raf = null;
    const tick = (now) => {
      raf = null;
      if (!visible) return;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      if (st.half) {
        st.off = (st.off + st.speed * dt) % st.half;
        track.style.transform = "translate3d(" + (-st.off).toFixed(1) + "px,0,0)";
      }
      raf = requestAnimationFrame(tick);
    };
    new IntersectionObserver((en) => {
      visible = en[0].isIntersecting;
      last = 0;
      if (visible && !raf) raf = requestAnimationFrame(tick);
    }, { threshold: 0 }).observe(view);
  }

  /* ------------------------------------------------------------------
     Vídeo do hero: trava a rolagem até o vídeo terminar e revela o texto
     ------------------------------------------------------------------ */
  function setupHeroVideo() {
    const v = $(".hero__video");
    const box = $(".hero__content");
    const kids = box ? Array.from(box.children) : [];
    let shown = false, unlock = null, fallback = null;

    const blurBg = () => {
      if (!v || v._blurred) return;
      v._blurred = true;
      v.style.transition = "filter 1.4s cubic-bezier(.4,0,.2,1), transform 1.6s cubic-bezier(.4,0,.2,1), opacity 1.4s ease";
      v.style.filter = "blur(14px) brightness(0.5)";
      v.style.transform = "scale(1.06)";
    };
    const reveal = (early) => {
      blurBg();
      if (shown) return;
      shown = true;
      clearTimeout(fallback);
      if (unlock) unlock();
      const d0 = early === true ? 0 : 0.5;
      kids.forEach((k, i) => {
        const delay = (d0 + i * 0.16) + "s";
        k.style.transition = "opacity 0.9s cubic-bezier(.2,.7,.2,1) " + delay + ", transform 1.1s cubic-bezier(.2,.7,.2,1) " + delay;
        k.style.opacity = "1";
        k.style.transform = "translate3d(0,0,0)";
      });
    };

    if (!v || prefersReducedMotion) {
      if (v) { v.removeAttribute("autoplay"); v.pause(); }
      return;
    }

    kids.forEach((k) => { k.style.transition = "none"; k.style.opacity = "0"; k.style.transform = "translate3d(0,70px,0)"; });
    v.muted = true;

    if (!location.hash) {
      try { history.scrollRestoration = "manual"; } catch (e) {}
      window.scrollTo(0, 0);
    }

    if (window.pageYOffset < 10) {
      const keys = { ArrowDown: 1, ArrowUp: 1, PageDown: 1, PageUp: 1, Home: 1, End: 1, " ": 1, Spacebar: 1 };
      const tStart = Date.now();
      const block = (ev) => {
        if (ev.type === "keydown" && !keys[ev.key]) return;
        ev.preventDefault();
        if (Date.now() - tStart >= 2000) reveal(true);
      };
      const onAnchor = (ev) => { if (ev.target.closest && ev.target.closest('a[href^="#"]')) reveal(); };
      const de = document.documentElement;
      const prevO = de.style.overflow, prevB = document.body.style.overflow, prevTA = document.body.style.touchAction;
      de.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
      window.addEventListener("wheel", block, { passive: false });
      window.addEventListener("touchmove", block, { passive: false });
      window.addEventListener("keydown", block, { passive: false });
      document.addEventListener("click", onAnchor, true);
      unlock = () => {
        unlock = null;
        de.style.overflow = prevO;
        document.body.style.overflow = prevB;
        document.body.style.touchAction = prevTA;
        window.removeEventListener("wheel", block);
        window.removeEventListener("touchmove", block);
        window.removeEventListener("keydown", block);
        document.removeEventListener("click", onAnchor, true);
      };
    }

    v.addEventListener("ended", () => reveal(false), { once: true });
    v.addEventListener("error", reveal, { once: true });
    v.addEventListener("loadedmetadata", () => {
      clearTimeout(fallback);
      const left = isFinite(v.duration) ? (v.duration - v.currentTime) * 1000 : 12000;
      fallback = setTimeout(reveal, left + 1500);
    }, { once: true });
    fallback = setTimeout(reveal, 14000);
    const p = v.play();
    if (p && p.catch) p.catch(reveal);
    if (window.pageYOffset > window.innerHeight * 0.5) reveal();
  }

  /* ------------------------------------------------------------------
     Contadores animados (+280, +2, +200)
     ------------------------------------------------------------------ */
  function setupCounters() {
    const nodes = $$("[data-count]");
    if (!nodes.length) return;
    const fmt = (el, v) => { el.textContent = (el.dataset.pre || "") + Math.round(v).toLocaleString("pt-BR") + (el.dataset.suf || ""); };
    const run = (el) => {
      const target = parseFloat(el.dataset.count) || 0;
      cancelAnimationFrame(el._raf);
      const dur = 2200, t0 = performance.now();
      const step = (t) => {
        const p = Math.min((t - t0) / dur, 1);
        fmt(el, target * (1 - Math.pow(1 - p, 4)));
        if (p < 1) el._raf = requestAnimationFrame(step);
      };
      el._raf = requestAnimationFrame(step);
    };
    const reset = (el) => { cancelAnimationFrame(el._raf); fmt(el, 0); };
    nodes.forEach(reset);
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) run(e.target); else reset(e.target); });
    }, { threshold: 0.35 });
    nodes.forEach((el) => io.observe(el));
  }

  /* ------------------------------------------------------------------
     Revelação dos elementos ao rolar
     ------------------------------------------------------------------ */
  function setupReveal() {
    if (!("IntersectionObserver" in window) || prefersReducedMotion) return;

    const targets = [];
    $$("section").forEach((sec) => {
      Array.from(sec.children).forEach((child) => {
        // itens dentro de grids e linhas viram alvos individuais (efeito cascata)
        const kids = Array.from(child.children).filter((k) => k.children.length || k.textContent.trim());
        const disp = getComputedStyle(child).display;
        if ((disp === "grid" || disp === "flex") && kids.length > 1 && kids.length <= 12) kids.forEach((k) => targets.push(k));
        else targets.push(child);
      });
    });

    const groups = new Map();
    targets.forEach((el) => {
      if (el.closest(".header") || el.closest(".hero__content") || el.closest("[data-fan]") || el.closest("[data-tl]") || el.closest("[data-rv]")) return;
      if (el.matches(".dots")) return;
      if (el.dataset.reveal) return;
      const pos = getComputedStyle(el).position;
      if (pos === "absolute" || pos === "fixed") return; // não mexe no carrossel nem nos brilhos
      el.dataset.reveal = "1";
      el.style.opacity = "0";
      el.style.transform = "translateY(34px)";
      el.style.willChange = "opacity, transform";
      el.style.transition = "opacity 0.9s cubic-bezier(0.16,1,0.3,1), transform 0.9s cubic-bezier(0.16,1,0.3,1)";
      const arr = groups.get(el.parentElement) || [];
      arr.push(el);
      groups.set(el.parentElement, arr);
      el.dataset.revealDelay = String(Math.min(arr.length - 1, 6) * 150);
    });

    const show = (el) => {
      const d = parseInt(el.dataset.revealDelay || "0", 10);
      setTimeout(() => {
        el.style.opacity = "1";
        el.style.transform = "translateY(0)";
        setTimeout(() => { el.style.willChange = "auto"; }, 800);
      }, d);
    };

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -26% 0px", threshold: 0.1 });

    targets.forEach((el) => {
      if (!el.dataset.reveal) return;
      if (el.getBoundingClientRect().top < window.innerHeight * 0.75) show(el); // já visível no carregamento
      else io.observe(el);
    });

    // rede de segurança: nada fica invisível se o observer falhar
    const fallback = () => {
      $$("[data-reveal]").forEach((el) => {
        if (el.style.opacity !== "0") return;
        if (el.getBoundingClientRect().top < window.innerHeight * 0.82) show(el);
      });
    };
    window.addEventListener("scroll", fallback, { passive: true });
    window.addEventListener("resize", fallback, { passive: true });
    setInterval(fallback, 1200);
  }

  /* ------------------------------------------------------------------
     FAQ (acordeão — uma pergunta aberta por vez)
     ------------------------------------------------------------------ */
  function setupFaq() {
    const items = $$(".faq__item");
    items.forEach((item) => {
      const btn = $(".faq__question", item);
      btn.addEventListener("click", () => {
        const willOpen = !item.classList.contains("is-open");
        items.forEach((other) => {
          const open = other === item && willOpen;
          other.classList.toggle("is-open", open);
          $(".faq__question", other).setAttribute("aria-expanded", String(open));
          $(".faq__symbol", other).textContent = open ? "−" : "+";
          $(".faq__answer", other).hidden = !open;
        });
      });
    });
  }

  /* ------------------------------------------------------------------
     Inicialização
     ------------------------------------------------------------------ */
  function init() {
    setupMobileMenu();
    setupNavIndicator();
    setupReviews();
    setupReveal();
    setupFan();
    setupTimeline();
    setupCountdown();
    setupSectionCards();
    setupCounters();
    setupHeroVideo();
    setupFaq();
    setupAnchorScroll();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
