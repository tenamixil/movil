// ============================================================
// player.js - Reproductor universal con diseño moderno
// Conserva TODAS las funciones del reproductor original
// Estilo: fondo dinámico + overlay, Material Symbols, Tailwind
// ============================================================
(function() {
  if (window.playerAPI && window.playerAPI._installed) return;

  // ---------- 1. Cargar recursos (Tailwind, fuentes, iconos) ----------
  function loadResources() {
    if (!document.querySelector('script[src*="tailwindcss"]')) {
      const tailwindScript = document.createElement('script');
      tailwindScript.src = 'https://cdn.tailwindcss.com?plugins=forms,container-queries';
      document.head.appendChild(tailwindScript);
    }
    if (!document.querySelector('link[href*="Material+Symbols"]')) {
      const materialLink = document.createElement('link');
      materialLink.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap';
      materialLink.rel = 'stylesheet';
      document.head.appendChild(materialLink);
    }
    if (!document.querySelector('link[href*="Spline+Sans"]')) {
      const fontLink = document.createElement('link');
      fontLink.href = 'https://fonts.googleapis.com/css2?family=Spline+Sans:wght@300;400;500;600;700&display=swap';
      fontLink.rel = 'stylesheet';
      document.head.appendChild(fontLink);
    }
    const style = document.createElement('style');
    style.textContent = `
      body { font-family: 'Spline Sans', sans-serif; margin: 0; background: transparent; }
      .font-fill-1 { font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
      video::-webkit-media-controls { display: none !important; }
      .glass-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        pointer-events: none;
        z-index: 1;
      }
      .player-content { position: relative; z-index: 2; }
      .no-scrollbar::-webkit-scrollbar { display: none; }
      .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    `;
    document.head.appendChild(style);
  }

  // ---------- 2. Inyectar HTML del reproductor (estructura con overlay y colores dinámicos) ----------
  function injectHTML() {
    if (document.getElementById('miniPlayer')) return;

    const playerHTML = `
      <audio id="globalAudio" preload="metadata" style="display: none;"></audio>
      <div style="display: none;" id="videoContainer"></div>

      <!-- MINI REPRODUCTOR (siempre visible) -->
      <div id="miniPlayer" class="fixed bottom-0 left-0 right-0 z-40 shadow-2xl" style="padding-bottom: env(safe-area-inset-bottom, 8px);">
        <div id="miniBgColor" class="absolute inset-0 transition-colors duration-300" style="background-color: #0a141c;"></div>
        <div class="absolute inset-0 glass-overlay"></div>
        <div class="relative player-content flex items-center gap-3 px-3 py-2 text-white">
          <div class="w-10 h-10 rounded-md overflow-hidden flex-shrink-0 bg-gray-800">
            <img id="miniCover" src="https://via.placeholder.com/80x80/1e3a4a/ffffff?text=Cover" class="w-full h-full object-cover">
          </div>
          <div class="flex-1 min-w-0">
            <div id="miniTitle" class="text-sm font-semibold truncate">Cargando...</div>
            <div id="miniArtist" class="text-xs text-gray-300 truncate"></div>
            <div class="h-1 bg-gray-700 rounded-full mt-1 w-full overflow-hidden">
              <div id="miniProgress" class="h-full" style="width: 0%; background-color: #ff0000;"></div>
            </div>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <button id="miniPrev" class="p-2 text-gray-200 hover:text-white"><span class="material-symbols-outlined text-2xl">skip_previous</span></button>
            <button id="miniPlayPause" class="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition"><span id="miniPlayIcon" class="material-symbols-outlined text-3xl font-fill-1">play_arrow</span></button>
            <button id="miniNext" class="p-2 text-gray-200 hover:text-white"><span class="material-symbols-outlined text-2xl">skip_next</span></button>
            <button id="expandBtn" class="p-2 text-gray-200 hover:text-white ml-1"><span class="material-symbols-outlined text-2xl">expand_less</span></button>
          </div>
        </div>
      </div>

      <!-- REPRODUCTOR EXPANDIDO (pantalla completa) -->
      <div id="expandedPlayer" class="fixed inset-0 z-50 flex flex-col overflow-hidden hidden" style="padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom);">
        <div id="expandedBgColor" class="absolute inset-0 transition-colors duration-300" style="background-color: #0a141c;"></div>
        <div class="absolute inset-0 glass-overlay"></div>
        <div class="relative player-content flex flex-col h-full text-slate-100">
          <!-- Cabecera -->
          <header class="flex items-center justify-between px-5 pt-4 pb-2 flex-shrink-0">
            <button id="collapseBtn" class="p-2 -ml-2 text-slate-200 hover:text-white"><span class="material-symbols-outlined text-3xl">expand_more</span></button>
            <div class="bg-black/40 backdrop-blur-md p-1 rounded-full flex items-center border border-white/20">
              <button id="videoModeBtn" class="px-5 py-1.5 rounded-full text-xs font-semibold text-white shadow-sm">Video</button>
              <button id="audioModeBtn" class="px-5 py-1.5 rounded-full text-xs font-semibold text-slate-300">Audio</button>
            </div>
            <button id="moreMenuBtn" class="p-2 -mr-2 text-slate-200 hover:text-white"><span class="material-symbols-outlined">more_horiz</span></button>
          </header>

          <!-- Contenido principal (vista y panel) -->
          <div class="flex-1 relative overflow-hidden">
            <!-- Vista principal (reproductor expandido) -->
            <div id="mainView" class="absolute inset-0 flex flex-col px-5 pt-2 pb-4 overflow-y-auto transition-opacity duration-200 no-scrollbar">
              <div class="flex-1 flex flex-col justify-center items-center">
                <div class="w-full aspect-square max-w-[400px] rounded-2xl overflow-hidden shadow-2xl border border-white/10 relative" id="mediaContainer">
                  <img id="expandedCover" src="https://via.placeholder.com/400x400/1e3a4a/ffffff?text=Cover" class="w-full h-full object-cover absolute inset-0 transition-opacity duration-300">
                  <video id="expandedVideo" class="w-full h-full object-cover absolute inset-0 transition-opacity duration-300 opacity-0" playsinline muted></video>
                </div>
              </div>
              <div class="mt-4 mb-4">
                <div class="flex items-center justify-between gap-4">
                  <div class="min-w-0">
                    <h1 id="expandedTitle" class="text-2xl font-bold truncate text-slate-50">Título</h1>
                    <p id="expandedArtist" class="text-lg text-slate-300 font-medium truncate">Artista</p>
                  </div>
                  <button id="likeBtn" class="shrink-0 text-slate-300 hover:text-red-500"><span class="material-symbols-outlined text-3xl">favorite</span></button>
                </div>
              </div>
              <div class="mb-4">
                <div class="relative h-1.5 w-full bg-slate-700/50 rounded-full overflow-hidden mb-2">
                  <div id="expandedProgress" class="absolute top-0 left-0 h-full" style="width: 0%; background-color: #ff0000;"></div>
                </div>
                <div class="flex justify-between text-[11px] font-mono text-slate-400 tracking-wider">
                  <span id="currentTime">0:00</span>
                  <span id="durationTime">0:00</span>
                </div>
              </div>
              <div class="flex items-center justify-between mb-6">
                <button id="speedBtn" class="text-slate-300 hover:text-white text-sm font-bold border border-slate-500 rounded px-2 py-1">1x</button>
                <div class="flex items-center gap-5">
                  <button id="replay5Btn" class="text-slate-200 hover:text-white"><span class="material-symbols-outlined text-3xl">replay_5</span></button>
                  <button id="prevBtn" class="text-slate-100 hover:text-primary"><span class="material-symbols-outlined text-4xl font-fill-1">skip_previous</span></button>
                  <button id="playPauseBtn" class="size-16 rounded-full bg-white text-background-dark flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl"><span id="playPauseIcon" class="material-symbols-outlined text-[42px] font-fill-1">play_arrow</span></button>
                  <button id="nextBtn" class="text-slate-100 hover:text-primary"><span class="material-symbols-outlined text-4xl font-fill-1">skip_next</span></button>
                  <button id="forward5Btn" class="text-slate-200 hover:text-white"><span class="material-symbols-outlined text-3xl">forward_5</span></button>
                </div>
                <button id="repeatBtn" class="text-slate-300 hover:text-primary"><span class="material-symbols-outlined text-2xl">repeat</span></button>
              </div>
              <!-- Botones de navegación inferior (abren panel) -->
              <div class="flex items-center justify-between px-2 pb-2">
                <button class="bottom-nav-btn flex flex-col items-center gap-1 text-slate-300 hover:text-white" data-panel="timer"><span class="material-symbols-outlined">timer</span></button>
                <button class="bottom-nav-btn flex flex-col items-center gap-1 text-slate-300 hover:text-white" data-panel="transcript"><span class="material-symbols-outlined">closed_caption</span></button>
                <button class="bottom-nav-btn flex flex-col items-center gap-1 text-slate-300 hover:text-white" data-panel="queue"><span class="material-symbols-outlined">queue_music</span></button>
                <button class="bottom-nav-btn flex flex-col items-center gap-1 text-slate-300 hover:text-white" data-panel="share"><span class="material-symbols-outlined">share</span></button>
              </div>
              <div class="flex justify-center mt-2 mb-1"><div class="w-32 h-1 bg-white/20 rounded-full"></div></div>
            </div>

            <!-- Vista de panel deslizante (desde la derecha) -->
            <div id="panelView" class="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col p-5 transition-transform duration-300 translate-x-full">
              <div class="flex items-center justify-between mb-5">
                <button id="closePanelBtn" class="p-2 -ml-2 text-slate-300"><span class="material-symbols-outlined">arrow_back</span></button>
                <h2 id="panelTitle" class="text-lg font-semibold"></h2>
                <div class="w-8"></div>
              </div>
              <div id="panelContent" class="flex-1 overflow-y-auto no-scrollbar"></div>
            </div>
          </div>
        </div>
      </div>
      <div style="height: 80px;"></div>
    `;

    const wrapper = document.createElement('div');
    wrapper.id = 'player-root';
    wrapper.innerHTML = playerHTML;
    document.body.appendChild(wrapper);
  }

  // ---------- 3. Lógica completa del reproductor (fusionada con la original) ----------
  // Variables globales del estado (similares a las del original)
  let currentMedia = null;
  let playlist = JSON.parse(localStorage.getItem('playlist')) || [];
  let likes = JSON.parse(localStorage.getItem('likes')) || [];
  let historyList = JSON.parse(localStorage.getItem('history')) || [];
  let currentIndex = -1;
  let nextList = [];
  let recomendados = []; // se asignará externamente o mediante API
  let cachedRecomendados = [];
  let episodeText = '';
  let episodeAuthor = '';
  let activeList = 'next'; // 'next' o 'playlist'
  let userPlaylistAutoPlay = false;
  let timerValue = 0;
  let timerId = null;
  let timerCountdownInterval = null;
  let isAudioMode = true;
  let repeatMode = 0; // 0: off, 1: one, 2: all
  let isPlaying = false;
  let isVideoMode = false;
  let isExpanded = false;
  let currentPanel = null;
  let isDragging = false;

  // Elementos del DOM (se asignan en init)
  let audioEl, miniCover, miniTitle, miniArtist, miniProgress, miniPlayIcon;
  let expandedCover, expandedVideo, expandedTitle, expandedArtist, expandedProgress;
  let currentTimeSpan, durationSpan, playPauseIcon, speedBtn, repeatBtn, likeBtn;
  let mainView, panelView, panelTitle, panelContent;
  let miniBgColor, expandedBgColor, miniPlayer, expandedPlayer;
  let mediaContainer, overlay; // para control de overlay

  // Inicialización
  function initPlayer() {
    audioEl = document.getElementById('globalAudio');
    miniCover = document.getElementById('miniCover');
    miniTitle = document.getElementById('miniTitle');
    miniArtist = document.getElementById('miniArtist');
    miniProgress = document.getElementById('miniProgress');
    miniPlayIcon = document.getElementById('miniPlayIcon');
    expandedCover = document.getElementById('expandedCover');
    expandedVideo = document.getElementById('expandedVideo');
    expandedTitle = document.getElementById('expandedTitle');
    expandedArtist = document.getElementById('expandedArtist');
    expandedProgress = document.getElementById('expandedProgress');
    currentTimeSpan = document.getElementById('currentTime');
    durationSpan = document.getElementById('durationTime');
    playPauseIcon = document.getElementById('playPauseIcon');
    speedBtn = document.getElementById('speedBtn');
    repeatBtn = document.getElementById('repeatBtn');
    likeBtn = document.getElementById('likeBtn');
    mainView = document.getElementById('mainView');
    panelView = document.getElementById('panelView');
    panelTitle = document.getElementById('panelTitle');
    panelContent = document.getElementById('panelContent');
    miniBgColor = document.getElementById('miniBgColor');
    expandedBgColor = document.getElementById('expandedBgColor');
    miniPlayer = document.getElementById('miniPlayer');
    expandedPlayer = document.getElementById('expandedPlayer');
    mediaContainer = document.getElementById('mediaContainer');
    overlay = document.querySelector('.overlay'); // si existiera, pero en este diseño no hay overlay fijo, se maneja con el gradiente de fondo

    // Eventos básicos de reproducción
    audioEl.addEventListener('timeupdate', updateProgress);
    audioEl.addEventListener('loadedmetadata', updateDuration);
    audioEl.addEventListener('play', () => { isPlaying = true; updatePlayButtons(); if (isVideoMode) expandedVideo.play(); });
    audioEl.addEventListener('pause', () => { isPlaying = false; updatePlayButtons(); if (isVideoMode) expandedVideo.pause(); });
    audioEl.addEventListener('ended', handleMediaEnd);
    audioEl.addEventListener('volumechange', checkMute);

    // Eventos de los botones
    document.getElementById('miniPrev').addEventListener('click', previous);
    document.getElementById('miniNext').addEventListener('click', next);
    document.getElementById('miniPlayPause').addEventListener('click', togglePlay);
    document.getElementById('expandBtn').addEventListener('click', expandPlayer);
    document.getElementById('collapseBtn').addEventListener('click', collapsePlayer);
    document.getElementById('prevBtn').addEventListener('click', previous);
    document.getElementById('nextBtn').addEventListener('click', next);
    document.getElementById('playPauseBtn').addEventListener('click', togglePlay);
    document.getElementById('replay5Btn').addEventListener('click', () => seek(-5));
    document.getElementById('forward5Btn').addEventListener('click', () => seek(5));
    document.getElementById('videoModeBtn').addEventListener('click', () => setVideoMode(true));
    document.getElementById('audioModeBtn').addEventListener('click', () => setVideoMode(false));
    document.getElementById('closePanelBtn').addEventListener('click', hidePanel);
    document.getElementById('repeatBtn').addEventListener('click', toggleRepeat);
    document.getElementById('likeBtn').addEventListener('click', toggleLike);
    document.getElementById('moreMenuBtn').addEventListener('click', () => showPanel('share')); // ejemplo, o puedes abrir un menú
    document.getElementById('speedBtn').addEventListener('click', () => showPanel('timer')); // velocidad dentro del panel timer

    // Botones de navegación inferior
    document.querySelectorAll('.bottom-nav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const panel = e.currentTarget.dataset.panel;
        showPanel(panel);
      });
    });

    // Control de progreso en el expandido
    const progressContainer = document.querySelector('#expandedProgress').parentElement;
    progressContainer.addEventListener('mousedown', startDrag);
    progressContainer.addEventListener('touchstart', startDrag, { passive: false });
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('touchmove', onDrag, { passive: false });
    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('touchend', stopDrag);

    // Gestos táctiles en el miniplayer para expandir (deslizar arriba)
    let touchStartY = 0;
    miniPlayer.addEventListener('touchstart', (e) => {
      touchStartY = e.touches[0].clientY;
    }, { passive: true });
    miniPlayer.addEventListener('touchend', (e) => {
      const touchEndY = e.changedTouches[0].clientY;
      if (touchStartY - touchEndY > 50) expandPlayer();
    });

    // Cargar estado guardado (opcional)
    loadState();

    // Si hay episodios precargados vía API, ya se habrá llamado a load
  }

  // Funciones de reproducción (adaptadas del original)
  function loadMedia(media) {
    if (!media) return;
    currentMedia = media;
    // Actualizar UI
    miniCover.src = media.cover || media.coverUrlContainer || 'https://via.placeholder.com/80';
    expandedCover.src = media.cover || media.coverUrlInfo || media.coverUrlContainer || 'https://via.placeholder.com/400';
    miniTitle.textContent = media.title || '';
    miniArtist.textContent = media.artist || media.author || '';
    expandedTitle.textContent = media.title || '';
    expandedArtist.textContent = media.artist || media.author || '';

    audioEl.src = media.audio || media.mediaUrl;
    expandedVideo.src = media.video || '';
    expandedVideo.poster = media.cover || media.coverUrlContainer;

    // Color dinámico (si se proporciona)
    const bgColor = media.color || '#0a141c';
    if (miniBgColor) miniBgColor.style.backgroundColor = bgColor;
    if (expandedBgColor) expandedBgColor.style.backgroundColor = bgColor;
    miniProgress.style.backgroundColor = bgColor;
    expandedProgress.style.backgroundColor = bgColor;

    // Actualizar listas (next, etc.)
    if (media.next) nextList = media.next;
    else nextList = [];

    // Actualizar botón de like
    updateLikeButton();

    // Resto de actualizaciones (playlist, etc.) se harán al abrir paneles
  }

  function togglePlay() {
    if (isPlaying) {
      audioEl.pause();
      if (isVideoMode) expandedVideo.pause();
    } else {
      audioEl.play().catch(e => console.warn('play error', e));
      if (isVideoMode) expandedVideo.play().catch(e => console.warn('video play error', e));
    }
  }

  function updatePlayButtons() {
    const icon = isPlaying ? 'pause' : 'play_arrow';
    if (miniPlayIcon) miniPlayIcon.textContent = icon;
    if (playPauseIcon) playPauseIcon.textContent = icon;
  }

  function next() {
    if (activeList === 'next' && currentIndex < nextList.length - 1) {
      currentIndex++;
      loadMedia(nextList[currentIndex]);
    } else if (activeList === 'playlist' && userPlaylistAutoPlay && currentIndex < playlist.length - 1) {
      currentIndex++;
      loadMedia(playlist[currentIndex]);
    } else {
      // Si no hay más, se puede cargar un recomendado o reiniciar
    }
    if (isPlaying) togglePlay(); // opcional, o mantener reproducción
  }

  function previous() {
    if (activeList === 'next' && currentIndex > 0) {
      currentIndex--;
      loadMedia(nextList[currentIndex]);
    } else if (activeList === 'playlist' && userPlaylistAutoPlay && currentIndex > 0) {
      currentIndex--;
      loadMedia(playlist[currentIndex]);
    } else {
      audioEl.currentTime = 0;
    }
  }

  function seek(seconds) {
    if (audioEl) audioEl.currentTime += seconds;
    if (isVideoMode && expandedVideo) expandedVideo.currentTime += seconds;
  }

  function setVideoMode(enable) {
    isVideoMode = enable;
    const videoBtn = document.getElementById('videoModeBtn');
    const audioBtn = document.getElementById('audioModeBtn');
    if (videoBtn && audioBtn) {
      videoBtn.classList.toggle('text-white', enable);
      videoBtn.classList.toggle('text-slate-300', !enable);
      videoBtn.classList.toggle('bg-slate-700', enable);
      audioBtn.classList.toggle('text-white', !enable);
      audioBtn.classList.toggle('text-slate-300', enable);
      audioBtn.classList.toggle('bg-slate-700', !enable);
    }
    if (enable) {
      expandedCover.classList.add('opacity-0');
      expandedVideo.classList.remove('opacity-0');
      if (isPlaying) expandedVideo.play();
    } else {
      expandedCover.classList.remove('opacity-0');
      expandedVideo.classList.add('opacity-0');
      expandedVideo.pause();
    }
  }

  function expandPlayer() {
    isExpanded = true;
    expandedPlayer.classList.remove('hidden');
    // Asegurar que se muestra el episodio actual
    if (currentMedia) loadMedia(currentMedia);
  }

  function collapsePlayer() {
    isExpanded = false;
    expandedPlayer.classList.add('hidden');
    hidePanel();
  }

  function updateProgress() {
    if (audioEl.duration) {
      const percent = (audioEl.currentTime / audioEl.duration) * 100;
      miniProgress.style.width = percent + '%';
      expandedProgress.style.width = percent + '%';
      currentTimeSpan.textContent = formatTime(audioEl.currentTime);
    }
  }

  function updateDuration() {
    durationSpan.textContent = formatTime(audioEl.duration);
  }

  function formatTime(sec) {
    if (isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return m + ':' + s;
  }

  // Manejo de paneles (contenido original)
  function showPanel(panelType) {
    if (!panelView) return;
    currentPanel = panelType;
    let title = '';
    let contentHtml = '';

    if (panelType === 'timer') {
      title = 'Temporizador y Velocidad';
      contentHtml = `
        <div class="space-y-6">
          <div>
            <h3 class="text-sm font-semibold mb-3 text-slate-300">Apagar automáticamente</h3>
            <div class="grid grid-cols-3 gap-2">
              <button class="timer-option bg-slate-800 py-3 rounded-lg text-sm" data-value="5">5 min</button>
              <button class="timer-option bg-slate-800 py-3 rounded-lg text-sm" data-value="15">15 min</button>
              <button class="timer-option bg-slate-800 py-3 rounded-lg text-sm" data-value="30">30 min</button>
              <button class="timer-option bg-slate-800 py-3 rounded-lg text-sm col-span-2" data-value="end">Fin del episodio</button>
            </div>
          </div>
          <div>
            <h3 class="text-sm font-semibold mb-3 text-slate-300">Velocidad de reproducción</h3>
            <div class="flex flex-wrap gap-2">
              ${[0.5, 0.8, 1.0, 1.2, 1.5, 2.0].map(s => `<button class="speed-option bg-slate-800 px-4 py-2 rounded-full text-sm ${s === 1.0 ? 'bg-primary text-white' : ''}" data-speed="${s}">${s}x</button>`).join('')}
            </div>
          </div>
        </div>
      `;
    } else if (panelType === 'transcript') {
      title = 'Transcripción / Detalles';
      const text = currentMedia?.text || episodeText || 'No hay transcripción disponible.';
      contentHtml = `<div class="text-sm text-slate-400 whitespace-pre-line">${text}</div>`;
    } else if (panelType === 'queue') {
      title = 'A continuación';
      // Aquí se muestra la lista next (y recomendados)
      let nextHtml = '';
      if (nextList.length > 0) {
        nextList.forEach((item, idx) => {
          nextHtml += `
            <div class="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/50 cursor-pointer" data-index="${idx}" data-source="next">
              <img src="${item.cover || item.coverUrlInfo || 'https://via.placeholder.com/40'}" class="w-12 h-12 rounded object-cover">
              <div class="flex-1 min-w-0">
                <p class="font-medium truncate">${item.title}</p>
                <p class="text-xs text-slate-400 truncate">${item.artist || item.author}</p>
              </div>
            </div>
          `;
        });
      } else {
        nextHtml = '<p class="text-slate-400">No hay episodios siguientes</p>';
      }
      contentHtml = `<div class="space-y-2">${nextHtml}</div>`;
    } else if (panelType === 'share') {
      title = 'Compartir';
      contentHtml = `
        <div class="space-y-4">
          <button id="copyLinkBtn" class="w-full flex items-center gap-4 p-3 bg-slate-800 rounded-lg"><span class="material-symbols-outlined">link</span> Copiar enlace</button>
          <button id="shareNativeBtn" class="w-full flex items-center gap-4 p-3 bg-slate-800 rounded-lg"><span class="material-symbols-outlined">share</span> Compartir en redes</button>
          <button id="downloadBtn" class="w-full flex items-center gap-4 p-3 bg-slate-800 rounded-lg"><span class="material-symbols-outlined">download</span> Descargar</button>
        </div>
      `;
    }

    panelTitle.textContent = title;
    panelContent.innerHTML = contentHtml;
    panelView.classList.remove('translate-x-full');
    mainView.classList.add('opacity-0');

    // Agregar eventos específicos según el panel
    if (panelType === 'timer') {
      panelContent.querySelectorAll('.timer-option').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const value = e.currentTarget.dataset.value;
          setTimer(value);
          hidePanel();
        });
      });
      panelContent.querySelectorAll('.speed-option').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const speed = parseFloat(e.currentTarget.dataset.speed);
          audioEl.playbackRate = speed;
          if (expandedVideo) expandedVideo.playbackRate = speed;
          speedBtn.textContent = speed + 'x';
          hidePanel();
        });
      });
    } else if (panelType === 'queue') {
      panelContent.querySelectorAll('[data-index]').forEach(el => {
        el.addEventListener('click', (e) => {
          const index = e.currentTarget.dataset.index;
          const source = e.currentTarget.dataset.source; // 'next' por ahora
          if (source === 'next') {
            loadMedia(nextList[index]);
            hidePanel();
          }
        });
      });
    } else if (panelType === 'share') {
      document.getElementById('copyLinkBtn')?.addEventListener('click', () => {
        if (currentMedia?.detailUrl) {
          navigator.clipboard.writeText(currentMedia.detailUrl);
          alert('Enlace copiado');
        }
      });
      document.getElementById('shareNativeBtn')?.addEventListener('click', () => {
        if (navigator.share && currentMedia) {
          navigator.share({
            title: currentMedia.title,
            text: currentMedia.text,
            url: currentMedia.detailUrl
          });
        }
      });
      document.getElementById('downloadBtn')?.addEventListener('click', () => {
        if (currentMedia?.allowDownload && currentMedia.audio) {
          const a = document.createElement('a');
          a.href = currentMedia.audio;
          a.download = currentMedia.title + '.mp3';
          a.click();
        }
      });
    }
  }

  function hidePanel() {
    if (!panelView) return;
    panelView.classList.add('translate-x-full');
    mainView.classList.remove('opacity-0');
    currentPanel = null;
  }

  // Funciones adicionales (like, repeat, timer, etc.)
  function toggleLike() {
    if (!currentMedia) return;
    const index = likes.findIndex(item => item.mediaUrl === currentMedia.mediaUrl);
    if (index > -1) {
      likes.splice(index, 1);
    } else {
      likes.unshift({ ...currentMedia, addedDate: Date.now() });
    }
    localStorage.setItem('likes', JSON.stringify(likes));
    updateLikeButton();
  }

  function updateLikeButton() {
    if (!currentMedia) return;
    const liked = likes.some(item => item.mediaUrl === currentMedia.mediaUrl);
    likeBtn.classList.toggle('text-red-500', liked);
    likeBtn.classList.toggle('text-slate-300', !liked);
  }

  function toggleRepeat() {
    repeatMode = (repeatMode + 1) % 3;
    updateRepeatButton();
  }

  function updateRepeatButton() {
    let icon = 'repeat';
    if (repeatMode === 1) icon = 'repeat_one';
    else if (repeatMode === 2) icon = 'repeat';
    repeatBtn.innerHTML = `<span class="material-symbols-outlined text-2xl">${icon}</span>`;
  }

  function setTimer(value) {
    timerValue = value;
    // Implementar lógica de temporizador (similar a la original)
    if (timerId) clearTimeout(timerId);
    if (timerCountdownInterval) clearInterval(timerCountdownInterval);
    if (value === 'end') {
      // Esperar a que termine el episodio
      const checkEnd = () => {
        if (audioEl.currentTime >= audioEl.duration - 0.5) {
          audioEl.pause();
          timerValue = 0;
        }
      };
      audioEl.addEventListener('timeupdate', checkEnd);
      timerCountdownInterval = setInterval(() => {}, 1000); // dummy
    } else {
      const minutes = parseInt(value);
      timerId = setTimeout(() => {
        audioEl.pause();
        timerValue = 0;
      }, minutes * 60 * 1000);
    }
  }

  function handleMediaEnd() {
    if (repeatMode === 1) {
      audioEl.currentTime = 0;
      audioEl.play();
    } else if (repeatMode === 2) {
      audioEl.currentTime = 0;
      audioEl.play();
    } else {
      next();
    }
  }

  function checkMute() {
    // Opcional: mostrar indicador de mute
  }

  // Drag para la barra de progreso
  function startDrag(e) {
    isDragging = true;
    e.preventDefault();
  }
  function onDrag(e) {
    if (!isDragging) return;
    e.preventDefault();
    const progressContainer = document.querySelector('#expandedProgress').parentElement;
    const rect = progressContainer.getBoundingClientRect();
    let x = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
    x = Math.max(rect.left, Math.min(rect.right, x));
    const percent = (x - rect.left) / rect.width;
    if (audioEl.duration) {
      audioEl.currentTime = percent * audioEl.duration;
    }
  }
  function stopDrag() {
    isDragging = false;
  }

  // Persistencia de estado (opcional, similar a la original)
  function loadState() {
    const state = JSON.parse(localStorage.getItem('playerState')) || {};
    if (state.mediaUrl) {
      // Reconstruir currentMedia y cargar
      // ...
    }
  }

  // API pública
  const API = {
    _installed: true,
    load: (episodes, startIndex = 0) => {
      // episodes puede ser un array o un solo objeto
      if (Array.isArray(episodes)) {
        nextList = episodes;
        currentIndex = Math.min(startIndex, nextList.length - 1);
        if (nextList.length > 0) loadMedia(nextList[currentIndex]);
      } else {
        loadMedia(episodes);
      }
    },
    play: togglePlay,
    pause: () => { if (isPlaying) togglePlay(); },
    next: next,
    prev: previous,
    expand: expandPlayer,
    collapse: collapsePlayer,
    setPlaylist: (pl) => { playlist = pl; },
    setRecomendados: (rec) => { recomendados = rec; cachedRecomendados = rec; }
  };

  window.playerAPI = API;

  function initialize() {
    loadResources();
    injectHTML();
    setTimeout(initPlayer, 50);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})();
