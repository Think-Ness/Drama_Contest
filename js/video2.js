/* ==========================================================================
   VIDEO2.JS — English Drama Contest 1448 / 2026
   Master Video Scrollytelling with Progressive Interludes
   Pondok Modern Darussalam Gontor (PMDG)
   ========================================================================== */

'use strict';

document.addEventListener('DOMContentLoaded', () => {

  const state = {
    progress: 0,
    videoDuration: 80, // 8 clips @ 10s = 80s
    currentVideoTime: 0,
    targetVideoTime: 0,
    videoReady: false,
    infiniteLoop: true,
    activeStep: 'step-scene-1',
    isTeleporting: false
  };

  // DOM Elements
  const video = document.getElementById('scrolly-video');
  const ambientVideo = document.getElementById('ambient-video');
  const hudPctText = document.getElementById('hud-pct-text');
  const hudSceneBadge = document.getElementById('hud-scene-badge');
  const btnToggleLoop = document.getElementById('btn-toggle-loop');
  const loopStateText = document.getElementById('loop-state-text');
  const btnToggleFit = document.getElementById('btn-toggle-fit');
  const fitStateText = document.getElementById('fit-state-text');

  // Steps
  const stepElements = {
    'step-scene-1': document.getElementById('step-scene-1'),
    'step-scene-2': document.getElementById('step-scene-2'),
    'step-scene-3': document.getElementById('step-scene-3'),
    'step-interlude-1a': document.getElementById('step-interlude-1a'),
    'step-interlude-1b': document.getElementById('step-interlude-1b'),
    'step-interlude-1c': document.getElementById('step-interlude-1c'),
    'step-scene-4': document.getElementById('step-scene-4'),
    'step-interlude-2': document.getElementById('step-interlude-2'),
    'step-scene-5': document.getElementById('step-scene-5'),
    'step-interlude-3': document.getElementById('step-interlude-3'),
    'step-scene-7': document.getElementById('step-scene-7'),
    'step-scene-8': document.getElementById('step-scene-8')
  };

  // Reader Drawer
  const scriptDrawer = document.getElementById('script-drawer');
  const btnCloseDrawer = document.getElementById('btn-close-drawer');

  // Minimize toggles for Interlude 1 cards
  document.querySelectorAll('.btn-minimize-toggle').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const card = e.target.closest('.editorial-bento-card');
      if (!card) return;
      const isMin = card.classList.toggle('minimized');
      btn.textContent = isMin ? '+ EXPAND' : '— MINIMIZE';
    });
  });

  // ─── ROYAL ENVELOPE THEATRE PRELOADER CONTROLLER ───
  const preloader = document.getElementById('theatre-preloader');
  const preloaderEnvelope = document.getElementById('preloader-envelope');
  const preloaderEnvClosed = document.getElementById('preloader-env-closed');
  const preloaderEnvOpen = document.getElementById('preloader-env-open');
  const preloaderProgressFill = document.getElementById('preloader-progress-fill');
  const preloaderStatusText = document.getElementById('preloader-status-text');

  let preloaderProgress = 0;
  let preloaderReady = false;
  let preloaderDismissed = false;

  // Helper: real video buffer percentage (0-100)
  function getBufferedPercent() {
    if (!video || !video.buffered || !video.duration || video.duration === 0) return 0;
    try {
      let maxEnd = 0;
      for (let i = 0; i < video.buffered.length; i++) {
        maxEnd = Math.max(maxEnd, video.buffered.end(i));
      }
      return Math.min(100, (maxEnd / video.duration) * 100);
    } catch (_) { return 0; }
  }

  function updatePreloaderStatus(pct, message) {
    if (!preloaderProgressFill || !preloaderStatusText) return;
    preloaderProgress = Math.max(preloaderProgress, Math.min(100, Math.round(pct)));
    preloaderProgressFill.style.width = `${preloaderProgress}%`;
    if (message) {
      preloaderStatusText.textContent = `${message} · ${preloaderProgress}%`;
    }
  }

  // Progressive preloader: blends real video buffer data with simulated fill
  const loadInterval = setInterval(() => {
    if (preloaderDismissed) { clearInterval(loadInterval); return; }

    const docBonus = document.readyState === 'complete' ? 20 : 0;
    const vidBonus = state.videoReady ? 15 : 0;
    const bufBonus = getBufferedPercent() * 0.65;
    const realTarget = Math.min(99, docBonus + vidBonus + bufBonus);

    if (preloaderProgress < realTarget) {
      preloaderProgress = Math.min(99, preloaderProgress + Math.random() * 4 + 1.5);
    } else if (preloaderProgress < 25) {
      preloaderProgress += 0.6; // slow crawl so user sees it's alive
    }

    const label = preloaderProgress >= 98 ? 'READY TO ENTER' :
                  preloaderProgress >= 60 ? 'ALMOST READY' : 'BUFFERING STAGE';
    updatePreloaderStatus(preloaderProgress, label);

    const bufOk = state.videoReady && getBufferedPercent() >= 20;
    if (preloaderProgress >= 95 || bufOk) {
      setPreloaderReady();
      clearInterval(loadInterval);
    }
  }, 120);

  function setPreloaderReady() {
    if (preloaderReady) return;
    preloaderReady = true;
    updatePreloaderStatus(100, 'TAP TO ENTER THE THEATRE');
    // Gentle gold glow hint on the envelope
    if (preloaderEnvelope) {
      preloaderEnvelope.style.filter =
        'drop-shadow(0 20px 40px rgba(0,0,0,0.9)) drop-shadow(0 0 28px rgba(212,175,55,0.45))';
    }
  }

  function dismissPreloader() {
    if (preloaderDismissed) return;
    preloaderDismissed = true;

    // Phase 1: smooth envelope crossfade closed → opened (750ms)
    if (preloaderEnvelope) preloaderEnvelope.classList.add('opening');

    // Phase 2: after crossfade, slide-scale the whole preloader out
    setTimeout(() => {
      if (preloader) preloader.classList.add('dismissed');
      // Start theatrical soundtrack audio
      const initialAudioTime = calculateVideoTimeFromScroll(state.progress);
      startTheatreAudio(initialAudioTime);
      // Warm up GPU video decoders
      if (video) {
        video.currentTime = 0.05;
        video.play().then(() => video.pause()).catch(() => {});
      }
      if (ambientVideo) {
        ambientVideo.currentTime = 0.05;
        ambientVideo.play().then(() => ambientVideo.pause()).catch(() => {});
      }
    }, 750);
  }

  // ─── THEATRICAL SOUNDTRACK AUDIO CONTROLLER (SCROLL-SYNCHRONIZED) ───
  const theatreAudio = document.getElementById('theatre-audio');
  const audioBtn = document.getElementById('theatre-audio-btn') || document.getElementById('theatre-audio-pill');
  let isAudioPlaying = false;
  let audioSeekTimeout = null;

  // Ranges where pop-up interludes are active and video is paused (compact, agile pacing)
  const INTERLUDE_RANGES = [
    { start: 0.27, end: 0.345 }, // Interlude 1 (3 bite-sized steps)
    { start: 0.44, end: 0.54 },  // Interlude 2 (Cinema Filmstrip)
    { start: 0.64, end: 0.78 }   // Interlude 3 (15 Scenarios)
  ];

  function isInsideInterlude(p) {
    return INTERLUDE_RANGES.some((r) => p >= r.start && p <= r.end);
  }

  function updateAudioButtonState() {
    if (!audioBtn) return;
    if (isAudioPlaying) {
      audioBtn.classList.add('playing');
      audioBtn.setAttribute('title', 'Pause Theatrical Soundtrack');
      audioBtn.setAttribute('aria-label', 'Pause Theatrical Soundtrack');
    } else {
      audioBtn.classList.remove('playing');
      audioBtn.setAttribute('title', 'Play Theatrical Soundtrack');
      audioBtn.setAttribute('aria-label', 'Play Theatrical Soundtrack');
    }
  }

  function startTheatreAudio(initialTime) {
    if (!theatreAudio) return;
    theatreAudio.volume = 0.75;
    if (typeof initialTime === 'number' && !isNaN(initialTime)) {
      try {
        theatreAudio.currentTime = Math.max(0, Math.min(79.5, initialTime));
      } catch (_) {}
    }
    theatreAudio.play().then(() => {
      isAudioPlaying = true;
      updateAudioButtonState();
    }).catch((err) => {
      console.warn('Audio playback waiting for interaction:', err);
      isAudioPlaying = false;
      updateAudioButtonState();
    });
  }

  function syncAudioWithScroll(targetTime, p) {
    if (!theatreAudio) return;

    // If preloader is dismissed and audio was not yet triggered by browser autoplay policy
    if (!isAudioPlaying && preloaderDismissed) {
      startTheatreAudio(targetTime);
      return;
    }

    if (theatreAudio.paused) return;

    // CRITICAL FIX: If user is scrolling inside an interlude popup, DO NOT force seek/reset!
    // Let the soundtrack play naturally and continuously across the reading session without looping!
    if (isInsideInterlude(p)) {
      return;
    }

    const currentAudio = theatreAudio.currentTime;
    const diff = Math.abs(currentAudio - targetTime);

    // Outside interludes: only sync if user actively scrolled past a scene boundary (> 3.0s delta)
    if (diff > 3.0) {
      if (audioSeekTimeout) clearTimeout(audioSeekTimeout);
      audioSeekTimeout = setTimeout(() => {
        try {
          theatreAudio.currentTime = Math.max(0, Math.min(79.5, targetTime));
        } catch (_) {}
      }, 50);
    }
  }

  function toggleTheatreAudio() {
    if (!theatreAudio) return;
    if (theatreAudio.paused || !isAudioPlaying) {
      const currentTime = calculateVideoTimeFromScroll(state.progress);
      startTheatreAudio(currentTime);
    } else {
      theatreAudio.pause();
      isAudioPlaying = false;
      updateAudioButtonState();
    }
  }

  if (audioBtn) {
    audioBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleTheatreAudio();
    });
  }

  if (preloaderEnvelope) {
    preloaderEnvelope.addEventListener('click', dismissPreloader);
    preloaderEnvelope.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        dismissPreloader();
      }
    });
  }

  // Safety fallback: allow click anywhere on preloader once ready, or after 3.5s timeout
  setTimeout(() => {
    setPreloaderReady();
  }, 3500);

  // Video Seek Queue Management
  let isSeeking = false;
  let pendingSeekTime = null;

  function markVideoReady() {
    state.videoReady = true;
    if (video && video.duration && !isNaN(video.duration) && video.duration > 0) {
      state.videoDuration = video.duration;
    }
  }

  if (video) {
    video.addEventListener('loadedmetadata', markVideoReady);
    video.addEventListener('canplay', markVideoReady);
    video.addEventListener('canplaythrough', markVideoReady);

    video.addEventListener('seeked', () => {
      isSeeking = false;
      if (pendingSeekTime !== null) {
        const nextTime = pendingSeekTime;
        pendingSeekTime = null;
        applySeek(nextTime);
      }
    });

    video.addEventListener('seeking', () => {
      isSeeking = true;
    });

    // Prime video playback
    video.load();
    video.play().then(() => {
      video.pause();
      markVideoReady();
    }).catch(() => {});
  }

  if (ambientVideo) {
    ambientVideo.load();
    ambientVideo.play().then(() => ambientVideo.pause()).catch(() => {});
  }

  function applySeek(time) {
    if (!video || !state.videoReady || state.videoDuration <= 0) return;
    const clamped = Math.max(0, Math.min(state.videoDuration - 0.05, time));

    if (video.seeking || isSeeking) {
      pendingSeekTime = clamped;
      return;
    }

    isSeeking = true;
    try {
      if ('fastSeek' in video) {
        video.fastSeek(clamped);
      } else {
        video.currentTime = clamped;
      }
    } catch (_) {
      video.currentTime = clamped;
    }

    if (ambientVideo && !ambientVideo.seeking) {
      try {
        ambientVideo.currentTime = clamped;
      } catch (_) {}
    }
  }

  // ─── MASTER PROGRESSIVE TIMELINE (80s Total Duration) ───
  // Re-tuned for nimble, responsive scroll pacing (Interlude 1 reduced from 18% to 7.5%)
  function calculateVideoTimeFromScroll(p) {
    if (p <= 0.10) {
      // Scene 1: 0% -> 10% (Video 0s -> 10s)
      return (p / 0.10) * 10;
    } else if (p <= 0.20) {
      // Scene 2: 10% -> 20% (Video 10s -> 20s)
      return 10 + ((p - 0.10) / 0.10) * 10;
    } else if (p <= 0.27) {
      // Scene 3: 20% -> 27% (Video 20s -> 28s)
      return 20 + ((p - 0.20) / 0.07) * 8;
    } else if (p <= 0.345) {
      // INTERLUDE 1 (3 Bite-Sized Steps: 2.5% each): Video pauses smoothly at 28.0s
      return 28.0;
    } else if (p <= 0.44) {
      // Scene 4 (Our Leaders): 34.5% -> 44% (Video 28s -> 38s)
      return 28 + ((p - 0.345) / 0.095) * 10;
    } else if (p <= 0.54) {
      // INTERLUDE 2 (Cinema Filmstrip): Video pauses at 38.0s
      return 38.0;
    } else if (p <= 0.64) {
      // Scene 5 (The Podium & Crown): 54% -> 64% (Video 38s -> 58s)
      return 38 + ((p - 0.54) / 0.10) * 20;
    } else if (p <= 0.78) {
      // INTERLUDE 3 (Scenarios & Adjudicators): Video pauses at 58.0s
      return 58.0;
    } else if (p <= 0.89) {
      // Scene 7 (Golden Mask): 78% -> 89% (Video 58s -> 68s)
      return 58 + ((p - 0.78) / 0.11) * 10;
    } else {
      // Scene 8 (The Winner's Crown): 89% -> 100% (Video 68s -> 80s)
      return 68 + ((p - 0.89) / 0.11) * 12;
    }
  }

  function setActiveStep(key, title) {
    if (state.activeStep === key) return;
    state.activeStep = key;

    Object.keys(stepElements).forEach((k) => {
      const el = stepElements[k];
      if (el) {
        if (k === key) el.classList.add('active');
        else el.classList.remove('active');
      }
    });

    if (hudSceneBadge && title) {
      hudSceneBadge.textContent = title;
    }
  }

  // Mobile Touch & Viewport Stability Cache
  let cachedMaxScroll = 0;
  function updateMaxScroll() {
    const scrollH = document.documentElement.scrollHeight || document.body.scrollHeight;
    const viewH = window.innerHeight;
    cachedMaxScroll = Math.max(1, scrollH - viewH);
  }
  updateMaxScroll();

  let resizeDebounce = null;
  window.addEventListener('resize', () => {
    if (resizeDebounce) clearTimeout(resizeDebounce);
    resizeDebounce = setTimeout(() => {
      updateMaxScroll();
      onScroll();
    }, 150);
  });
  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      updateMaxScroll();
      onScroll();
    }, 200);
  });

  function onScroll() {
    if (state.isTeleporting) return;

    const scrollTop = Math.max(0, window.scrollY || document.documentElement.scrollTop || 0);
    if (cachedMaxScroll <= 0) updateMaxScroll();

    const p = Math.max(0, Math.min(1, scrollTop / cachedMaxScroll));
    state.progress = p;

    // Update HUD percentage
    const pct = Math.round(p * 100);
    if (hudPctText) {
      hudPctText.textContent = `${pct < 10 ? '0' : ''}${pct}%`;
    }

    // Determine Active Step & Title with agile interlude boundaries
    if (p < 0.10) {
      setActiveStep('step-scene-1', 'ACT I · THE SEALED SUMMONS');
    } else if (p < 0.20) {
      setActiveStep('step-scene-2', 'ACT II · CALL TO THE PODIUM');
    } else if (p < 0.27) {
      setActiveStep('step-scene-3', 'ACT III · RISE OF THE STAGE');
    } else if (p < 0.295) {
      setActiveStep('step-interlude-1a', 'INTERLUDE I · ABOUT THE AGENDA');
    } else if (p < 0.320) {
      setActiveStep('step-interlude-1b', 'INTERLUDE I · 5W + 1H ESSENTIALS');
    } else if (p < 0.345) {
      setActiveStep('step-interlude-1c', 'INTERLUDE I · PURPOSE & ADJUDICATION');
    } else if (p < 0.44) {
      setActiveStep('step-scene-4', 'ACT IV · ARCHITECTS & LEADERS');
    } else if (p < 0.54) {
      setActiveStep('step-interlude-2', 'INTERLUDE II · A TIME TO REMEMBER');
    } else if (p < 0.64) {
      setActiveStep('step-scene-5', 'ACT V · 3D CROWN PHILOSOPHY');
    } else if (p < 0.78) {
      setActiveStep('step-interlude-3', 'INTERLUDE III · 15 SCENARIOS & JUDGES');
    } else if (p < 0.89) {
      setActiveStep('step-scene-7', 'ACT VI · THE GOLDEN MASQUERADE MASK');
    } else {
      setActiveStep('step-scene-8', 'ACT VII · WHO WILL BE THE WINNER?');
    }

    // Synchronize Audio Soundtrack Timestamp with Scroll Scene (skips looping inside interludes)
    const targetAudioTime = calculateVideoTimeFromScroll(p);
    syncAudioWithScroll(targetAudioTime, p);

    // Seamless Infinite Loop (at 99.8% jump back to 0.2%)
    if (state.infiniteLoop && p >= 0.998) {
      state.isTeleporting = true;
      const targetScroll = cachedMaxScroll * 0.002;
      window.scrollTo({ top: targetScroll, behavior: 'instant' });
      state.progress = 0.002;
      state.currentVideoTime = 0.2;
      applySeek(state.currentVideoTime);
      if (theatreAudio) {
        theatreAudio.currentTime = 0.2;
      }
      setActiveStep('step-scene-1', 'ACT I · THE SEALED SUMMONS');
      setTimeout(() => {
        state.isTeleporting = false;
      }, 120);
    }
  }

  // Smooth render loop for scrubbing (anti-jitter threshold for mobile GPUs)
  function renderScrubLoop() {
    if (video && state.videoDuration > 0) {
      state.targetVideoTime = calculateVideoTimeFromScroll(state.progress);
      const diff = state.targetVideoTime - state.currentVideoTime;

      if (Math.abs(diff) > 0.015) {
        state.currentVideoTime += diff * 0.26;
        applySeek(state.currentVideoTime);
      }
    }
    requestAnimationFrame(renderScrubLoop);
  }
  requestAnimationFrame(renderScrubLoop);

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ─── HUD BUTTON TOGGLES ───
  if (btnToggleLoop) {
    btnToggleLoop.addEventListener('click', () => {
      state.infiniteLoop = !state.infiniteLoop;
      if (state.infiniteLoop) {
        btnToggleLoop.classList.add('active');
        if (loopStateText) loopStateText.textContent = 'ON';
      } else {
        btnToggleLoop.classList.remove('active');
        if (loopStateText) loopStateText.textContent = 'OFF';
      }
    });
  }

  if (btnToggleFit) {
    btnToggleFit.addEventListener('click', () => {
      const isCover = document.body.classList.toggle('fit-cover');
      if (isCover) {
        btnToggleFit.classList.remove('active');
        if (fitStateText) fitStateText.textContent = 'COVER (FULL)';
      } else {
        btnToggleFit.classList.add('active');
        if (fitStateText) fitStateText.textContent = '9:16 THEATRE';
      }
    });
  }

  const hudBrand = document.getElementById('hud-brand-btn');
  if (hudBrand) {
    hudBrand.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  const btnLoopTop = document.getElementById('btn-loop-top');
  if (btnLoopTop) {
    btnLoopTop.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ─── POPULATE INTERLUDE 2: SEAMLESS CINEMA FILMSTRIP (15 DORMITORIES) ───
  const cinemaFilmstrip = document.getElementById('cinema-filmstrip');
  const PERFORMANCE_PHOTOS = [
    { dorm: "Indonesia Two", title: "The Importance of Chance", file: "Indonesia 2.jpeg", chap: "01" },
    { dorm: "Yaman", title: "Aladdin & The Magic Lamp", file: "Yaman.jpeg", chap: "02" },
    { dorm: "Saudi Three (3rd Fl)", title: "Bandung, Sea of Fire", file: "Saudi 3 Third Floor.jpeg", chap: "03" },
    { dorm: "Palestine", title: "The Key to Success", file: "Palestine.jpeg", chap: "04" },
    { dorm: "Saudi Three (2nd Fl)", title: "Call Me Back Allah", file: "Saudi 3 Second Floor.jpeg", chap: "05" },
    { dorm: "Indonesia Four", title: "The Dragon Warrior", file: "Indonesia 4.jpeg", chap: "06" },
    { dorm: "Syiria (4th Fl)", title: "Magic Sandal of Abu Nawas", file: "Syiria 3 Fourt Floor.jpeg", chap: "07" },
    { dorm: "Saudi One (3rd Fl)", title: "When Sahara Speaks His Name", file: "Saudi 1 Third Floor.jpeg", chap: "08" },
    { dorm: "Solihin", title: "Coming Home", file: "Solihin.jpeg", chap: "09" },
    { dorm: "Syiria (2nd Fl)", title: "After Yesterday", file: "Syiria 1 Second Floor.jpeg", chap: "10" },
    { dorm: "Indonesia Three", title: "The Kyai", file: "Indonesia 3.jpeg", chap: "11" },
    { dorm: "Syiria (3rd Fl)", title: "Better Off Dead", file: "Syiria 2 Third Floor.jpeg", chap: "12" },
    { dorm: "New Kids Hostel (Aligarh)", title: "A Day Without Rules", file: "New Kids Hostel.jpeg", chap: "13" },
    { dorm: "Syanggit", title: "The Deceived Friend", file: "Syanggit.jpeg", chap: "14" },
    { dorm: "Saudi One (2nd Fl)", title: "The Last Letter", file: "Saudi 1 Second Floor.jpeg", chap: "15" }
  ];

  if (cinemaFilmstrip) {
    cinemaFilmstrip.innerHTML = '';
    PERFORMANCE_PHOTOS.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'cinema-still-card';
      card.innerHTML = `
        <img class="cinema-still-img" src="public/images/performances/${item.file}" alt="${item.title}" loading="lazy" />
        <div class="cinema-still-overlay">
          <span style="font-family:var(--font-mono); font-size:10px; color:var(--gold-champagne); letter-spacing:0.2em;">CHAPTER ${item.chap}</span>
          <h4 class="cinema-still-dorm">${item.dorm}</h4>
          <p class="cinema-still-title">“${item.title}”</p>
        </div>
      `;
      // Clicking any photo opens the full scenario
      if (typeof PLAYS_DATA !== 'undefined' && PLAYS_DATA[item.chap]) {
        card.addEventListener('click', () => openScriptReader(PLAYS_DATA[item.chap]));
      }
      cinemaFilmstrip.appendChild(card);
    });
  }

  // ─── POPULATE INTERLUDE 3: JUDGES & 15 SCENARIOS ───
  const judgesRow = document.getElementById('judges-row');
  const scenariosGrid = document.getElementById('scenarios-grid');

  if (judgesRow && typeof JUDGES_DATA !== 'undefined') {
    judgesRow.innerHTML = '';
    JUDGES_DATA.forEach((judge) => {
      const div = document.createElement('div');
      div.className = 'judge-clean-card';
      div.innerHTML = `
        <span class="judge-div-label">${judge.division}</span>
        <h4 class="judge-clean-name">${judge.name}</h4>
        <p class="judge-clean-desc">${judge.description}</p>
      `;
      judgesRow.appendChild(div);
    });
  }

  if (scenariosGrid && typeof PLAYS_DATA !== 'undefined') {
    scenariosGrid.innerHTML = '';
    Object.values(PLAYS_DATA).forEach((play) => {
      const card = document.createElement('div');
      card.className = 'scenario-card-item';
      card.innerHTML = `
        <img src="${play.poster}" alt="${play.title}" class="scenario-thumb" onerror="this.src='public/images/scene-clean/ARE YOU READY.png';" />
        <div class="scenario-meta">
          <span class="scenario-chap">CHAPTER ${play.chapter} · ${play.category.toUpperCase()}</span>
          <h4 class="scenario-name">${play.title}</h4>
          <span class="scenario-dorm">${play.dormitory}</span>
        </div>
      `;
      card.addEventListener('click', () => openScriptReader(play));
      scenariosGrid.appendChild(card);
    });
  }

  // ─── FULL SCRIPT SCENARIO READER DRAWER ───
  function openScriptReader(play) {
    if (!scriptDrawer) return;
    document.getElementById('drawer-chap').textContent = `CHAPTER ${play.chapter} · ${play.dormitory.toUpperCase()}`;
    document.getElementById('drawer-play-title').textContent = play.title;
    document.getElementById('drawer-poster').src = play.poster;
    document.getElementById('drawer-synopsis').textContent = play.synopsis;
    document.getElementById('drawer-moral').textContent = `“${play.moral}”`;
    document.getElementById('drawer-quote').textContent = play.quote || '';

    const charWrap = document.getElementById('drawer-characters');
    if (charWrap) {
      charWrap.innerHTML = '';
      play.characters.forEach((c) => {
        const span = document.createElement('span');
        span.style.cssText = 'display:inline-block; padding:4px 10px; background:rgba(56,5,14,0.6); border:1px solid rgba(212,175,55,0.22); border-radius:2px; font-size:12px; margin:3px; color:#F5E6BE;';
        span.textContent = c;
        charWrap.appendChild(span);
      });
    }

    scriptDrawer.classList.add('open');
  }

  function closeScriptReader() {
    if (scriptDrawer) scriptDrawer.classList.remove('open');
  }

  if (btnCloseDrawer) btnCloseDrawer.addEventListener('click', closeScriptReader);
  if (scriptDrawer) {
    scriptDrawer.addEventListener('click', (e) => {
      if (e.target === scriptDrawer) closeScriptReader();
    });
  }
});
