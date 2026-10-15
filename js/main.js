/* ==========================================================================
   MAIN.JS — English Drama Contest 1448 / 2026
   Awwwards-Winning Infinite Video Scrollytelling Engine
   Pondok Modern Darussalam Gontor (PMDG)
   ========================================================================== */

'use strict';

document.addEventListener('DOMContentLoaded', () => {

  // ─── STATE MANAGEMENT ───
  const state = {
    progress: 0,
    targetVideoTime: 0,
    currentVideoTime: 0,
    activeScene: 1,
    infiniteLoop: true,
    isAudioPlaying: false,
    videoDuration: 70, // 7 clips @ 10s = 70s
    videoReady: false,
    isTeleporting: false,
    activeCategory: 'all',
    searchQuery: ''
  };

  // DOM Elements
  const preloader = document.getElementById('preloader');
  const preloaderBar = document.getElementById('preloader-bar');
  const preloaderPct = document.getElementById('preloader-percent');
  const preloaderStatus = document.getElementById('preloader-status-text');
  const btnEnter = document.getElementById('btn-enter');
  
  const video = document.getElementById('scrolly-video');
  const ambientVideo = document.getElementById('scrolly-video-ambient');
  const fallbackImages = Array.from({ length: 8 }, (_, i) => document.getElementById(`fb-img-${i + 1}`));
  const scrollTrack = document.getElementById('master-scroll-track');
  
  const hudPctText = document.getElementById('hud-pct-text');
  const activeSceneBadgeText = document.getElementById('active-scene-title');
  const btnToggleLoop = document.getElementById('btn-toggle-loop');
  const loopStateText = document.getElementById('loop-state-text');
  const btnToggleFit = document.getElementById('btn-toggle-fit');
  const fitStateText = document.getElementById('fit-state-text');
  const btnToggleAudio = document.getElementById('btn-toggle-audio');
  const iconAudioOn = document.getElementById('icon-audio-on');
  const iconAudioOff = document.getElementById('icon-audio-off');
  
  const sceneDots = Array.from(document.querySelectorAll('.scene-dot'));
  const sceneOverlays = Array.from(document.querySelectorAll('.scene-overlay'));

  // Drawers & Modals
  const drawerSmartbook = document.getElementById('drawer-smartbook');
  const modalJudges = document.getElementById('modal-judges');
  const modalCommittee = document.getElementById('modal-committee');
  const modalReader = document.getElementById('modal-reader');

  const playbillsGrid = document.getElementById('playbills-grid');
  const playbillSearchInput = document.getElementById('playbill-search-input');
  const filterPills = Array.from(document.querySelectorAll('.filter-pill'));
  
  const judgesList = document.getElementById('judges-list');
  const rundownTable = document.getElementById('rundown-table');

  const SCENE_TITLES = [
    'ACT I · THE SEALED SUMMONS',
    'ACT II · THE FINAL COUNTDOWN',
    'ACT III · REHEARSAL & MEMORIES',
    'ACT IV · ARCHITECTS & LEADERS',
    'ACT V · RISE OF THE STAGE',
    'ACT VI · LANGUAGE IS OUR CROWN',
    'ACT VII · LET THE LIGHT SHINE',
    'ACT VIII · WHO WILL BE THE WINNER?'
  ];

  // ─── 1. PRE-LOADER & ASSET BUFFERING ───
  function initPreloader() {
    let loadProgress = 0;
    let hasLoaded = false;

    function markVideoReady() {
      state.videoReady = true;
      if (video && video.duration && !isNaN(video.duration) && video.duration > 0) {
        state.videoDuration = video.duration;
      }
      document.body.classList.remove('video-fallback');
      document.body.classList.add('video-active');
      const fbStack = document.getElementById('image-fallback-stack');
      if (fbStack) fbStack.style.display = 'none';
    }

    if (video) {
      video.addEventListener('loadedmetadata', markVideoReady);
      video.addEventListener('canplay', markVideoReady);
      video.addEventListener('canplaythrough', markVideoReady);
      video.addEventListener('error', () => {
        console.warn('Scrolly video failed, enabling fallback image stack');
        document.body.classList.add('video-fallback');
        const fbStack = document.getElementById('image-fallback-stack');
        if (fbStack) fbStack.style.display = 'block';
      });

      // Warm up video decoders
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

    const interval = setInterval(() => {
      loadProgress += Math.random() * 9 + 4;
      if (loadProgress >= 100) {
        loadProgress = 100;
        clearInterval(interval);
        hasLoaded = true;
        if (preloaderBar) preloaderBar.style.width = '100%';
        if (preloaderPct) preloaderPct.textContent = '100%';
        if (preloaderStatus) preloaderStatus.textContent = 'THE CURTAINS ARE READY';
        if (btnEnter) btnEnter.classList.remove('hidden');
      } else {
        if (preloaderBar) preloaderBar.style.width = `${Math.round(loadProgress)}%`;
        if (preloaderPct) preloaderPct.textContent = `${Math.round(loadProgress)}%`;
      }
    }, 40);

    function dismissPreloader() {
      if (!preloader || preloader.classList.contains('fade-out')) return;
      preloader.classList.add('fade-out');
      document.body.classList.remove('is-loading');

      // Prime video playback on first interaction
      if (video) {
        video.play().then(() => {
          video.pause();
          markVideoReady();
        }).catch(() => {});
      }
      if (ambientVideo) {
        ambientVideo.play().then(() => ambientVideo.pause()).catch(() => {});
      }
    }

    if (btnEnter) {
      btnEnter.addEventListener('click', dismissPreloader);
    }

    // Also auto-dismiss if user scrolls or touches screen
    window.addEventListener('wheel', () => {
      if (loadProgress >= 30) dismissPreloader();
    }, { passive: true, once: true });
    window.addEventListener('touchmove', () => {
      if (loadProgress >= 30) dismissPreloader();
    }, { passive: true, once: true });
    window.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowDown') {
        dismissPreloader();
      }
    });
  }

  // ─── 2. DESKTOP THEATRICAL CURSOR ───
  function initDesktopCursor() {
    const ring = document.getElementById('cursor-ring');
    const dot = document.getElementById('cursor-dot');
    if (!ring || !dot) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;

    window.addEventListener('mousemove', (e) => {
      mx = e.clientX;
      my = e.clientY;
    });

    function renderCursor() {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.left = `${rx}px`;
      ring.style.top = `${ry}px`;
      dot.style.left = `${mx}px`;
      dot.style.top = `${my}px`;
      requestAnimationFrame(renderCursor);
    }
    requestAnimationFrame(renderCursor);

    document.querySelectorAll('button, a, input, .playbill-card, .philosophy-item').forEach((el) => {
      el.addEventListener('mouseenter', () => {
        ring.style.width = '48px';
        ring.style.height = '48px';
        ring.style.borderColor = '#F3E5AB';
        ring.style.backgroundColor = 'rgba(212, 175, 55, 0.1)';
      });
      el.addEventListener('mouseleave', () => {
        ring.style.width = '32px';
        ring.style.height = '32px';
        ring.style.borderColor = '#D4AF37';
        ring.style.backgroundColor = 'transparent';
      });
    });
  }

  // ─── 3. VIDEO SCRUBBING & SCENE SCROLLYTELLING ───
  function initScrollytelling() {
    let isSeeking = false;
    let pendingSeekTime = null;

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
      } catch (err) {
        video.currentTime = clamped;
      }
      
      // Keep ambient backdrop video roughly in sync
      if (ambientVideo && !ambientVideo.seeking) {
        try {
          ambientVideo.currentTime = clamped;
        } catch (_) {}
      }
    }

    if (video) {
      video.addEventListener('seeked', () => {
        isSeeking = false;
        if (pendingSeekTime !== null) {
          const next = pendingSeekTime;
          pendingSeekTime = null;
          applySeek(next);
        }
      });

      video.addEventListener('seeking', () => {
        isSeeking = true;
      });
    }

    // Sync current video position via requestAnimationFrame + smooth interpolation
    function renderVideoScrub() {
      if (video && state.videoDuration > 0) {
        state.targetVideoTime = state.progress * state.videoDuration;
        const diff = state.targetVideoTime - state.currentVideoTime;
        
        if (Math.abs(diff) > 0.002) {
          state.currentVideoTime += diff * 0.22;
          applySeek(state.currentVideoTime);
        }
      }
      requestAnimationFrame(renderVideoScrub);
    }
    requestAnimationFrame(renderVideoScrub);

    // Window scroll handler
    function onScroll() {
      if (state.isTeleporting) return;

      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const maxScroll = (document.documentElement.scrollHeight || document.body.scrollHeight) - window.innerHeight;
      
      if (maxScroll <= 0) return;

      const p = Math.max(0, Math.min(1, scrollTop / maxScroll));
      state.progress = p;

      // Update HUD percentage
      const pctDisplay = Math.round(p * 100);
      if (hudPctText) {
        hudPctText.textContent = `${pctDisplay < 10 ? '0' : ''}${pctDisplay}%`;
      }

      // Determine active scene based on ranges
      let sceneIndex = 1;
      if (p >= 0.88) sceneIndex = 8;
      else if (p >= 0.76) sceneIndex = 7;
      else if (p >= 0.63) sceneIndex = 6;
      else if (p >= 0.50) sceneIndex = 5;
      else if (p >= 0.38) sceneIndex = 4;
      else if (p >= 0.25) sceneIndex = 3;
      else if (p >= 0.12) sceneIndex = 2;
      else sceneIndex = 1;

      if (sceneIndex !== state.activeScene) {
        setActiveScene(sceneIndex);
      }

      // ─── INFINITE LOOP TELEPORTATION ───
      // When user reaches the very bottom (0.995), seamlessly jump back to 0.005
      if (state.infiniteLoop && p >= 0.995) {
        state.isTeleporting = true;
        const targetScroll = maxScroll * 0.005;
        window.scrollTo({ top: targetScroll, behavior: 'instant' });
        state.progress = 0.005;
        state.currentVideoTime = 0.005 * state.videoDuration;
        applySeek(state.currentVideoTime);
        setActiveScene(1);
        setTimeout(() => {
          state.isTeleporting = false;
        }, 120);
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Infinite Loop Toggle Button
    if (btnToggleLoop) {
      btnToggleLoop.addEventListener('click', () => {
        state.infiniteLoop = !state.infiniteLoop;
        if (state.infiniteLoop) {
          btnToggleLoop.classList.add('active');
          loopStateText.textContent = 'ON';
        } else {
          btnToggleLoop.classList.remove('active');
          loopStateText.textContent = 'OFF';
        }
      });
    }

    // Video Aspect Ratio Fit Toggle Button (9:16 Theatre Fit vs Fullscreen Cover)
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

    // Vertical Nav Dots Click
    sceneDots.forEach((dot) => {
      dot.addEventListener('click', () => {
        const targetPct = parseFloat(dot.getAttribute('data-pct'));
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        window.scrollTo({
          top: maxScroll * targetPct,
          behavior: 'smooth'
        });
      });
    });

    // Top Brand Button jumps to start
    const brandBtn = document.getElementById('hud-brand-btn');
    if (brandBtn) {
      brandBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }

  function setActiveScene(index) {
    state.activeScene = index;

    // Update overlay active class
    sceneOverlays.forEach((overlay) => {
      const sceneNum = parseInt(overlay.getAttribute('data-scene'), 10);
      if (sceneNum === index) {
        overlay.classList.add('active');
      } else {
        overlay.classList.remove('active');
      }
    });

    // Update HUD scene badge
    activeSceneBadgeText.textContent = SCENE_TITLES[index - 1] || `ACT ${index}`;

    // Update vertical dots
    sceneDots.forEach((dot) => {
      const sceneNum = parseInt(dot.getAttribute('data-scene'), 10);
      if (sceneNum === index) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });

    // Update fallback image stack
    fallbackImages.forEach((img, i) => {
      if (img) {
        if (i + 1 === index) {
          img.classList.add('active');
        } else {
          img.classList.remove('active');
        }
      }
    });
  }

  // ─── 4. LIVE COUNTDOWN CLOCK (SCENE 2) ───
  function initLiveCountdown() {
    const cdDays = document.getElementById('cd-days');
    const cdHours = document.getElementById('cd-hours');
    const cdMins = document.getElementById('cd-mins');
    const cdSecs = document.getElementById('cd-secs');

    // Friday, October 16, 2026 08:00 WIB (UTC+7)
    const targetDate = new Date('2026-10-16T08:00:00+07:00').getTime();

    function updateClock() {
      const now = new Date().getTime();
      let diff = targetDate - now;

      if (diff <= 0) {
        // Event day is active!
        cdDays.textContent = '00';
        cdHours.textContent = '00';
        cdMins.textContent = '00';
        cdSecs.textContent = '00';
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      diff -= days * (1000 * 60 * 60 * 24);
      const hours = Math.floor(diff / (1000 * 60 * 60));
      diff -= hours * (1000 * 60 * 60);
      const mins = Math.floor(diff / (1000 * 60));
      diff -= mins * (1000 * 60);
      const secs = Math.floor(diff / 1000);

      cdDays.textContent = days < 10 ? `0${days}` : days;
      cdHours.textContent = hours < 10 ? `0${hours}` : hours;
      cdMins.textContent = mins < 10 ? `0${mins}` : mins;
      cdSecs.textContent = secs < 10 ? `0${secs}` : secs;
    }

    updateClock();
    setInterval(updateClock, 1000);
  }

  // ─── 5. PROCEDURAL THEATRICAL AMBIENT AUDIO (WEB AUDIO API) ───
  let audioCtx = null;
  let droneOsc1 = null;
  let droneOsc2 = null;
  let gainNode = null;

  function toggleAudio() {
    if (!audioCtx) {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContext();

        // Master Gain
        gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(0.001, audioCtx.currentTime);
        gainNode.connect(audioCtx.destination);

        // Low warm theater drone (F minor chord: F2 ~87.31Hz & C3 ~130.81Hz)
        droneOsc1 = audioCtx.createOscillator();
        droneOsc1.type = 'sine';
        droneOsc1.frequency.setValueAtTime(87.31, audioCtx.currentTime);

        droneOsc2 = audioCtx.createOscillator();
        droneOsc2.type = 'triangle';
        droneOsc2.frequency.setValueAtTime(130.81, audioCtx.currentTime);

        // Filter for warm antique acoustic tone
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, audioCtx.currentTime);

        droneOsc1.connect(filter);
        droneOsc2.connect(filter);
        filter.connect(gainNode);

        droneOsc1.start();
        droneOsc2.start();
      } catch (e) {
        console.warn('Web Audio API not supported', e);
      }
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    state.isAudioPlaying = !state.isAudioPlaying;

    if (state.isAudioPlaying) {
      btnToggleAudio.classList.add('active');
      iconAudioOn.classList.remove('hidden');
      iconAudioOff.classList.add('hidden');
      if (gainNode) {
        gainNode.gain.setTargetAtTime(0.08, audioCtx.currentTime, 0.5);
      }
    } else {
      btnToggleAudio.classList.remove('active');
      iconAudioOn.classList.add('hidden');
      iconAudioOff.classList.remove('hidden');
      if (gainNode) {
        gainNode.gain.setTargetAtTime(0.0001, audioCtx.currentTime, 0.3);
      }
    }
  }

  btnToggleAudio.addEventListener('click', toggleAudio);

  // ─── 6. MODALS & DRAWERS INITIALIZATION ───
  function initModalsAndDrawers() {
    renderPlaybillsGrid();
    renderJudgesModal();
    renderRundownTable();

    // Trigger buttons
    document.getElementById('btn-open-smartbook').addEventListener('click', () => openDrawer(drawerSmartbook));
    document.getElementById('btn-trigger-smartbook-s6').addEventListener('click', () => openDrawer(drawerSmartbook));
    document.getElementById('btn-open-smartbook-s8').addEventListener('click', () => openDrawer(drawerSmartbook));

    document.getElementById('btn-open-judges').addEventListener('click', () => openModal(modalJudges));
    document.getElementById('btn-trigger-judges-s7').addEventListener('click', () => openModal(modalJudges));

    document.getElementById('btn-open-committee').addEventListener('click', () => openModal(modalCommittee));
    document.getElementById('btn-trigger-committee').addEventListener('click', () => openModal(modalCommittee));

    // Close triggers
    document.querySelectorAll('[data-close]').forEach((btn) => {
      btn.addEventListener('click', () => {
        closeAllDrawersAndModals();
      });
    });

    // Escape key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeAllDrawersAndModals();
      }
    });

    // Search input in playbills
    playbillSearchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.toLowerCase().trim();
      renderPlaybillsGrid();
    });

    // Filter pills in playbills
    filterPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        filterPills.forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        state.activeCategory = pill.getAttribute('data-filter');
        renderPlaybillsGrid();
      });
    });
  }

  function openDrawer(drawer) {
    closeAllDrawersAndModals();
    drawer.classList.add('open');
  }

  function openModal(modal) {
    closeAllDrawersAndModals();
    modal.classList.add('open');
  }

  function closeAllDrawersAndModals() {
    [drawerSmartbook, modalJudges, modalCommittee, modalReader].forEach((el) => {
      if (el) el.classList.remove('open');
    });
  }

  // ─── 7. RENDER PLAYBILLS GRID ───
  function renderPlaybillsGrid() {
    if (!playbillsGrid || typeof PLAYS_DATA === 'undefined') return;

    playbillsGrid.innerHTML = '';
    const plays = Object.values(PLAYS_DATA);

    const filtered = plays.filter((play) => {
      // Category match
      if (state.activeCategory !== 'all') {
        if (state.activeCategory === 'heroic' && play.category !== 'heroic') return false;
        else if (state.activeCategory === 'spiritual' && play.category !== 'spiritual') return false;
        else if (state.activeCategory === 'drama' && play.category !== 'drama') return false;
        else if (state.activeCategory === 'adventure' && play.category !== 'adventure') return false;
      }

      // Search match
      if (state.searchQuery) {
        const q = state.searchQuery;
        const matchesTitle = play.title.toLowerCase().includes(q);
        const matchesDorm = play.dormitory.toLowerCase().includes(q);
        const matchesMoral = play.moral.toLowerCase().includes(q);
        const matchesCast = play.characters.some((c) => c.toLowerCase().includes(q));
        if (!matchesTitle && !matchesDorm && !matchesMoral && !matchesCast) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      playbillsGrid.innerHTML = `
        <div style="padding: 40px 20px; text-align: center; color: var(--text-muted); font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.15em;">
          NO DRAMA FOUND MATCHING YOUR SELECTION
        </div>
      `;
      return;
    }

    filtered.forEach((play) => {
      const card = document.createElement('div');
      card.className = 'playbill-card';
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `Read ${play.title} by ${play.dormitory}`);

      card.innerHTML = `
        <div class="playbill-thumb-frame">
          <img src="${play.poster}" alt="${play.title} Poster" loading="lazy" />
        </div>
        <div class="playbill-meta">
          <div>
            <span class="playbill-dorm">#${play.chapter} · ${play.dormitory}</span>
            <h4 class="playbill-title">${play.title}</h4>
            <p class="playbill-cast-preview">Cast: ${play.characters.join(', ')}</p>
          </div>
          <span class="playbill-action-link">
            <span>READ FULL SCRIPT</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </span>
        </div>
      `;

      card.addEventListener('click', () => {
        openScriptReader(play);
      });

      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openScriptReader(play);
        }
      });

      playbillsGrid.appendChild(card);
    });
  }

  // ─── 8. SCRIPT READER MODAL POPULATION ───
  function openScriptReader(play) {
    document.getElementById('reader-chapter-badge').textContent = `CHAPTER ${play.chapter} · ${play.dormitory.toUpperCase()}`;
    document.getElementById('reader-title').textContent = play.title;
    document.getElementById('reader-poster-img').src = play.poster;
    document.getElementById('reader-poster-img').alt = `${play.title} Poster`;
    document.getElementById('reader-genre-badge').textContent = play.genre;

    // Characters pills
    const charBox = document.getElementById('reader-characters-list');
    charBox.innerHTML = '';
    play.characters.forEach((name) => {
      const span = document.createElement('span');
      span.className = 'char-tag';
      span.textContent = name;
      charBox.appendChild(span);
    });

    document.getElementById('reader-synopsis-text').textContent = play.synopsis;
    document.getElementById('reader-moral-quote').textContent = `“${play.moral}”`;
    document.getElementById('reader-quote-text').textContent = play.quote || '';

    openModal(modalReader);
  }

  // ─── 9. JUDGES & RUNDOWN POPULATION ───
  function renderJudgesModal() {
    if (!judgesList || typeof JUDGES_DATA === 'undefined') return;
    judgesList.innerHTML = '';

    JUDGES_DATA.forEach((judge) => {
      const row = document.createElement('div');
      row.className = 'judge-row-card';
      row.innerHTML = `
        <div class="judge-top-line">
          <strong class="judge-name">${judge.name}</strong>
          <span class="judge-role">${judge.role}</span>
        </div>
        <p class="judge-desc">${judge.description}</p>
      `;
      judgesList.appendChild(row);
    });
  }

  function renderRundownTable() {
    if (!rundownTable || typeof PLAYS_DATA === 'undefined') return;
    rundownTable.innerHTML = '';

    Object.values(PLAYS_DATA).forEach((play) => {
      const row = document.createElement('div');
      row.className = 'rundown-row';
      row.innerHTML = `
        <span class="rd-num">${play.chapter}</span>
        <span class="rd-dorm">${play.dormitory}</span>
        <span class="rd-title">“${play.title}”</span>
      `;
      rundownTable.appendChild(row);
    });
  }

  // Start initialization immediately
  initScrollytelling();
  initLiveCountdown();
  initModalsAndDrawers();
  initDesktopCursor();
  initPreloader();
});
