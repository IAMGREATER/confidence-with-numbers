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

  const presenterNotes = [
    `Welcome everyone, and thank you for joining today's Confidence with Numbers session.

Today we're going to explore how we feel about maths, bust a few old myths from school, and show you how to unlock free, shift-friendly 1-to-1 Functional Skills support in Maths, English, and our new Digital Functional Skills Trust Trial.`,

    `Before we look at any slides with numbers on them, I want to start with a quick check-in.

Ask the room: "What is the very first word that pops into your head when someone says the word 'maths'?"

(Click the emotion chips as people call them out, or type their words into the box to build the Confidence Thermometer live.)`,

    `[INTRO TO VIDEO 1 — HOW I FEEL ABOUT MATHS]
"This first video is called 'How I Feel About Maths' from National Numeracy. As you watch, listen to how people from all walks of life describe that instant reaction to numbers — and notice how much of it comes from past experiences, not from a missing 'maths gene'."

(Press Play on Video 1. Pause briefly after to ask if anyone recognised themselves in what was said.)`,

    `What many of us just described actually has a name: Maths Anxiety. Researchers Tobias and Weissbrod described it as that feeling of panic or mental freeze when put on the spot with a maths problem.

(Press → to reveal 'Why It Happens' and 'How We Beat It'.)
Let's look at why this happens — and more importantly, how we break that cycle together.`,

    `[INTRO TO VIDEO 2 — THE ESSENTIALS OF NUMERACY]
"We have two short videos on this slide. This first video is about what we consider the essentials of numeracy — not abstract algebra from school, but the everyday number skills that genuinely help us at work and at home."

(Play Video 2, then introduce Video 3:)
[INTRO TO VIDEO 3 — VALUE, BELIEF AND PERSISTENCE]
"This next video is about Value, Belief, and Persistence — how seeing the value in numbers and shifting what we believe about ourselves helps us keep going."`,

    `Let's test a few common beliefs about maths. On the screen are 6 statements — some are true, and some are complete myths.

(Click a card once to zoom it to the front, discuss as a group whether it's True or a Myth, then click again to flip and reveal the answer.)`,

    `Here's why this matters for your career at Oxford Health. Level 2 Functional Skills in Maths and English is the full equivalent of a GCSE Grade C / 4 — and our Skills for Life team gives you free 1-to-1 online coaching around your shifts.

(Click a role pill, or click the photo to expand it full-centre and cycle through Nursing Associate, Senior HCSW, Registered Nurse, and Admin & Team Lead with ← / →.)`,

    `If you're thinking "I'd love to progress, but I struggled with maths at school" — this is how we teach Functional Skills Maths differently.

Instead of scary formulas, we use clear visual bar models and real healthcare examples like 75% of 80 ml. (Toggle 'Our Visual Way' vs 'Scary School Way' to show the contrast.)`,

    `We also offer Functional Skills English at Level 1 and Level 2 — covering Reading, Writing, and Speaking & Listening.

Whether it's writing clearer SBAR handovers, clinical notes, or job applications, 1-to-1 feedback turns rushed, stressful writing into calm, structured communication. (Toggle After vs Rushed Draft.)`,

    `And here is something brand new: Digital Functional Skills at Entry 3 and Level 1, which is being trialled right now here at Oxford Health.

It covers everyday NHS tech skills — from files and rotas to Outlook, Teams, and staying safe online. Anyone interested in joining the Trust Trial can email functionalskills@oxfordhealth.nhs.uk.`,

    `[INTRO TO VIDEO 4 — THE 10-MINUTE QUICK CHECK]
"To wrap up before we get you started, this final short video introduces the National Numeracy Challenge — a free, completely confidential 10-minute Quick Check. There's no pass or fail, no timer pressure, just your personal starting point."

(Press Play on Video 4.)`,

    `Here are your three easy next steps today:

1. Scan the first QR code (or use code oxhealthcamp) to try the 10-minute National Numeracy Quick Check.
2. To sign up for free 1-to-1 Functional Skills in Maths, English, or the Digital Trust Trial with Abdul & Taniya, email functionalskills@oxfordhealth.nhs.uk.
3. Finally, please scan the feedback QR code on the right — it takes 30 seconds and really helps us. Thank you!`
  ];

  const isMirror = new URLSearchParams(location.search).has('mirror');
  if (isMirror) {
    document.querySelector('.hud')?.style.setProperty('display', 'none');
  }

  const syncChannel = typeof BroadcastChannel !== 'undefined'
    ? new BroadcastChannel('nn_presenter_sync')
    : null;

  function getRoomId() {
    const urlRoom = new URLSearchParams(location.search).get('room');
    if (urlRoom) return urlRoom;
    let saved = sessionStorage.getItem('nn_room_id');
    if (!saved) {
      saved = 'nn-oh-' + Math.random().toString(36).slice(2, 8);
      sessionStorage.setItem('nn_room_id', saved);
    }
    return saved;
  }

  const roomId = isMirror ? '' : getRoomId();
  let remoteSyncActive = !isMirror && new URLSearchParams(location.search).has('room');
  let remoteSource = null;
  let lastPayload = null;
  let postTimer = null;

  function ensureRemoteSync() {
    if (isMirror || remoteSource) return;
    remoteSyncActive = true;
    try {
      remoteSource = new EventSource(`https://ntfy.sh/${encodeURIComponent(roomId)}/sse`);
      remoteSource.onmessage = (ev) => {
        try {
          const outer = JSON.parse(ev.data);
          if (outer.event !== 'message' || !outer.message) return;
          const msg = JSON.parse(outer.message);
          if (msg.type === 'request_state') {
            if (lastPayload) {
              fetch(`https://ntfy.sh/${encodeURIComponent(roomId)}`, {
                method: 'POST',
                body: JSON.stringify(lastPayload)
              }).catch(() => {});
            }
          } else if (msg.type === 'cmd') {
            if (msg.cmd === 'next') advanceForward();
            if (msg.cmd === 'prev') stepBackward();
          }
        } catch {}
      };
    } catch {}
  }

  if (remoteSyncActive) ensureRemoteSync();

  function broadcastPresenterState(customTitle, customNote) {
    if (isMirror) return;
    const payload = {
      type: 'state',
      slide: current,
      total: slides.length,
      title: customTitle || slides[current]?.dataset.title || `Slide ${current + 1}`,
      note: customNote || presenterNotes[current] || '',
      nextTitle: slides[current + 1]?.dataset.title || 'End of presentation'
    };
    lastPayload = payload;
    if (syncChannel) syncChannel.postMessage(payload);
    try { localStorage.setItem('nn_presenter_state', JSON.stringify(payload)); } catch {}
    if (remoteSyncActive) {
      clearTimeout(postTimer);
      postTimer = setTimeout(() => {
        fetch(`https://ntfy.sh/${encodeURIComponent(roomId)}`, {
          method: 'POST',
          body: JSON.stringify(payload)
        }).catch(() => {});
      }, 60);
    }
  }

  if (syncChannel) {
    syncChannel.onmessage = (e) => {
      if (isMirror) {
        if (e.data?.type === 'state' && typeof e.data.slide === 'number') {
          showSlide(e.data.slide, false, true);
        }
        return;
      }
      if (e.data?.type === 'request_state') broadcastPresenterState();
      if (e.data?.type === 'cmd') {
        if (e.data.cmd === 'next') advanceForward();
        if (e.data.cmd === 'prev') stepBackward();
      }
    };
  }

  if (isMirror) {
    window.addEventListener('message', (e) => {
      if (e.data?.type === 'mirror_slide' && typeof e.data.slide === 'number') {
        showSlide(e.data.slide, false, true);
      }
    });
    setTimeout(() => syncChannel?.postMessage({ type: 'request_state' }), 150);
  }

  function openPresenterView() {
    ensureRemoteSync();
    window.open(`presenter.html?room=${encodeURIComponent(roomId)}`, 'nnPresenterView', 'width=1180,height=720');
    setTimeout(() => broadcastPresenterState(), 300);
  }

  let slide4Stage = 'init';
  let slide7Stage = 'init';

  function showSlide(index, updateHash = true, revealAll = false) {
    pauseAllVideos();
    closeSpotlight();
    closeAnxietyModal();
    closePathwayExpanded(false);
    const prev = current;
    current = Math.max(0, Math.min(slides.length - 1, index));
    if (current === 3) {
      slide4Stage = revealAll ? 'how-done' : 'init';
    }
    if (current === 6) {
      slide7Stage = revealAll ? 'done' : 'init';
      selectPathway(pathwayOrder[0]);
    }
    const dirClass = current > prev ? 'dir-forward' : current < prev ? 'dir-backward' : '';
    slides.forEach((s, i) => {
      s.classList.remove('dir-forward', 'dir-backward');
      const isActive = i === current;
      s.classList.toggle('active', isActive);
      if (isActive && dirClass) {
        void s.offsetWidth;
        s.classList.add(dirClass);
      }
      if (isActive) {
        s.querySelectorAll('.reveal-step').forEach((el) => {
          el.classList.toggle('revealed', revealAll);
        });
      }
    });
    const num = String(current + 1).padStart(2, '0');
    const total = String(slides.length).padStart(2, '0');
    slideCounter.textContent = `${num} / ${total}`;
    progressBar.style.width = `${((current + 1) / slides.length) * 100}%`;
    broadcastPresenterState();
    if (updateHash) {
      history.replaceState(null, '', `#${current + 1}`);
    }
  }

  function advanceForward() {
    if (anxietyBackdrop.classList.contains('open')) {
      const len = anxietyData[axMode].length;
      if (axIndex < len - 1) {
        stepAnxiety(1);
      } else {
        const finishedMode = axMode;
        closeAnxietyModal();
        if (finishedMode === 'tips') {
          showSlide(current + 1, true, false);
        }
      }
      return;
    }

    if (current === 3) {
      const causesBtn = document.getElementById('openCausesBtn');
      const tipsBtn = document.getElementById('openTipsBtn');
      if (slide4Stage === 'init' && causesBtn && !causesBtn.classList.contains('revealed')) {
        causesBtn.classList.add('revealed');
        slide4Stage = 'why-btn';
        return;
      }
      if (slide4Stage === 'why-btn') {
        openAnxietyModal('causes');
        return;
      }
      if (slide4Stage === 'why-done' && tipsBtn && !tipsBtn.classList.contains('revealed')) {
        tipsBtn.classList.add('revealed');
        slide4Stage = 'how-btn';
        return;
      }
      if (slide4Stage === 'how-btn') {
        openAnxietyModal('tips');
        return;
      }
    }

    if (slide7?.classList.contains('pathway-expanded')) {
      if (currentPathwayIdx < pathwayOrder.length - 1) {
        stepPathway(1);
      } else {
        closePathwayExpanded(false);
        showSlide(current + 1, true, false);
      }
      return;
    }

    if (current === 6 && slide7Stage === 'init') {
      slide7Stage = 'expanded';
      flipTogglePathway(true);
      return;
    }

    const activeSlide = slides[current];
    const nextStep = activeSlide?.querySelector('.reveal-step:not(.revealed)');
    if (nextStep) {
      nextStep.classList.add('revealed');
      return;
    }
    showSlide(current + 1, true, false);
  }

  function stepBackward() {
    if (anxietyBackdrop.classList.contains('open')) {
      if (axIndex > 0) {
        stepAnxiety(-1);
      } else {
        closeAnxietyModal();
      }
      return;
    }
    if (slide7?.classList.contains('pathway-expanded')) {
      if (currentPathwayIdx > 0) {
        stepPathway(-1);
      } else {
        closePathwayExpanded(true);
      }
      return;
    }
    showSlide(current - 1, true, true);
  }

  function syncFromHash() {
    const hashNum = parseInt(location.hash.replace('#', ''), 10);
    if (!isNaN(hashNum) && hashNum >= 1 && hashNum <= slides.length) {
      showSlide(hashNum - 1, false, false);
    } else {
      showSlide(0, true, false);
    }
  }

  window.addEventListener('hashchange', syncFromHash);

  // Navigation buttons
  document.getElementById('prevBtn').addEventListener('click', stepBackward);
  document.getElementById('nextBtn').addEventListener('click', advanceForward);

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
  document.addEventListener('fullscreenchange', async () => {
    if (!document.fullscreenElement) {
      navigator.keyboard?.unlock?.();
    } else if (document.fullscreenElement === document.documentElement) {
      try {
        if (navigator.keyboard && navigator.keyboard.lock) {
          await navigator.keyboard.lock(['Escape']);
        }
      } catch {}
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
        slide7?.classList.contains('pathway-expanded') ||
        overviewOverlay.classList.contains('open');
      if (hasOpenOverlay) {
        e.preventDefault();
        e.stopPropagation();
        closeSpotlight();
        closeAnxietyModal();
        closePathwayExpanded(true);
        overviewOverlay.classList.remove('open');
        return;
      }
      if (document.fullscreenElement?.tagName === 'VIDEO') {
        e.preventDefault();
        e.stopPropagation();
        document.exitFullscreen?.();
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
    if (slide7?.classList.contains('pathway-expanded')) {
      if (e.key === 'ArrowRight') { e.preventDefault(); stepPathway(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); stepPathway(-1); }
      return;
    }
    if (spotlightBackdrop.classList.contains('open')) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
      if (e.key === ' ' && ['BUTTON', 'A', 'VIDEO'].includes(document.activeElement.tagName)) return;
      e.preventDefault();
      advanceForward();
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      stepBackward();
    } else if (e.key.toLowerCase() === 'f') {
      toggleFullscreen();
    } else if (e.key.toLowerCase() === 'o') {
      overviewOverlay.classList.toggle('open');
      if (overviewOverlay.classList.contains('open')) openOverview();
    } else if (e.key.toLowerCase() === 'n' || e.key.toLowerCase() === 'p') {
      openPresenterView();
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
        desc: 'Being put on the spot at the front of the class or embarrassed in front of peers leaves a lasting emotional memory.',
        script: `[WHY IT HAPPENS · 1 OF 4 — NEGATIVE SCHOOL EXPERIENCES]\n"Many of us carry a memory of being called up to the whiteboard or put on the spot in front of the whole class.\n\nThat embarrassment sticks with you — even decades later, your brain remembers that feeling before you even look at the numbers."`
      },
      {
        img: 'assets/images/cause-pressure.jpg',
        title: 'Time Pressure & Timed Tests',
        desc: 'Quick-fire times tables and ticking clocks trigger panic — even when you know how to do the maths calmly.',
        script: `[WHY IT HAPPENS · 2 OF 4 — TIME PRESSURE & TIMED TESTS]\n"At school, maths was often treated like a speed test — rapid-fire times tables and ticking clocks.\n\nWhen you feel rushed, your working memory freezes up, even when you actually know how to solve the problem calmly."`
      },
      {
        img: 'assets/images/cause-label.jpg',
        title: 'Being Labelled “Not a Maths Person”',
        desc: 'Hearing from teachers, parents, or yourself that you just don’t have a “maths brain” creates a false ceiling.',
        script: `[WHY IT HAPPENS · 3 OF 4 — BEING LABELLED "NOT A MATHS PERSON"]\n"Maybe a teacher, a parent, or even you yourself said: 'I'm just not a maths person.'\n\nThere is no such thing as a 'maths brain' — that label just creates a false ceiling that stops people from trying."`
      },
      {
        img: 'assets/images/cause-support.jpg',
        title: 'Lack of Support or Unrecognised Dyscalculia',
        desc: 'Without visual methods or dyslexia/dyscalculia-friendly guidance, numbers feel like a tangled knot.',
        script: `[WHY IT HAPPENS · 4 OF 4 — LACK OF SUPPORT / DYSCALCULIA]\n"If nobody ever showed you a visual way that fits how your brain works — especially if you have dyslexia or dyscalculia — numbers feel like a tangled knot.\n\nIt wasn't a lack of ability; it was a lack of the right support."`
      }
    ],
    tips: [
      {
        img: 'assets/images/tip-talk.jpg',
        title: 'Talk Openly About How You Feel',
        desc: 'Naming maths anxiety breaks its power — you quickly discover that colleagues and clinicians feel the exact same way.',
        script: `[HOW WE BEAT IT · 1 OF 4 — TALK OPENLY]\n"The first step is simply naming it. When you say out loud 'numbers make me anxious', you quickly realise that colleagues, managers, and clinicians right beside you feel the exact same way."`
      },
      {
        img: 'assets/images/tip-beliefs.jpg',
        title: 'Challenge Old School Beliefs',
        desc: 'Adult learning is completely different from school. You bring years of real-world problem solving to the table.',
        script: `[HOW WE BEAT IT · 2 OF 4 — CHALLENGE OLD SCHOOL BELIEFS]\n"Adult learning is nothing like school. You already solve complex problems every single day on shift and at home — you just need methods that connect to real life."`
      },
      {
        img: 'assets/images/tip-pace.jpg',
        title: 'Drop the Clock & Comparisons',
        desc: 'No racing against others. At Oxford Health Skills for Life, you learn at your own calm pace in 1-to-1 sessions.',
        script: `[HOW WE BEAT IT · 3 OF 4 — DROP THE CLOCK & COMPARISONS]\n"In our 1-to-1 Functional Skills sessions, there's no classroom, no rushing, and no comparing yourself to anyone else. We go at your calm pace."`
      },
      {
        img: 'assets/images/tip-goals.jpg',
        title: 'Take Small, Realistic Steps Together',
        desc: 'Step-by-step visual methods turn intimidating problems into small, achievable wins that build real confidence.',
        script: `[HOW WE BEAT IT · 4 OF 4 — SMALL, REALISTIC STEPS]\n"We break big topics into small, visual steps. Every small win builds real confidence — and before you know it, things that felt impossible start clicking."`
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
    broadcastPresenterState(`04 · ${axEyebrow.textContent}`, item.script);
  }

  function openAnxietyModal(mode) {
    axMode = mode;
    axIndex = 0;
    if (current === 3) {
      slide4Stage = mode === 'causes' ? 'why-open' : 'how-open';
    }
    renderAnxietySlide();
    anxietyBackdrop.classList.add('open');
  }

  function closeAnxietyModal() {
    if (!anxietyBackdrop) return;
    const wasOpen = anxietyBackdrop.classList.contains('open');
    anxietyBackdrop.classList.remove('open');
    if (wasOpen) {
      if (current === 3) {
        const tipsRevealed = document.getElementById('openTipsBtn')?.classList.contains('revealed');
        slide4Stage = axMode === 'tips' || tipsRevealed ? 'how-done' : 'why-done';
      }
      broadcastPresenterState();
    }
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
      desc: 'Requires <strong>Functional Skills Maths &amp; English Level 2</strong> (or GCSE). Free 1-to-1 coaching gets you exam-ready at Unipart or from home.',
      script: `[CAREER GATEWAY · NURSING ASSOCIATE]\n"If you're looking at the Nursing Associate Apprenticeship, you'll need Level 2 Maths and English (or GCSE).\n\nOur free 1-to-1 coaching fits around your shifts and gets you exam-ready — either at Unipart or from home."`
    },
    hcsw: {
      title: 'Senior HCSW',
      file: 'pathway_senior_hcsw.json',
      tag: 'APPRENTICESHIP OR BAND 3–4 PROGRESSION',
      img: 'assets/images/role-hcsw.jpg',
      alt: 'NHS Healthcare Support Worker with clipboard on a sunlit ward',
      desc: 'Via the <strong>Level 3 Senior HCSW Apprenticeship</strong> or direct Band 3/4 progression — Level 1–2 Maths &amp; English builds confidence with observations, fluid charts, and handovers.',
      script: `[CAREER GATEWAY · SENIOR HCSW]\n"For the Level 3 Senior HCSW Apprenticeship or Band 3/4 progression, Functional Skills Maths and English builds everyday confidence with observations, fluid balance charts, and written handovers."`
    },
    rn: {
      title: 'Registered Nurse',
      file: 'pathway_registered_nurse.json',
      tag: 'DEGREE APPRENTICESHIP / UNIVERSITY',
      img: 'assets/images/role-rn.jpg',
      alt: 'Registered Nurse reviewing digital chart at a nursing station',
      desc: 'Universities (like Oxford Brookes) require verified <strong>Level 2 Maths &amp; English</strong>. Start early with 1-to-1 coaching so application deadlines never catch you out.',
      script: `[CAREER GATEWAY · REGISTERED NURSE]\n"If your goal is the Registered Nurse Degree Apprenticeship or university like Oxford Brookes, they require verified Level 2 Maths and English.\n\nStarting early with 1-to-1 coaching means application deadlines never catch you out."`
    },
    admin: {
      title: 'Admin & Team Lead',
      file: 'pathway_admin_and_digital.json',
      tag: 'CAREER PROGRESSION & APPRENTICESHIPS',
      img: 'assets/images/role-admin.jpg',
      alt: 'NHS admin and team lead working at a sunlit desk with a laptop',
      desc: 'Supports <strong>Business Admin / Team Leader apprenticeships</strong> and internal promotion — combining Maths &amp; English with our <strong>Digital Functional Skills Trust Trial</strong>.',
      script: `[CAREER GATEWAY · ADMIN & TEAM LEAD]\n"For Business Admin, Team Leader apprenticeships, or internal promotion, we combine Maths and English with our brand-new Digital Functional Skills Trust Trial — covering Outlook, Teams, spreadsheets, and everyday NHS systems."`
    }
  };

  let currentPathwayIdx = 0;
  const slide7 = document.getElementById('slide7');
  const pathwayHeaderEl = slide7?.querySelector('.pathway-header');
  const pathwayVisualEl = document.getElementById('pathwayFrame');
  const pathwayCardEl = document.getElementById('pathwayCard');

  function selectPathway(role) {
    const idx = pathwayOrder.indexOf(role);
    if (idx !== -1) currentPathwayIdx = idx;
    document.querySelectorAll('#pathwayPills .pathway-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.role === role);
    });
    const data = pathways[role];
    const roleTitleEl = document.getElementById('pathwayActiveRoleTitle');
    if (roleTitleEl) roleTitleEl.textContent = data.title;
    const walker = document.getElementById('pathwayWalker');
    if (walker) walker.style.transform = `translateX(${currentPathwayIdx * 140}px)`;
    document.querySelectorAll('.pathway-stepper-wire .step-dot').forEach((dot, i) => {
      dot.classList.toggle('active-step', i <= currentPathwayIdx);
    });
    document.getElementById('pathwayFile').textContent = data.file;
    const imgEl = document.getElementById('pathwayImage');
    if (imgEl) {
      imgEl.src = data.img;
      imgEl.alt = data.alt;
    }
    document.getElementById('pathwayBody').innerHTML = `
      <span class="pill pill-highlight" style="margin-bottom:0.55rem; display:inline-block; font-size:0.85rem; padding:0.35rem 0.8rem;">${data.tag}</span>
      <p style="font-size:1.18rem; line-height:1.45; margin:0;">${data.desc}</p>`;
    if (current === 6) {
      broadcastPresenterState(`07 · Career Gateway — ${data.title}`, data.script);
    }
  }

  function flipTogglePathway(expand) {
    if (!slide7) return;
    const targets = [pathwayHeaderEl, pathwayVisualEl, pathwayCardEl].filter(Boolean);
    const firstRects = targets.map((el) => el.getBoundingClientRect());

    slide7.classList.toggle('pathway-expanded', expand);

    if (expand) {
      const data = pathways[pathwayOrder[currentPathwayIdx]];
      if (data) broadcastPresenterState(`07 · Career Gateway — ${data.title}`, data.script);
    } else if (current === 6) {
      broadcastPresenterState();
    }

    const lastRects = targets.map((el) => el.getBoundingClientRect());
    targets.forEach((el, i) => {
      const first = firstRects[i];
      const last = lastRects[i];
      if (!first.width || !last.width) return;
      const dx = (first.left + first.width / 2) - (last.left + last.width / 2);
      const dy = (first.top + first.height / 2) - (last.top + last.height / 2);
      const sx = first.width / last.width;
      const sy = first.height / last.height;
      el.animate(
        [
          { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
          { transform: 'translate(0, 0) scale(1, 1)' }
        ],
        { duration: 460, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
      );
    });
  }

  function closePathwayExpanded(animate = true) {
    if (!slide7 || !slide7.classList.contains('pathway-expanded')) return;
    slide7Stage = 'done';
    if (animate) {
      flipTogglePathway(false);
    } else {
      slide7.classList.remove('pathway-expanded');
    }
  }

  function stepPathway(delta) {
    currentPathwayIdx = (currentPathwayIdx + delta + pathwayOrder.length) % pathwayOrder.length;
    selectPathway(pathwayOrder[currentPathwayIdx]);
  }

  document.querySelectorAll('#pathwayPills .pathway-btn').forEach((btn) => {
    btn.addEventListener('click', () => selectPathway(btn.dataset.role));
  });

  pathwayVisualEl?.addEventListener('click', () => {
    const isExpanded = slide7?.classList.contains('pathway-expanded');
    flipTogglePathway(!isExpanded);
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
