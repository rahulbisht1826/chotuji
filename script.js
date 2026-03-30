/*--------------------
Vars
--------------------*/
let progress = 0;
let active = 0;
let isDown = false;
let isDragging = false;
let startX = 0;
let startXDrag = 0;
const dragThreshold = 5;
const MAX_PROGRESS = 100;

/*--------------------
Contants
--------------------*/
const speedWheel = 0.02;
const speedDrag = -0.1;

/*--------------------
Audio Player Setup
--------------------*/
const globalAudio = new Audio();
let isPlaying = false;
let currentAudioIndex = -1;
let pendingAudioIndex = -1;
let audioSwitchTimeout;

/*--------------------
Elements
--------------------*/
const $items = document.querySelectorAll('.carousel-item');
const $cursors = document.querySelectorAll('.cursor');

/*--------------------
Format Time
--------------------*/
const formatTime = (seconds) => {
  if (isNaN(seconds) || !isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

/*--------------------
Display Items
--------------------*/
const displayItems = (item, index, activeIndex) => {
  const zIndex = (index === activeIndex) ? $items.length : $items.length - Math.abs(index - activeIndex);
  item.style.setProperty('--zIndex', zIndex);
  item.style.setProperty('--active', (index - activeIndex) / $items.length);
  
  if (index === activeIndex) {
    item.classList.remove('inactive');
  } else {
    item.classList.add('inactive');
  }
};

/*--------------------
Animate & Sync UI
--------------------*/
const switchAudio = (newActive) => {
  if (newActive === currentAudioIndex) return;
  currentAudioIndex = newActive;
  globalAudio.src = `./src/audio_file/${newActive + 1}.mp3`;
  if (isPlaying) {
    globalAudio.play().catch(e => console.warn("Audio play error:", e));
  } else {
    globalAudio.pause();
  }
  updateAudioUI(0, 0);
  updatePlayIcons();
};

const animate = (forceAudioUpdate = false) => {
  progress = Math.max(0, Math.min(progress, MAX_PROGRESS));
  active = Math.round((progress / MAX_PROGRESS) * ($items.length - 1));
  
  if (active !== pendingAudioIndex || forceAudioUpdate) {
    pendingAudioIndex = active;
    
    // Visually reset UI immediately for the new passing card
    updateAudioUI(0, 0);
    updatePlayIcons();
    
    clearTimeout(audioSwitchTimeout);
    if (!forceAudioUpdate) {
      audioSwitchTimeout = setTimeout(() => {
        if (!isDown) {
          switchAudio(active);
        }
      }, 250); // Delay audio switch to avoid lag while swiping rapidly
    } else {
      switchAudio(active);
    }
  }

  $items.forEach((item, index) => displayItems(item, index, active));
};

/*--------------------
Click on Items
--------------------*/
$items.forEach((item, i) => {
  item.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isDragging) return;
    progress = (i / ($items.length - 1)) * MAX_PROGRESS;
    animate();
  });
});

/*--------------------
Audio Helpers
--------------------*/
function updatePlayIcons() {
  $items.forEach((item, index) => {
    const isCurrentActive = index === active;
    
    item.querySelectorAll('.play-icon').forEach(icon => {
      icon.style.display = (isCurrentActive && isPlaying) ? 'none' : 'block';
    });
    item.querySelectorAll('.pause-icon').forEach(icon => {
      icon.style.display = (isCurrentActive && isPlaying) ? 'block' : 'none';
    });
    
    item.querySelectorAll('.progress-fill').forEach(fill => {
      if (isCurrentActive && isPlaying) {
        fill.classList.add('playing');
      } else {
        fill.classList.remove('playing');
      }
    });
  });
}

function togglePlay() {
  if (globalAudio.paused) {
    globalAudio.play().then(() => {
      isPlaying = true;
      updatePlayIcons();
    }).catch(e => console.warn("Audio play error:", e));
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
  progress = (nextIndex / ($items.length - 1)) * MAX_PROGRESS;
  animate();
  
  // Ensure the new song plays immediately
  isPlaying = true; 
  globalAudio.play().catch(e => console.warn(e));
  updatePlayIcons();
});

// Sync Song Time to UI
function updateAudioUI(currentTime, duration) {
  const percent = duration ? (currentTime / duration) * 100 : 0;
  const currentStr = formatTime(currentTime);
  const totalStr = duration ? `-${formatTime(duration - currentTime)}` : "0:00";
  
  $items.forEach((item, index) => {
    if (index === active) {
      item.querySelectorAll('.progress-fill').forEach(fill => fill.style.width = `${percent}%`);
      item.querySelectorAll('.progress-thumb').forEach(thumb => thumb.style.left = `${percent}%`);
      item.querySelectorAll('.current-time').forEach(time => time.textContent = currentStr);
      item.querySelectorAll('.total-time').forEach(time => time.textContent = totalStr);
    } else {
      item.querySelectorAll('.progress-fill').forEach(fill => fill.style.width = `0%`);
      item.querySelectorAll('.progress-thumb').forEach(thumb => thumb.style.left = `0%`);
      item.querySelectorAll('.current-time').forEach(time => time.textContent = "0:00");
      item.querySelectorAll('.total-time').forEach(time => time.textContent = "0:00");
    }
  });
}

// timeupdate event fires as the audio plays
let isDraggingProgress = false;
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
  el.addEventListener('touchstart', stopProp, { passive: false });
  el.addEventListener('click', stopProp);
});

document.querySelectorAll('.prev-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    let prevIndex = active - 1;
    if (prevIndex < 0) {
      prevIndex = $items.length - 1;
    }
    progress = (prevIndex / ($items.length - 1)) * MAX_PROGRESS;
    animate();
  });
});

document.querySelectorAll('.next-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    let nextIndex = active + 1;
    if (nextIndex >= $items.length) {
      nextIndex = 0;
    }
    progress = (nextIndex / ($items.length - 1)) * MAX_PROGRESS;
    animate();
  });
});

document.querySelectorAll('.play-btn').forEach(btn => {
  btn.addEventListener('click', togglePlay);
});

/*--------------------
Scrubbing Player 
--------------------*/
let activeProgressBar = null;

const getClientX = (e) => {
  if (e.clientX !== undefined) return e.clientX;
  if (e.touches && e.touches.length > 0) return e.touches[0].clientX;
  if (e.changedTouches && e.changedTouches.length > 0) return e.changedTouches[0].clientX;
  return 0;
};

const updateSongScrub = (e) => {
  if (!activeProgressBar || !globalAudio.duration) return;
  const rect = activeProgressBar.getBoundingClientRect();
  const x = getClientX(e) - rect.left;
  const scrubPercent = Math.max(0, Math.min(100, (x / rect.width) * 100));
  updateAudioUI((scrubPercent / 100) * globalAudio.duration, globalAudio.duration);
};

const applySongScrub = (e) => {
  if (!activeProgressBar || !globalAudio.duration) return;
  const rect = activeProgressBar.getBoundingClientRect();
  const x = getClientX(e) - rect.left;
  const scrubPercent = Math.max(0, Math.min(100, (x / rect.width) * 100));
  globalAudio.currentTime = (scrubPercent / 100) * globalAudio.duration;
};

document.querySelectorAll('.progress-bar').forEach(bar => {
  const startScrub = (e) => {
    e.stopPropagation();
    isDraggingProgress = true;
    activeProgressBar = bar;
    updateSongScrub(e);
  };
  bar.addEventListener('mousedown', startScrub);
  bar.addEventListener('touchstart', startScrub, { passive: false });
});

document.addEventListener('mousemove', (e) => {
  if (isDraggingProgress) updateSongScrub(e);
});
document.addEventListener('touchmove', (e) => {
  if (isDraggingProgress) updateSongScrub(e);
}, { passive: false });

const stopScrub = (e) => {
  if (isDraggingProgress) applySongScrub(e);
  isDraggingProgress = false;
  activeProgressBar = null;
};
document.addEventListener('mouseup', stopScrub);
document.addEventListener('touchend', stopScrub);

/*--------------------
Carousel Handlers
--------------------*/
const handleWheel = e => {
  progress += e.deltaY * speedWheel;
  animate();
};

const handleMouseMoveCarousel = (e) => {
  if (e.type === 'mousemove') {
    $cursors.forEach($cursor => {
      $cursor.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
    });
  }
  
  if (!isDown || isDraggingProgress) return;

  const x = getClientX(e);
  
  if (Math.abs(x - startXDrag) > dragThreshold) {
    isDragging = true;
  }

  progress += (x - startX) * speedDrag;
  startX = x;
  animate();
};

const handleMouseDownCarousel = e => {
  if (isDraggingProgress) return;
  isDown = true;
  isDragging = false;
  startX = getClientX(e);
  startXDrag = startX;
  
  // Disable transition for snappy dragging on mobile
  $items.forEach(item => item.style.transition = 'none');
};

const handleMouseUpCarousel = () => {
  isDown = false;
  
  // Re-enable transition for smooth snapping
  $items.forEach(item => item.style.transition = '');
  
  // Snap progress to final active card
  progress = (active / ($items.length - 1)) * MAX_PROGRESS;
  animate(true);
};

/*--------------------
Listeners
--------------------*/
document.addEventListener('wheel', handleWheel, { passive: true });
document.addEventListener('mousedown', handleMouseDownCarousel);
document.addEventListener('mousemove', handleMouseMoveCarousel);
document.addEventListener('mouseup', handleMouseUpCarousel);
document.addEventListener('touchstart', handleMouseDownCarousel, { passive: true });
document.addEventListener('touchmove', handleMouseMoveCarousel, { passive: false });
document.addEventListener('touchend', handleMouseUpCarousel);

// Init
animate();