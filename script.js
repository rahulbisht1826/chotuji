/*--------------------
Vars
--------------------*/
let progress = 0
let startX = 0
let active = 0
let isDown = false
let isDragging = false
let startXDrag = 0
const dragThreshold = 5

/*--------------------
Contants
--------------------*/
const speedWheel = 0.02
const speedDrag = -0.1

/*--------------------
Audio Player Setup
--------------------*/
const globalAudio = new Audio();
let isPlaying = false;
let currentAudioIndex = -1;

/*--------------------
Format Time
--------------------*/
const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds === Infinity) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

/*--------------------
Get Z
--------------------*/
const getZindex = (array, index) => (array.map((_, i) => (index === i) ? array.length : array.length - Math.abs(index - i)))

/*--------------------
Items
--------------------*/
const $items = document.querySelectorAll('.carousel-item')
const $cursors = document.querySelectorAll('.cursor')

const displayItems = (item, index, active) => {
  const zIndex = getZindex([...$items], active)[index]
  item.style.setProperty('--zIndex', zIndex)
  item.style.setProperty('--active', (index-active)/$items.length)
  
  if (index === active) {
    item.classList.remove('inactive')
  } else {
    item.classList.add('inactive')
  }
}

/*--------------------
Animate & Sync UI
--------------------*/
const animate = () => {
  progress = Math.max(0, Math.min(progress, 100))
  active = Math.round((progress / 100) * ($items.length - 1))
  
  // Track audio switching
  if (active !== currentAudioIndex) {
    currentAudioIndex = active;
    globalAudio.src = `./src/audio_file/${active + 1}.mp3`;
    if (isPlaying) {
      globalAudio.play().catch(e => console.log("Audio not found or autoplay prevented.", e));
    }
    // Instantly reset the UI to 0:00 for the new card
    updateAudioUI(0, 0);
  }

  $items.forEach((item, index) => displayItems(item, index, active))
}

/*--------------------
Click on Items
--------------------*/
$items.forEach((item, i) => {
  item.addEventListener('click', () => {
    if (isDragging) return
    progress = (i / ($items.length - 1)) * 100
    animate()
  })
})

/*--------------------
Audio Helpers
--------------------*/
function updatePlayIcons() {
  $items.forEach((item, index) => {
    const isCurrentActive = index === active;
    
    item.querySelectorAll('.play-icon').forEach(icon => icon.style.display = (isCurrentActive && isPlaying) ? 'none' : 'block');
    item.querySelectorAll('.pause-icon').forEach(icon => icon.style.display = (isCurrentActive && isPlaying) ? 'block' : 'none');
    
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
    }).catch(e => console.log("Audio play error (check if song exists):", e));
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
  animate();
  
  // Ensure the new song plays immediately
  isPlaying = true; 
  globalAudio.play().catch(e => console.log(e));
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
    animate();
  });
});

document.querySelectorAll('.next-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    progress = Math.min(100, progress + (100 / ($items.length - 1)));
    let nextIndex = Math.round((progress / 100) * ($items.length - 1));
    // If we're already at the end and press next, loop back
    if (active === $items.length - 1) {
       progress = 0;
    }
    animate();
  });
});

document.querySelectorAll('.play-btn').forEach(btn => {
  btn.addEventListener('click', togglePlay);
});



// Scrubbing Player Song Progress
let isDraggingProgress = false;
let activeProgressBar = null;

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
  animate()
}

const handleMouseMoveCarousel = (e) => {
  if (e.type === 'mousemove') {
    $cursors.forEach(($cursor) => {
      $cursor.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`
    })
  }
  if (!isDown || isDraggingProgress) return
  const x = e.clientX || (e.touches && e.touches[0].clientX) || 0
  
  // Set dragging state if threshold passed
  if (Math.abs(x - startXDrag) > dragThreshold) {
    isDragging = true
  }

  const mouseProgress = (x - startX) * speedDrag
  progress = progress + mouseProgress
  startX = x
  animate()
}

const handleMouseDownCarousel = e => {
  if (isDraggingProgress) return;
  isDown = true
  isDragging = false // Reset for new click
  startX = e.clientX || (e.touches && e.touches[0].clientX) || 0
  startXDrag = startX 
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
document.addEventListener('touchmove', handleMouseMoveCarousel)
document.addEventListener('touchend', handleMouseUpCarousel)
// Init
animate();