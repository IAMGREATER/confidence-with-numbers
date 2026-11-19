(() => {
  const slides = Array.from(document.querySelectorAll('.slide'));
  const progressBar = document.getElementById('progressBar');
  const slideCounter = document.getElementById('slideCounter');
  const overviewOverlay = document.getElementById('overviewOverlay');
  const overviewGrid = document.getElementById('overviewGrid');

  let current = 0;

  function pauseAllVideos() {
    document.querySelectorAll('video').forEach((v) => {
      if (!v.paused) v.pause();
    });
  }

  function showSlide(index, updateHash = true) {
    pauseAllVideos();
    closeSpotlight();
    closeAnxietyModal();
    closePathwayModal();
    current = Math.max(0, Math.min(slides.length - 1, index));
    slides.forEach((s, i) => s.classList.toggle('active', i === current));
    const num = String(current + 1).padStart(2, '0');
    const total = String(slides.length).padStart(2, '0');
    slideCounter.textContent = `${num} / ${total}`;
    progressBar.style.width = `${((current + 1) / slides.length) * 100}%`;
    if (updateHash) {
      history.replaceState(null, '', `#${current + 1}`);
    }
  }

  function syncFromHash() {
    const hashNum = parseInt(location.hash.replace('#', ''), 10);
    if (!isNaN(hashNum) && hashNum >= 1 && hashNum <= slides.length) {
      showSlide(hashNum - 1, false);
    } else {
      showSlide(0, true);
    }
  }

  window.addEventListener('hashchange', syncFromHash);

  // Navigation buttons
  document.getElementById('prevBtn').addEventListener('click', () => showSlide(current - 1));
  document.getElementById('nextBtn').addEventListener('click', () => showSlide(current + 1));

  async function toggleFullscreen() {
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen?.();
        if (navigator.keyboard && navigator.keyboard.lock) {
          await navigator.keyboard.lock(['Escape']);
        }
      } catch {
        // Ignore if keyboard lock is unavailable
      }
    } else {
      navigator.keyboard?.unlock?.();
      document.exitFullscreen?.();
    }
  }
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
      navigator.keyboard?.unlock?.();
    }
  });
  document.getElementById('fullscreenBtn').addEventListener('click', toggleFullscreen);

  // Overview modal
  function openOverview() {
    overviewGrid.innerHTML = '';
    slides.forEach((s, i) => {
      const item = document.createElement('div');
      item.className = `overview-item ${i === current ? 'current' : ''}`;
      item.innerHTML = `<div style="font-family:var(--font-mono);font-size:0.8rem;color:#94a3b8;margin-bottom:0.35rem;">SLIDE ${i + 1}</div>
                        <div style="font-weight:700;">${s.dataset.title || 'Slide ' + (i + 1)}</div>`;
      item.addEventListener('click', () => {
        showSlide(i);
        overviewOverlay.classList.remove('open');
      });
      overviewGrid.appendChild(item);
    });
    overviewOverlay.classList.add('open');
  }

  document.getElementById('overviewBtn').addEventListener('click', openOverview);
  document.getElementById('closeOverviewBtn').addEventListener('click', () => overviewOverlay.classList.remove('open'));

  // Slide 6: 3-Step Myth Buster Spotlight (Click 1 = Zoom to Front, Click 2 = Flip, Click 3 / Backdrop = Return)
  const spotlightBackdrop = document.getElementById('spotlightBackdrop');
  const spotlightCard = document.getElementById('spotlightCard');
  const spNum = document.getElementById('spNum');
  const spQuestion = document.getElementById('spQuestion');
  const spBadge = document.getElementById('spBadge');
  const spAnswer = document.getElementById('spAnswer');

  function closeSpotlight() {
    spotlightCard.classList.remove('flipped');
    spotlightBackdrop.classList.remove('open');
  }

  document.querySelectorAll('.myth-card').forEach((card) => {
    card.addEventListener('click', () => {
      spNum.textContent = `MYTH BUSTER · ${card.dataset.num}`;
      spQuestion.textContent = card.dataset.q;
      spBadge.textContent = card.dataset.badge;
      spBadge.className = `badge-truth ${card.dataset.type === 'true' ? 'badge-true' : 'badge-myth'}`;
      spAnswer.textContent = card.dataset.a;
      spotlightCard.classList.remove('flipped');
      spotlightBackdrop.classList.add('open');
    });
  });

  spotlightCard.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!spotlightCard.classList.contains('flipped')) {
      spotlightCard.classList.add('flipped');
    } else {
      closeSpotlight();
    }
  });

  spotlightBackdrop.addEventListener('click', () => {
    closeSpotlight();
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
    if (e.key === 'Escape') {
      const hasOpenOverlay =
        spotlightBackdrop.classList.contains('open') ||
        anxietyBackdrop.classList.contains('open') ||
        pathwayBackdrop.classList.contains('open') ||
        overviewOverlay.classList.contains('open');
      if (hasOpenOverlay) {
        e.preventDefault();
        e.stopPropagation();
        closeSpotlight();
        closeAnxietyModal();
        closePathwayModal();
        overviewOverlay.classList.remove('open');
        return;
      }
      if (document.fullscreenElement) {
        navigator.keyboard?.unlock?.();
        document.exitFullscreen?.();
      }
      return;
    }
    if (anxietyBackdrop.classList.contains('open')) {
      if (e.key === 'ArrowRight') { e.preventDefault(); stepAnxiety(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); stepAnxiety(-1); }
      return;
    }
    if (pathwayBackdrop.classList.contains('open')) {
      if (e.key === 'ArrowRight') { e.preventDefault(); stepPathway(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); stepPathway(-1); }
      return;
    }
    if (spotlightBackdrop.classList.contains('open')) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') {
      e.preventDefault();
      showSlide(current + 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      showSlide(current - 1);
    } else if (e.key.toLowerCase() === 'f') {
      toggleFullscreen();
    } else if (e.key.toLowerCase() === 'o') {
      overviewOverlay.classList.toggle('open');
      if (overviewOverlay.classList.contains('open')) openOverview();
    } else if (e.shiftKey && e.key.toLowerCase() === 'd') {
      document.getElementById('downloadDeckBtn')?.click();
    }
  });

  // Slide 2: Live Confidence Thermometer
  function addWordToZone(word, zone) {
    const clean = word.trim();
    if (!clean) return;
    const target = document.getElementById(`zone-${zone}`);
    if (!target) return;
    const span = document.createElement('span');
    span.className = 'dropped-word';
    span.textContent = clean;
    target.appendChild(span);
  }

  document.querySelectorAll('.emotion-chip').forEach((chip) => {
    chip.addEventListener('click', () => addWordToZone(chip.dataset.word, chip.dataset.zone));
  });

  const customInput = document.getElementById('customWordInput');
  const customZone = document.getElementById('customWordZone');
  document.getElementById('addWordBtn').addEventListener('click', () => {
    addWordToZone(customInput.value, customZone.value);
    customInput.value = '';
    customInput.focus();
  });
  customInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      addWordToZone(customInput.value, customZone.value);
      customInput.value = '';
    }
  });
  document.getElementById('clearThermoBtn').addEventListener('click', () => {
    ['high', 'mid', 'low'].forEach((z) => {
      document.getElementById(`zone-${z}`).innerHTML = '';
    });
  });

  // Slide 4: Anxiety Visual Carousel Popup
  const anxietyData = {
    causes: [
      {
        img: 'assets/images/cause-school.jpg',
        title: 'Negative School Experiences',
        desc: 'Being put on the spot at the front of the class or embarrassed in front of peers leaves a lasting emotional memory.'
      },
      {
        img: 'assets/images/cause-pressure.jpg',
        title: 'Time Pressure & Timed Tests',
        desc: 'Quick-fire times tables and ticking clocks trigger panic — even when you know how to do the maths calmly.'
      },
      {
        img: 'assets/images/cause-label.jpg',
        title: 'Being Labelled “Not a Maths Person”',
        desc: 'Hearing from teachers, parents, or yourself that you just don’t have a “maths brain” creates a false ceiling.'
      },
      {
        img: 'assets/images/cause-support.jpg',
        title: 'Lack of Support or Unrecognised Dyscalculia',
        desc: 'Without visual methods or dyslexia/dyscalculia-friendly guidance, numbers feel like a tangled knot.'
      }
    ],
    tips: [
      {
        img: 'assets/images/tip-talk.jpg',
        title: 'Talk Openly About How You Feel',
        desc: 'Naming maths anxiety breaks its power — you quickly discover that colleagues and clinicians feel the exact same way.'
      },
      {
        img: 'assets/images/tip-beliefs.jpg',
        title: 'Challenge Old School Beliefs',
        desc: 'Adult learning is completely different from school. You bring years of real-world problem solving to the table.'
      },
      {
        img: 'assets/images/tip-pace.jpg',
        title: 'Drop the Clock & Comparisons',
        desc: 'No racing against others. At Oxford Health Skills for Life, you learn at your own calm pace in 1-to-1 sessions.'
      },
      {
        img: 'assets/images/tip-goals.jpg',
        title: 'Take Small, Realistic Steps Together',
        desc: 'Step-by-step visual methods turn intimidating problems into small, achievable wins that build real confidence.'
      }
    ]
  };

  const anxietyBackdrop = document.getElementById('anxietyBackdrop');
  const axImg = document.getElementById('axImg');
  const axEyebrow = document.getElementById('axEyebrow');
  const axTitle = document.getElementById('axTitle');
  const axDesc = document.getElementById('axDesc');
  const axSwitchCauses = document.getElementById('axSwitchCauses');
  const axSwitchTips = document.getElementById('axSwitchTips');

  let axMode = 'causes';
  let axIndex = 0;

  function renderAnxietySlide() {
    const list = anxietyData[axMode];
    const item = list[axIndex];
    axImg.src = item.img;
    axImg.alt = item.title;
    axEyebrow.textContent = `${axMode === 'causes' ? 'WHY IT HAPPENS' : 'HOW WE BEAT IT'} · ${axIndex + 1} OF ${list.length}`;
    axEyebrow.style.color = axMode === 'causes' ? 'var(--coral)' : 'var(--emerald)';
    axTitle.textContent = item.title;
    axDesc.textContent = item.desc;
    axSwitchCauses.classList.toggle('active', axMode === 'causes');
    axSwitchTips.classList.toggle('active', axMode === 'tips');
  }

  function openAnxietyModal(mode) {
    axMode = mode;
    axIndex = 0;
    renderAnxietySlide();
    anxietyBackdrop.classList.add('open');
  }

  function closeAnxietyModal() {
    if (anxietyBackdrop) anxietyBackdrop.classList.remove('open');
  }

  function stepAnxiety(delta) {
    const len = anxietyData[axMode].length;
    axIndex = (axIndex + delta + len) % len;
    renderAnxietySlide();
  }

  document.getElementById('openCausesBtn').addEventListener('click', () => openAnxietyModal('causes'));
  document.getElementById('openTipsBtn').addEventListener('click', () => openAnxietyModal('tips'));
  axSwitchCauses.addEventListener('click', () => { axMode = 'causes'; axIndex = 0; renderAnxietySlide(); });
  axSwitchTips.addEventListener('click', () => { axMode = 'tips'; axIndex = 0; renderAnxietySlide(); });
  document.getElementById('axPrevBtn').addEventListener('click', () => stepAnxiety(-1));
  document.getElementById('axNextBtn').addEventListener('click', () => stepAnxiety(1));
  document.getElementById('axCloseBtn').addEventListener('click', closeAnxietyModal);
  anxietyBackdrop.addEventListener('click', (e) => {
    if (e.target === anxietyBackdrop) closeAnxietyModal();
  });

  // Slide 7: Career Gateway Selector + Click-to-Expand Spotlight
  const pathwayOrder = ['na', 'hcsw', 'rn', 'admin'];
  const pathways = {
    na: {
      title: 'Nursing Associate',
      file: 'pathway_nursing_associate.json',
      tag: 'APPRENTICESHIP',
      img: 'assets/images/nhs-care-numbers.jpg',
      alt: 'NHS Nursing Associate colleagues collaborating over a tablet',
      desc: 'Requires <strong>Functional Skills Maths &amp; English Level 2</strong> (or GCSE). Free 1-to-1 coaching gets you exam-ready at Unipart or from home.'
    },
    hcsw: {
      title: 'Senior HCSW',
      file: 'pathway_senior_hcsw.json',
      tag: 'APPRENTICESHIP OR BAND 3–4 PROGRESSION',
      img: 'assets/images/role-hcsw.jpg',
      alt: 'NHS Healthcare Support Worker with clipboard on a sunlit ward',
      desc: 'Via the <strong>Level 3 Senior HCSW Apprenticeship</strong> or direct Band 3/4 progression — Level 1–2 Maths &amp; English builds confidence with observations, fluid charts, and handovers.'
    },
    rn: {
      title: 'Registered Nurse',
      file: 'pathway_registered_nurse.json',
      tag: 'DEGREE APPRENTICESHIP / UNIVERSITY',
      img: 'assets/images/role-rn.jpg',
      alt: 'Registered Nurse reviewing digital chart at a nursing station',
      desc: 'Universities (like Oxford Brookes) require verified <strong>Level 2 Maths &amp; English</strong>. Start early with 1-to-1 coaching so application deadlines never catch you out.'
    },
    admin: {
      title: 'Admin & Team Lead',
      file: 'pathway_admin_and_digital.json',
      tag: 'CAREER PROGRESSION & APPRENTICESHIPS',
      img: 'assets/images/role-admin.jpg',
      alt: 'NHS admin and team lead working at a sunlit desk with a laptop',
      desc: 'Supports <strong>Business Admin / Team Leader apprenticeships</strong> and internal promotion — combining Maths &amp; English with our <strong>Digital Functional Skills Trust Trial</strong>.'
    }
  };

  let currentPathwayIdx = 0;
  const pathwayBackdrop = document.getElementById('pathwayBackdrop');
  const pwModalEyebrow = document.getElementById('pwModalEyebrow');
  const pwModalTag = document.getElementById('pwModalTag');
  const pwModalTitle = document.getElementById('pwModalTitle');
  const pwModalImg = document.getElementById('pwModalImg');
  const pwModalDesc = document.getElementById('pwModalDesc');

  function selectPathway(role) {
    const idx = pathwayOrder.indexOf(role);
    if (idx !== -1) currentPathwayIdx = idx;
    document.querySelectorAll('#pathwayPills .pathway-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.role === role);
    });
    const data = pathways[role];
    document.getElementById('pathwayFile').textContent = data.file;
    const imgEl = document.getElementById('pathwayImage');
    if (imgEl) {
      imgEl.src = data.img;
      imgEl.alt = data.alt;
    }
    document.getElementById('pathwayBody').innerHTML = `
      <span class="pill pill-highlight" style="margin-bottom:0.55rem; display:inline-block; font-size:0.85rem; padding:0.35rem 0.8rem;">${data.tag}</span>
      <p style="font-size:1.18rem; line-height:1.45; margin:0;">${data.desc}</p>`;
  }

  function renderPathwayModal() {
    const role = pathwayOrder[currentPathwayIdx];
    const data = pathways[role];
    pwModalEyebrow.textContent = `CAREER GATEWAY · ${currentPathwayIdx + 1} OF ${pathwayOrder.length}`;
    pwModalTag.textContent = data.tag;
    pwModalTitle.textContent = data.title;
    pwModalImg.src = data.img;
    pwModalImg.alt = data.alt;
    pwModalDesc.innerHTML = data.desc;
  }

  function openPathwayModal() {
    renderPathwayModal();
    pathwayBackdrop.classList.add('open');
  }

  function closePathwayModal() {
    if (pathwayBackdrop) pathwayBackdrop.classList.remove('open');
  }

  function stepPathway(delta) {
    currentPathwayIdx = (currentPathwayIdx + delta + pathwayOrder.length) % pathwayOrder.length;
    selectPathway(pathwayOrder[currentPathwayIdx]);
    renderPathwayModal();
  }

  document.querySelectorAll('#pathwayPills .pathway-btn').forEach((btn) => {
    btn.addEventListener('click', () => selectPathway(btn.dataset.role));
  });

  document.getElementById('pathwayFrame')?.addEventListener('click', openPathwayModal);
  document.getElementById('pwPrevBtn')?.addEventListener('click', () => stepPathway(-1));
  document.getElementById('pwNextBtn')?.addEventListener('click', () => stepPathway(1));
  document.getElementById('pwCloseBtn')?.addEventListener('click', closePathwayModal);
  pathwayBackdrop?.addEventListener('click', (e) => {
    if (e.target === pathwayBackdrop) closePathwayModal();
  });

  // Slide 8: Maths Visual vs School Toggle
  document.querySelectorAll('#mathsToggle .toggle-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#mathsToggle .toggle-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const mode = btn.dataset.mode;
      document.getElementById('maths-visual').style.display = mode === 'visual' ? 'block' : 'none';
      document.getElementById('maths-school').style.display = mode === 'school' ? 'block' : 'none';
    });
  });

  // Slide 9: English After vs Before Toggle
  document.querySelectorAll('#englishToggle .toggle-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#englishToggle .toggle-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const mode = btn.dataset.mode;
      document.getElementById('eng-after').style.display = mode === 'after' ? 'block' : 'none';
      document.getElementById('eng-before').style.display = mode === 'before' ? 'block' : 'none';
    });
  });

  // Slide 12: One-Click Copy Buttons
  document.querySelectorAll('.copy-box').forEach((btn) => {
    const orig = btn.innerHTML;
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        btn.textContent = 'Copied! ✓';
        setTimeout(() => { btn.innerHTML = orig; }, 1600);
      } catch {
        btn.textContent = btn.dataset.copy;
      }
    });
  });

  syncFromHash();

  // Ambient Moving Background Canvas (drifting nodes, connecting lines & subtle numeracy symbols)
  const bgCanvas = document.getElementById('bgCanvas');
  if (bgCanvas) {
    const ctx = bgCanvas.getContext('2d');
    const symbols = ['+', '%', '÷', '=', '×', '○', '△'];
    const particles = [];
    const COUNT = 26;

    function resizeBg() {
      bgCanvas.width = window.innerWidth;
      bgCanvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeBg);
    resizeBg();

    for (let i = 0; i < COUNT; i++) {
      particles.push({
        x: Math.random() * bgCanvas.width,
        y: Math.random() * bgCanvas.height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: -0.15 - Math.random() * 0.35,
        size: 13 + Math.random() * 14,
        sym: i % 2 === 0 ? symbols[i % symbols.length] : null,
        r: 2.5 + Math.random() * 2.5,
        alpha: 0.08 + Math.random() * 0.1
      });
    }

    function drawBg() {
      ctx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
      const activeSlide = slides[current];
      const isDark = activeSlide && (activeSlide.classList.contains('theme-chalkboard') || activeSlide.classList.contains('theme-cinema'));
      const baseRgb = isDark ? '148, 197, 255' : '0, 94, 184';

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -30) { p.y = bgCanvas.height + 30; p.x = Math.random() * bgCanvas.width; }
        if (p.x < -30) p.x = bgCanvas.width + 30;
        if (p.x > bgCanvas.width + 30) p.x = -30;

        // Subtle connecting lines between nearby particles
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 150) {
            ctx.strokeStyle = `rgba(${baseRgb}, ${(1 - dist / 150) * 0.08})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }

        ctx.fillStyle = `rgba(${baseRgb}, ${p.alpha})`;
        if (p.sym) {
          ctx.font = `700 ${p.size}px Inter, sans-serif`;
          ctx.fillText(p.sym, p.x, p.y);
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      requestAnimationFrame(drawBg);
    }
    requestAnimationFrame(drawBg);
  }
})();
