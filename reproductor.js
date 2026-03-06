// ============================================
// reproductor.js - Reproductor móvil tipo YouTube Music/Spotify
// Incluye miniplayer persistente y vista expandida con paneles
// ============================================
(function() {
  // Evitar múltiples inicializaciones
  if (window.playerAPI && window.playerAPI._installed) return;
  
  // --- 1. Inyectar recursos en el head (Tailwind, fuentes, iconos) ---
  function loadResources() {
    // Tailwind (CDN)
    if (!document.querySelector('script[src*="tailwindcss"]')) {
      const tailwindScript = document.createElement('script');
      tailwindScript.src = 'https://cdn.tailwindcss.com?plugins=forms,container-queries';
      document.head.appendChild(tailwindScript);
    }
    // Material Icons
    if (!document.querySelector('link[href*="Material+Symbols"]')) {
      const materialLink = document.createElement('link');
      materialLink.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap';
      materialLink.rel = 'stylesheet';
      document.head.appendChild(materialLink);
    }
    // Fuente Spline Sans
    if (!document.querySelector('link[href*="Spline+Sans"]')) {
      const fontLink = document.createElement('link');
      fontLink.href = 'https://fonts.googleapis.com/css2?family=Spline+Sans:wght@300;400;500;600;700&display=swap';
      fontLink.rel = 'stylesheet';
      document.head.appendChild(fontLink);
    }
    // Estilos personalizados (pequeño extra)
    const style = document.createElement('style');
    style.textContent = `
      body { font-family: 'Spline Sans', sans-serif; margin: 0; background: transparent; }
      .font-fill-1 { font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
      .player-gradient { background: linear-gradient(180deg, #1e3a4a 0%, #101c22 100%); }
      video::-webkit-media-controls { display: none !important; }
    `;
    document.head.appendChild(style);
  }

  // --- 2. Inyectar HTML del reproductor en el body ---
  function injectHTML() {
    if (document.getElementById('miniPlayer')) return; // ya existe

    const playerHTML = `
      <!-- Elementos globales de audio/video -->
      <audio id="globalAudio" preload="metadata" style="display: none;"></audio>
      <div style="display: none;" id="videoContainer"></div>

      <!-- MINI REPRODUCTOR (siempre visible abajo) -->
      <div id="miniPlayer" class="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-lg border-t border-white/10 text-white px-3 py-2 flex items-center gap-3 z-40 shadow-2xl" style="padding-bottom: env(safe-area-inset-bottom, 8px);">
        <div class="w-10 h-10 rounded-md overflow-hidden flex-shrink-0 bg-gray-800">
          <img id="miniCover" src="https://via.placeholder.com/80x80/1e3a4a/ffffff?text=Cover" class="w-full h-full object-cover">
        </div>
        <div class="flex-1 min-w-0">
          <div id="miniTitle" class="text-sm font-semibold truncate">Cargando...</div>
          <div id="miniArtist" class="text-xs text-gray-400 truncate"></div>
          <div class="h-1 bg-gray-700 rounded-full mt-1 w-full overflow-hidden">
            <div id="miniProgress" class="h-full bg-primary" style="width: 0%; background-color: #0da6f2;"></div>
          </div>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <button id="miniPrev" class="p-2 text-gray-300 hover:text-white"><span class="material-symbols-outlined text-2xl">skip_previous</span></button>
          <button id="miniPlayPause" class="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition"><span id="miniPlayIcon" class="material-symbols-outlined text-3xl font-fill-1">play_arrow</span></button>
          <button id="miniNext" class="p-2 text-gray-300 hover:text-white"><span class="material-symbols-outlined text-2xl">skip_next</span></button>
          <button id="expandBtn" class="p-2 text-gray-300 hover:text-white ml-1"><span class="material-symbols-outlined text-2xl">expand_less</span></button>
        </div>
      </div>

      <!-- REPRODUCTOR EXPANDIDO (oculto por defecto) -->
      <div id="expandedPlayer" class="fixed inset-0 bg-background-dark text-slate-100 z-50 flex flex-col overflow-hidden hidden" style="background-color: #0a141c; padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom);">
        <header class="flex items-center justify-between px-5 pt-4 pb-2 flex-shrink-0">
          <button id="collapseBtn" class="p-2 -ml-2 text-slate-300 hover:text-white"><span class="material-symbols-outlined text-3xl">expand_more</span></button>
          <div class="bg-black/30 backdrop-blur-md p-1 rounded-full flex items-center border border-white/10">
            <button id="videoModeBtn" class="px-5 py-1.5 rounded-full text-xs font-semibold text-white shadow-sm">Video</button>
            <button id="audioModeBtn" class="px-5 py-1.5 rounded-full text-xs font-semibold text-slate-400">Audio</button>
          </div>
          <button id="moreMenuBtn" class="p-2 -mr-2 text-slate-300 hover:text-white"><span class="material-symbols-outlined">more_horiz</span></button>
        </header>

        <div class="flex-1 relative overflow-hidden">
          <!-- VISTA PRINCIPAL (por defecto) -->
          <div id="mainView" class="absolute inset-0 flex flex-col px-5 pt-2 pb-4 overflow-y-auto transition-opacity duration-200">
            <div class="flex-1 flex flex-col justify-center items-center">
              <div class="w-full aspect-square max-w-[400px] rounded-2xl overflow-hidden shadow-2xl border border-white/5 relative" id="mediaContainer">
                <img id="expandedCover" src="https://via.placeholder.com/400x400/1e3a4a/ffffff?text=Cover" class="w-full h-full object-cover absolute inset-0 transition-opacity duration-300">
                <video id="expandedVideo" class="w-full h-full object-cover absolute inset-0 transition-opacity duration-300 opacity-0" playsinline muted></video>
              </div>
            </div>
            <div class="mt-4 mb-4">
              <div class="flex items-center justify-between gap-4">
                <div class="min-w-0">
                  <h1 id="expandedTitle" class="text-2xl font-bold truncate text-slate-50">Título</h1>
                  <p id="expandedArtist" class="text-lg text-slate-400 font-medium truncate">Artista</p>
                </div>
                <button id="likeBtn" class="shrink-0 text-slate-400 hover:text-red-500"><span class="material-symbols-outlined text-3xl">favorite</span></button>
              </div>
            </div>
            <div class="mb-4">
              <div class="relative h-1.5 w-full bg-slate-700/50 rounded-full overflow-hidden mb-2">
                <div id="expandedProgress" class="absolute top-0 left-0 h-full bg-primary" style="width: 0%; background-color: #0da6f2;"></div>
              </div>
              <div class="flex justify-between text-[11px] font-mono text-slate-500 tracking-wider">
                <span id="currentTime">0:00</span>
                <span id="durationTime">0:00</span>
              </div>
            </div>
            <div class="flex items-center justify-between mb-6">
              <button id="speedBtn" class="text-slate-400 hover:text-white text-sm font-bold border border-slate-600 rounded px-2 py-1">1x</button>
              <div class="flex items-center gap-5">
                <button id="replay5Btn" class="text-slate-300 hover:text-white"><span class="material-symbols-outlined text-3xl">replay_5</span></button>
                <button id="prevBtn" class="text-slate-100 hover:text-primary"><span class="material-symbols-outlined text-4xl font-fill-1">skip_previous</span></button>
                <button id="playPauseBtn" class="size-16 rounded-full bg-white text-background-dark flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl"><span id="playPauseIcon" class="material-symbols-outlined text-[42px] font-fill-1">play_arrow</span></button>
                <button id="nextBtn" class="text-slate-100 hover:text-primary"><span class="material-symbols-outlined text-4xl font-fill-1">skip_next</span></button>
                <button id="forward5Btn" class="text-slate-300 hover:text-white"><span class="material-symbols-outlined text-3xl">forward_5</span></button>
              </div>
              <button id="repeatBtn" class="text-slate-400 hover:text-primary"><span class="material-symbols-outlined text-2xl">repeat</span></button>
            </div>
            <div class="flex items-center justify-between px-2 pb-2">
              <button class="bottom-nav-btn flex flex-col items-center gap-1 text-slate-400 hover:text-white" data-panel="timer"><span class="material-symbols-outlined">timer</span></button>
              <button class="bottom-nav-btn flex flex-col items-center gap-1 text-slate-400 hover:text-white" data-panel="captions"><span class="material-symbols-outlined">closed_caption</span></button>
              <button class="bottom-nav-btn flex flex-col items-center gap-1 text-slate-400 hover:text-white" data-panel="queue"><span class="material-symbols-outlined">queue_music</span></button>
              <button class="bottom-nav-btn flex flex-col items-center gap-1 text-slate-400 hover:text-white" data-panel="share"><span class="material-symbols-outlined">share</span></button>
            </div>
            <div class="flex justify-center mt-2 mb-1"><div class="w-32 h-1 bg-white/10 rounded-full"></div></div>
          </div>

          <!-- VISTA DE PANEL (se superpone) -->
          <div id="panelView" class="absolute inset-0 bg-background-dark/95 backdrop-blur-sm flex flex-col p-5 transition-transform duration-300 translate-x-full">
            <div class="flex items-center justify-between mb-5">
              <button id="closePanelBtn" class="p-2 -ml-2 text-slate-300"><span class="material-symbols-outlined">arrow_back</span></button>
              <h2 id="panelTitle" class="text-lg font-semibold"></h2>
              <div class="w-8"></div>
            </div>
            <div id="panelContent" class="flex-1 overflow-y-auto"></div>
          </div>
        </div>
      </div>
      <!-- Espacio inferior para el mini reproductor fijo -->
      <div style="height: 80px;"></div>
    `;

    const wrapper = document.createElement('div');
    wrapper.id = 'player-root';
    wrapper.innerHTML = playerHTML;
    document.body.appendChild(wrapper);
  }

  // --- 3. Lógica del reproductor (variables, funciones, eventos) ---
  // NOTA: toda la lógica debe declararse después de que el DOM esté listo,
  // o bien usar delegación de eventos. Lo haremos dentro de una función initPlayer
  // que se ejecuta tras inyectar HTML.

  let episodes = [];
  let currentIndex = 0;
  let isPlaying = false;
  let isVideoMode = false;
  let isExpanded = false;
  let currentPanel = null;
  let themeColor = '#0da6f2';

  // Elementos (se reasignan en initPlayer)
  let audioEl, miniCover, miniTitle, miniArtist, miniProgress, miniPlayIcon;
  let expandedCover, expandedVideo, expandedTitle, expandedArtist, expandedProgress;
  let currentTimeSpan, durationSpan, playPauseIcon, speedBtn;
  let mainView, panelView, panelTitle, panelContent;

  function initPlayer() {
    // Obtener referencias a elementos DOM
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
    mainView = document.getElementById('mainView');
    panelView = document.getElementById('panelView');
    panelTitle = document.getElementById('panelTitle');
    panelContent = document.getElementById('panelContent');

    // Asignar eventos
    document.getElementById('miniPrev').addEventListener('click', prevTrack);
    document.getElementById('miniNext').addEventListener('click', nextTrack);
    document.getElementById('miniPlayPause').addEventListener('click', togglePlay);
    document.getElementById('expandBtn').addEventListener('click', expandPlayer);
    document.getElementById('collapseBtn').addEventListener('click', collapsePlayer);
    document.getElementById('prevBtn').addEventListener('click', prevTrack);
    document.getElementById('nextBtn').addEventListener('click', nextTrack);
    document.getElementById('playPauseBtn').addEventListener('click', togglePlay);
    document.getElementById('replay5Btn').addEventListener('click', () => seek(-5));
    document.getElementById('forward5Btn').addEventListener('click', () => seek(5));
    document.getElementById('videoModeBtn').addEventListener('click', () => setVideoMode(true));
    document.getElementById('audioModeBtn').addEventListener('click', () => setVideoMode(false));
    document.getElementById('closePanelBtn').addEventListener('click', hidePanel);

    // Botones de navegación inferior (abren paneles)
    document.querySelectorAll('.bottom-nav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const panel = e.currentTarget.dataset.panel;
        showPanel(panel);
      });
    });

    // Eventos de audio
    audioEl.addEventListener('timeupdate', updateProgress);
    audioEl.addEventListener('loadedmetadata', updateDuration);
    audioEl.addEventListener('play', () => { isPlaying = true; updatePlayButtons(); if (isVideoMode) expandedVideo.play(); });
    audioEl.addEventListener('pause', () => { isPlaying = false; updatePlayButtons(); if (isVideoMode) expandedVideo.pause(); });
    audioEl.addEventListener('ended', nextTrack);

    // Cargar primer episodio si existe
    if (episodes.length > 0) loadEpisode(currentIndex);
  }

  // Funciones de reproducción
  function loadEpisode(index) {
    if (index < 0) index = episodes.length - 1;
    if (index >= episodes.length) index = 0;
    currentIndex = index;
    const ep = episodes[currentIndex];
    if (!ep) return;

    // Actualizar UI
    miniCover.src = ep.cover;
    expandedCover.src = ep.cover;
    miniTitle.textContent = ep.title;
    miniArtist.textContent = ep.artist || ep.serie || '';
    expandedTitle.textContent = ep.title;
    expandedArtist.textContent = ep.artist || ep.serie || '';

    // Fuentes de audio y video
    audioEl.src = ep.audio;
    expandedVideo.src = ep.video || '';
    expandedVideo.poster = ep.cover;

    // Resetear reproducción
    isPlaying = false;
    updatePlayButtons();
    if (isVideoMode) setVideoMode(false); // volver a audio al cambiar episodio

    // Aplicar color
    if (ep.color) {
      themeColor = ep.color;
      miniProgress.style.backgroundColor = themeColor;
      expandedProgress.style.backgroundColor = themeColor;
    } else {
      miniProgress.style.backgroundColor = '#0da6f2';
      expandedProgress.style.backgroundColor = '#0da6f2';
    }
  }

  function togglePlay() {
    if (isPlaying) {
      audioEl.pause();
      if (isVideoMode) expandedVideo.pause();
    } else {
      audioEl.play().catch(e => console.warn('play error', e));
      if (isVideoMode) expandedVideo.play().catch(e => console.warn('video play error', e));
    }
    // isPlaying se actualiza mediante eventos
  }

  function updatePlayButtons() {
    const icon = isPlaying ? 'pause' : 'play_arrow';
    if (miniPlayIcon) miniPlayIcon.textContent = icon;
    if (playPauseIcon) playPauseIcon.textContent = icon;
  }

  function nextTrack() { loadEpisode(currentIndex + 1); }
  function prevTrack() { loadEpisode(currentIndex - 1); }

  function seek(seconds) {
    if (audioEl) audioEl.currentTime += seconds;
    if (isVideoMode && expandedVideo) expandedVideo.currentTime += seconds;
  }

  function setVideoMode(enable) {
    isVideoMode = enable;
    // Actualizar botones toggle
    const videoBtn = document.getElementById('videoModeBtn');
    const audioBtn = document.getElementById('audioModeBtn');
    if (videoBtn && audioBtn) {
      videoBtn.classList.toggle('text-white', enable);
      videoBtn.classList.toggle('text-slate-400', !enable);
      videoBtn.classList.toggle('bg-slate-700', enable);
      audioBtn.classList.toggle('text-white', !enable);
      audioBtn.classList.toggle('text-slate-400', enable);
      audioBtn.classList.toggle('bg-slate-700', !enable);
    }
    // Mostrar/ocultar elementos
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
    document.getElementById('expandedPlayer').classList.remove('hidden');
    loadEpisode(currentIndex); // refrescar datos por si acaso
  }

  function collapsePlayer() {
    isExpanded = false;
    document.getElementById('expandedPlayer').classList.add('hidden');
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

  // Paneles
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
              <button class="timer-option bg-slate-800 py-3 rounded-lg text-sm">5 min</button>
              <button class="timer-option bg-slate-800 py-3 rounded-lg text-sm">15 min</button>
              <button class="timer-option bg-slate-800 py-3 rounded-lg text-sm">30 min</button>
              <button class="timer-option bg-slate-800 py-3 rounded-lg text-sm col-span-2">Fin del episodio</button>
            </div>
          </div>
          <div>
            <h3 class="text-sm font-semibold mb-3 text-slate-300">Velocidad de reproducción</h3>
            <div class="flex flex-wrap gap-2">
              ${[0.5, 0.8, 1.0, 1.2, 1.5, 2.0].map(s => `<button class="speed-option bg-slate-800 px-4 py-2 rounded-full text-sm ${s === 1.0 ? 'bg-primary text-white' : ''}">${s}x</button>`).join('')}
            </div>
          </div>
        </div>
      `;
    } else if (panelType === 'captions') {
      title = 'Transcripción / Subtítulos';
      const transcript = episodes[currentIndex]?.transcript || 'No hay transcripción disponible.';
      contentHtml = `<div class="text-sm text-slate-400 whitespace-pre-line">${transcript}</div>`;
    } else if (panelType === 'queue') {
      title = 'Lista de episodios';
      contentHtml = `<ul class="space-y-3">` + episodes.map((ep, idx) => `
        <li class="flex items-center gap-3 p-2 rounded-lg ${idx === currentIndex ? 'bg-slate-700' : 'hover:bg-slate-800/50'}" data-index="${idx}">
          <img src="${ep.cover}" class="w-12 h-12 rounded object-cover">
          <div class="flex-1 min-w-0">
            <p class="font-medium truncate">${ep.title}</p>
            <p class="text-xs text-slate-400 truncate">${ep.artist || ep.serie}</p>
          </div>
          ${idx === currentIndex ? '<span class="material-symbols-outlined text-primary">play_arrow</span>' : ''}
        </li>`).join('') + '</ul>';
    } else if (panelType === 'share') {
      title = 'Compartir';
      contentHtml = `
        <div class="space-y-4">
          <button class="w-full flex items-center gap-4 p-3 bg-slate-800 rounded-lg"><span class="material-symbols-outlined">link</span> Copiar enlace</button>
          <button class="w-full flex items-center gap-4 p-3 bg-slate-800 rounded-lg"><span class="material-symbols-outlined">share</span> Compartir en redes</button>
        </div>
      `;
    }

    panelTitle.textContent = title;
    panelContent.innerHTML = contentHtml;
    panelView.classList.remove('translate-x-full');
    mainView.classList.add('opacity-0');

    // Event listeners específicos
    if (panelType === 'queue') {
      panelContent.querySelectorAll('li').forEach(li => {
        li.addEventListener('click', (e) => {
          const idx = e.currentTarget.dataset.index;
          if (idx !== undefined) {
            loadEpisode(parseInt(idx));
            hidePanel();
          }
        });
      });
    }
    if (panelType === 'timer') {
      panelContent.querySelectorAll('.speed-option').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const speed = parseFloat(e.target.textContent);
          audioEl.playbackRate = speed;
          if (expandedVideo) expandedVideo.playbackRate = speed;
          speedBtn.textContent = speed + 'x';
          hidePanel();
        });
      });
    }
  }

  function hidePanel() {
    if (!panelView) return;
    panelView.classList.add('translate-x-full');
    mainView.classList.remove('opacity-0');
    currentPanel = null;
  }

  // --- 4. API pública ---
  const API = {
    _installed: true,
    load: (newEpisodes, startIndex = 0) => {
      episodes = newEpisodes || [];
      currentIndex = Math.min(startIndex, episodes.length - 1);
      if (currentIndex < 0) currentIndex = 0;
      if (episodes.length > 0) loadEpisode(currentIndex);
    },
    play: () => { if (!isPlaying) togglePlay(); },
    pause: () => { if (isPlaying) togglePlay(); },
    next: nextTrack,
    prev: prevTrack,
    expand: expandPlayer,
    collapse: collapsePlayer
  };

  window.playerAPI = API;

  // --- 5. Inicialización completa ---
  function initialize() {
    loadResources();
    injectHTML();
    // Esperar un poco para que los elementos estén en el DOM
    setTimeout(initPlayer, 50);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})();
