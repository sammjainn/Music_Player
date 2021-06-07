let body = document.querySelector('body');
const button = document.querySelector('.file-upload-btn');
const hiddenInput = document.querySelector('.file-upload-input');
const defaultLabelText = 'No file(s) selected';

const songList = document.querySelector('.songs-list');
let nowPlaying = document.querySelector('.now-playing');
let playBtn = nowPlaying.querySelector('#play');
let playNextBtn = document.querySelector('.fa-step-forward');
let playPrevBtn = document.querySelector('.fa-step-backward');
let seekSlider = document.querySelector('.seek-slider');
let exitBtn = document.querySelector('.exit-player');
let menu = document.querySelector('.menu');
let search = document.querySelector('.search');
let songs = document.querySelector('.songs');
let theme = document.querySelector('.theme');

let progressBar = document.querySelector('.progress-bar');
let progress = document.querySelector('.progress');
let currTimeStamp = document.querySelector('.curr-time');
let totalTimeStamp = document.querySelector('.total-time');

let currTrack = document.querySelector('audio');
let canvas = document.querySelector('#canvas');
let isPlaying = false;
let interval;

playNextBtn.addEventListener('click', playNext);
playPrevBtn.addEventListener('click', playPrev);
currTrack.addEventListener('ended', playNext);

seekSlider.addEventListener('change', seekTo);

nowPlaying.querySelector('.curr-track').addEventListener('click', openPlayer);
exitBtn.addEventListener('click', exitPlayer);
search.addEventListener('keyup', searchSongs);

theme.addEventListener('click', toggleTheme);

if (localStorage.getItem('theme')) {
  let theme = localStorage.getItem('theme');
  if (theme == 'dark') setDarkTheme();
  else setLightTheme();
} else {
  setLightTheme();
}

if (!songList.childElementCount) {
  document.querySelector('.songs-default').classList.remove('hide');
}

button.addEventListener('click', function () {
  hiddenInput.click();
});

hiddenInput.addEventListener('change', function () {
  console.log(hiddenInput.files);

  if (hiddenInput.files.length > 0) {
    // no songs added yet
    if (!songList.childElementCount) {
      document.querySelector('.songs-default').classList.add('hide');
    }
    updateDB(Array.from(hiddenInput.files));
  }
});

function updateDB(inputFiles) {
  inputFiles.forEach(function (file, idx) {
    let txn = db.transaction('Songs', 'readwrite');
    let songStore = txn.objectStore('Songs');
    songStore.add({ file: file, sid: allFiles.length + idx + 1 });
    txn.onerror = function (e) {
      console.log('txn failed !!');
      console.log(e);
    };

    updateFiles();
  });
}

function updateFiles() {
  let txn = db.transaction('Songs', 'readonly');
  let songStore = txn.objectStore('Songs');

  let cursorObject = songStore.openCursor();

  cursorObject.onsuccess = function (e) {
    let cursor = cursorObject.result;
    if (cursor) {
      // no songs added yet
      if (!songList.childElementCount) {
        document.querySelector('.songs-default').classList.add('hide');
      }

      let song = cursor.value;
      // console.log(song);
      let exists = false;
      allFiles.forEach(function (file) {
        if (file.name == song.file.name) {
          exists = true;
          return;
        }
      });
      if (!exists) {
        // add
        allFiles.push(song.file);
        updateSongs(song.file, cursor.key);
      }
      cursor.continue();
    }
  };
}

function updateSongs(file, key) {
  let songDiv = document.createElement('div');
  songDiv.classList.add('song');
  songDiv.classList.add(`song-${key}`);

  let songName = document.createElement('p');
  songName.innerText = file.name;

  let playIcon = document.createElement('i');
  playIcon.classList.add('far');
  playIcon.classList.add('fa-play-circle');

  let deleteIcon = document.createElement('i');
  deleteIcon.classList.add('fas');
  deleteIcon.classList.add('fa-trash-alt');

  playIcon.addEventListener('click', function (e) {
    playPauseSong(e.target, file, key);
  });

  deleteIcon.addEventListener('click', function (e) {
    deleteSong(e.target, file, key);
  });

  let optionsDiv = document.createElement('div');
  optionsDiv.classList.add('options');
  optionsDiv.append(playIcon);
  optionsDiv.append(deleteIcon);

  songDiv.append(songName);
  songDiv.append(optionsDiv);

  songList.append(songDiv);
}

function deleteSong(listBtn, file, key) {
  console.log('in delete function');
  let txn = db.transaction('Songs', 'readwrite');
  let songStore = txn.objectStore('Songs');
  songStore.clear();

  allFiles = allFiles.filter(function (file, idx) {
    return idx + 1 != key;
  });

  let playAgain = false;
  if (isPlaying) {
    pauseMusic();
    playAgain = true;
  }

  deleteUpdates(key);

  // atleast one song played yet and same song
  if (!nowPlaying.classList.contains('hide') && currTrack.id == key) {
    nowPlaying.classList.add('hide');
    return;
  }

  if (currTrack.id < key) return;

  let newKey = Number(currTrack.id) - 1;
  currTrack.id = newKey;
  currTrack.src = URL.createObjectURL(allFiles[newKey - 1]);
  if (playAgain) playMusic();
}
function deleteUpdates(key) {
  songList.innerHTML = '';

  allFiles.forEach(function (file, idx) {
    let trans = db.transaction('Songs', 'readwrite');
    let songStore = trans.objectStore('Songs');
    songStore.add({ file: file, sid: idx + 1 });
    updateSongs(file, idx + 1);

    trans.onerror = function (e) {
      console.log('txn failed !!');
      console.log(e);
    };
  });

  if (songList.innerHTML == '')
    document.querySelector('.songs-default').classList.remove('hide');
}

function playPauseSong(listBtn, file, key) {
  // no song playing
  if (!isPlaying) {
    currTrack.src = URL.createObjectURL(file);
    currTrack.id = key;

    playMusic(); // resume for same song?

    // if first time
    if (nowPlaying.classList.contains('hide')) {
      nowPlaying.classList.remove('hide');
      loadTrack(currTrack.id);
    }
    openPlayer();
  } else {
    // already playing

    // same song -> pause
    if (currTrack.id == key) {
      pauseMusic();
    } else {
      // pause other first, then play new
      pauseMusic();
      currTrack.src = URL.createObjectURL(file);
      currTrack.id = key;
      playMusic();
      openPlayer();
    }
  }
}

playBtn.addEventListener('click', function (e) {
  if (isPlaying) pauseMusic();
  else playMusic();
});

function pauseMusic() {
  currTrack.pause();
  nowPlaying
    .querySelector('.fa-pause-circle')
    .classList.replace('fa-pause-circle', 'fa-play-circle');
  let prevItem = document.querySelector(`.song-${currTrack.id}`);
  prevItem
    .querySelector('.fa-pause-circle')
    .classList.replace('fa-pause-circle', 'fa-play-circle');
  isPlaying = false;
}
function playMusic() {
  currTrack.play();
  let listItem = document.querySelector(`.song-${currTrack.id}`);
  listItem
    .querySelector('.fa-play-circle')
    .classList.replace('fa-play-circle', 'fa-pause-circle');
  nowPlaying
    .querySelector('.fa-play-circle')
    .classList.replace('fa-play-circle', 'fa-pause-circle');

  nowPlaying.querySelector('.curr-track-name').innerText = listItem
    .querySelector('p')
    .innerText.split('.')[0];

  isPlaying = true;

  if (nowPlaying.classList.contains('big-player')) {
    makeWaveform();
  }
}

function playNext() {
  if (!currTrack) return;

  let id = Number(currTrack.id);
  if (currTrack.id == allFiles.length) return;

  if (isPlaying) pauseMusic();
  console.log(`playing ${id}, next up ${id + 1} `);

  let nextSong = allFiles[id];
  currTrack.id = id + 1;
  currTrack.src = URL.createObjectURL(nextSong);
  loadTrack(currTrack.id);
  playMusic();
}

function playPrev() {
  if (!currTrack) return;

  let id = Number(currTrack.id);
  if (currTrack.id == 1) return;

  console.log(`playing ${id}, next up ${id - 1} `);

  if (isPlaying) pauseMusic();
  let prevSong = allFiles[id - 2];
  currTrack.id = id - 1;
  currTrack.src = URL.createObjectURL(prevSong);
  loadTrack(currTrack.id);
  playMusic();
}

function openPlayer(e) {
  nowPlaying.classList.add('big-player');
  document.querySelectorAll('.player').forEach(function (element) {
    element.classList.remove('hide');
  });
  menu.classList.add('hide');
  search.classList.add('hide');
  songs.classList.add('hide');
  document.querySelector('.curr-track-name').style.cursor = 'default';
  progressBar.classList.add('hide');
  document.querySelector('.small-player').classList.remove('grid-show');

  if (isPlaying) makeWaveform();
}

function exitPlayer(e) {
  nowPlaying.classList.remove('big-player');
  document.querySelectorAll('.player').forEach(function (element) {
    element.classList.add('hide');
  });
  menu.classList.remove('hide');
  search.classList.remove('hide');
  songs.classList.remove('hide');
  document.querySelector('.curr-track-name').style.cursor = 'pointer';
  progressBar.classList.remove('hide');
  document.querySelector('.small-player').classList.add('grid-show');
}

function loadTrack() {
  clearInterval(interval);
  seekSlider.value = 0;

  interval = setInterval(function () {
    seekSlider.value = currTrack.currentTime * (100 / currTrack.duration);
    let progressWidth =
      currTrack.currentTime * (progressBar.clientWidth / currTrack.duration);
    progressWidth = Number(progressWidth);
    progress.style.width = `${progressWidth}px`;

    updateTimeStamps();
  }, 1000);
}
function updateTimeStamps() {
  let currMin = Math.floor(currTrack.currentTime / 60);
  let currSec = Math.floor(currTrack.currentTime - currMin * 60);
  let totalMin = Math.floor(currTrack.duration / 60);
  let totalSec = Math.floor(currTrack.duration - totalMin * 60);

  if (currSec < 10) {
    currSec = '0' + currSec;
  }
  if (totalSec < 10) {
    totalSec = '0' + totalSec;
  }
  if (currMin < 10) {
    currMin = '0' + currMin;
  }
  if (totalMin < 10) {
    totalMin = '0' + totalMin;
  }

  currTimeStamp.textContent = currMin + ':' + currSec;
  totalTimeStamp.textContent = totalMin + ':' + totalSec;
}
function seekTo() {
  let till = seekSlider.value;
  let timeStamp = currTrack.duration * (till / 100);
  currTrack.currentTime = timeStamp;
  progress.style.width = progressBar.style.width * (till / 100);
}

function makeWaveform() {
  // waveform
  let context = new AudioContext();
  let analyser = context.createAnalyser();

  let src = context.createMediaElementSource(currTrack);
  src.connect(analyser);
  analyser.connect(context.destination);

  analyser.fftSize = 2048;
  let bufferLength = analyser.frequencyBinCount;
  console.log(bufferLength);
  let dataArray = new Uint8Array(bufferLength);
  console.log(dataArray);

  // canvas = document.querySelector('#canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  let ctx = canvas.getContext('2d');
  let WIDTH = canvas.width;
  let HEIGHT = canvas.height;
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  function draw() {
    let drawVisual = requestAnimationFrame(draw); // to loop again and again
    analyser.getByteTimeDomainData(dataArray);

    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    let gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    gradient.addColorStop('0', '#009fff');
    gradient.addColorStop('1.0', '#ec2f4b');

    ctx.lineWidth = 4;
    // ctx.strokeStyle = 'rgb(0, 0, 0)';
    ctx.strokeStyle = gradient;
    ctx.beginPath();

    let sliceWidth = (WIDTH * 1.0) / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      let v = dataArray[i] / 128.0;
      let y = (v * HEIGHT) / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
  }

  draw();
}

function searchSongs(e) {
  let query = e.target.value.toLowerCase();

  let allSongs = Array.from(songList.children);

  allSongs.forEach(function (songDiv) {
    let name = songDiv.innerText.toLowerCase();
    if (name.includes(query)) {
      if (songDiv.classList.contains('hide')) songDiv.classList.remove('hide');
    } else {
      if (!songDiv.classList.contains('hide')) songDiv.classList.add('hide');
    }
  });
}

function toggleTheme() {
  if (body.classList.contains('light-theme')) {
    body.classList.remove('light-theme');
    setDarkTheme();
  } else {
    body.classList.remove('dark-theme');
    setLightTheme();
  }
}
function setDarkTheme() {
  localStorage.setItem('theme', 'dark');
  body.classList.add('dark-theme');
  document.querySelector('.fa-sun').classList.add('hide');
  document.querySelector('.fa-moon').classList.remove('hide');
}

function setLightTheme() {
  localStorage.setItem('theme', 'light');
  body.classList.add('light-theme');
  document.querySelector('.fa-sun').classList.remove('hide');
  document.querySelector('.fa-moon').classList.add('hide');
}
