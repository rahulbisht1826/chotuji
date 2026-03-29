/*--------------------
Vars
--------------------*/
let progress = 50
let startX = 0
let active = 0
let isDown = false
let currentAudioIndex = -1
let isPlaying = false
let isDraggingProgress = false
let activeProgressBar = null

/*--------------------
Constants
--------------------*/
const speedWheel = 0.02
const speedDrag = -0.1
const globalAudio = new Audio()

/*--------------------
DOM Elements Caching
--------------------*/
const $carousel = document.querySelector('.carousel')
const $items = Array.from(document.querySelectorAll('.carousel-item'))
const $cursors = document.querySelectorAll('.cursor')

// Sub-element caching for faster updates
const itemStates = $items.map(item => ({
  el: item,
  fill: item.querySelector('.progress-fill'),
  thumb: item.querySelector('.progress-thumb'),
  current: item.querySelector('.current-time'),
  total: item.querySelector('.total-time'),
  playIcon: item.querySelector('.play-icon'),
  pauseIcon: item.querySelector('.pause-icon')
}))

/*--------------------
Helpers
--------------------*/
const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds === Infinity) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

const getZindex = (len, index, active) => (index === active) ? len : len - Math.abs(active - index)

const setItemStyles = (state, index, active, len) => {
  const diff = index - active
  const zZindex = getZindex(len, index, active)
  
  state.el.style.setProperty('--zIndex', zZindex)
  state.el.style.setProperty('--active', diff / len)
  
  if (index === active) {
    state.el.classList.remove('inactive')
    state.el.classList.add('active-card')
  } else {
    state.el.classList.add('inactive')
    state.el.classList.remove('active-card')
  }
}

/*--------------------
Animation Loop
--------------------*/
let rafId = null

const update = () => {
  progress = Math.max(0, Math.min(progress, 100))
  const newActive = Math.round((progress / 100) * ($items.length - 1))
  
  if (newActive !== active || rafId === null) {
    active = newActive
    
    // Track audio switching
    if (active !== currentAudioIndex) {
      currentAudioIndex = active
      globalAudio.src = `./src/audio_file/${active + 1}.mp3`
      if (isPlaying) {
        globalAudio.play().catch(() => {})
      }
      updateAudioUI(0, 0)
      updatePlayIcons()
    }

    const len = $items.length
    itemStates.forEach((state, index) => setItemStyles(state, index, active, len))
  }
  
  rafId = requestAnimationFrame(update)
}

// Start loop
update()

/*--------------------
Click on Items
--------------------*/
itemStates.forEach((state, i) => {
  state.el.addEventListener('click', () => {
    progress = (i / ($items.length - 1)) * 100
  })
})

/*--------------------
Audio Helpers
--------------------*/
function updatePlayIcons() {
  itemStates.forEach((state, index) => {
    const isCurrentActive = (index === active)
    const playingEffect = isCurrentActive && isPlaying
    
    if (state.playIcon) state.playIcon.style.display = playingEffect ? 'none' : 'block'
    if (state.pauseIcon) state.pauseIcon.style.display = playingEffect ? 'block' : 'none'
    
    if (state.fill) {
      if (playingEffect) state.fill.classList.add('playing')
      else state.fill.classList.remove('playing')
    }
  })
}

function togglePlay() {
  if (globalAudio.paused) {
    globalAudio.play().then(() => {
      isPlaying = true;
      updatePlayIcons();
    }).catch(() => {});
  } else {
    globalAudio.pause();
    isPlaying = false;
    updatePlayIcons();
  }
}

// Auto play next card when song ends
globalAudio.addEventListener('ended', () => {
  let nextIndex = active + 1;
  if (nextIndex >= $items.length) {
    nextIndex = 0; // Loop back to the first card
  }
  progress = (nextIndex / ($items.length - 1)) * 100;
  
  // Ensure the new song plays immediately
  isPlaying = true; 
  globalAudio.play().catch(() => {});
  updatePlayIcons();
});

// Sync Song Time to UI
function updateAudioUI(currentTime, duration) {
  const percent = duration ? (currentTime / duration) * 100 : 0
  const currentStr = formatTime(currentTime)
  const totalStr = duration ? `-${formatTime(duration - currentTime)}` : "0:00"
  
  itemStates.forEach((state, index) => {
    if (index === active) {
      if (state.fill) state.fill.style.width = `${percent}%`
      if (state.thumb) state.thumb.style.left = `${percent}%`
      if (state.current) state.current.textContent = currentStr
      if (state.total) state.total.textContent = totalStr
    } else {
      if (state.current && state.current.textContent !== "0:00") {
        if (state.fill) state.fill.style.width = '0%'
        if (state.thumb) state.thumb.style.left = '0%'
        state.current.textContent = "0:00"
        state.total.textContent = "0:00"
      }
    }
  })
}

// timeupdate event fires as the audio plays
globalAudio.addEventListener('timeupdate', () => {
  if (!isDraggingProgress) {
    updateAudioUI(globalAudio.currentTime, globalAudio.duration);
  }
});

// Update total time correctly when metadata loads
globalAudio.addEventListener('loadedmetadata', () => {
  updateAudioUI(globalAudio.currentTime, globalAudio.duration);
});

/*--------------------
Player Controls
--------------------*/
const stopProp = e => e.stopPropagation();
document.querySelectorAll('.controls, .progress-section').forEach(el => {
  el.addEventListener('mousedown', stopProp);
  el.addEventListener('touchstart', stopProp);
  el.addEventListener('click', stopProp);
});

document.querySelectorAll('.prev-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    progress = Math.max(0, progress - (100 / ($items.length - 1)));
  });
});

document.querySelectorAll('.next-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (active === $items.length - 1) {
       progress = 0;
    } else {
       progress = Math.min(100, progress + (100 / ($items.length - 1)));
    }
  });
});

document.querySelectorAll('.play-btn').forEach(btn => {
  btn.addEventListener('click', togglePlay);
});



// Scrubbing Player Song Progress
// Variables already declared at top to avoid redeclaration issues
const updateSongScrub = (e) => {
  if (!activeProgressBar || !globalAudio.duration) return;
  const rect = activeProgressBar.getBoundingClientRect();
  const x = (e.clientX || (e.touches && e.touches[0].clientX) || rect.left) - rect.left;
  const scrubPercent = Math.max(0, Math.min(100, (x / rect.width) * 100));
  
  updateAudioUI((scrubPercent / 100) * globalAudio.duration, globalAudio.duration);
}

const applySongScrub = (e) => {
  if (!activeProgressBar || !globalAudio.duration) return;
  const rect = activeProgressBar.getBoundingClientRect();
  const x = (e.clientX || (e.touches && e.touches[0].clientX) || rect.left) - rect.left;
  const scrubPercent = Math.max(0, Math.min(100, (x / rect.width) * 100));
  
  globalAudio.currentTime = (scrubPercent / 100) * globalAudio.duration;
}

document.querySelectorAll('.progress-bar').forEach(bar => {
  bar.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    isDraggingProgress = true;
    activeProgressBar = bar;
    updateSongScrub(e);
  });
  bar.addEventListener('touchstart', (e) => {
    e.stopPropagation();
    isDraggingProgress = true;
    activeProgressBar = bar;
    updateSongScrub(e);
  });
});

document.addEventListener('mousemove', (e) => {
  if (isDraggingProgress) updateSongScrub(e);
});
document.addEventListener('touchmove', (e) => {
  if (isDraggingProgress) updateSongScrub(e);
});

const stopScrub = (e) => {
  if (isDraggingProgress) applySongScrub(e);
  isDraggingProgress = false;
  activeProgressBar = null;
}
document.addEventListener('mouseup', stopScrub);
document.addEventListener('touchend', stopScrub);

/*--------------------
Carousel Handlers
--------------------*/
const handleWheel = e => {
  const wheelProgress = e.deltaY * speedWheel
  progress = progress + wheelProgress
}

const handleMouseMoveCarousel = (e) => {
  if (e.type === 'mousemove') {
    $cursors.forEach(($cursor) => {
      $cursor.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`
    })
  }
  if (!isDown || isDraggingProgress) return
  const x = e.clientX || (e.touches && e.touches[0].clientX) || 0
  const mouseProgress = (x - startX) * speedDrag
  progress = progress + mouseProgress
  startX = x
}

const handleMouseDownCarousel = e => {
  if (isDraggingProgress) return;
  isDown = true
  startX = e.clientX || (e.touches && e.touches[0].clientX) || 0
}

const handleMouseUpCarousel = () => {
  isDown = false
}

/*--------------------
Listeners
--------------------*/
document.addEventListener('mousewheel', handleWheel)
document.addEventListener('mousedown', handleMouseDownCarousel)
document.addEventListener('mousemove', handleMouseMoveCarousel)
document.addEventListener('mouseup', handleMouseUpCarousel)
document.addEventListener('touchstart', handleMouseDownCarousel)
document.addEventListener('touchmove', handleMouseMoveCarousel, { passive: false })
document.addEventListener('touchend', handleMouseUpCarousel)