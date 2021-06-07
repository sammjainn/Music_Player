let db;
let allFiles = [];

let dbOpenRequest = indexedDB.open('Library', 1);

dbOpenRequest.onupgradeneeded = function (e) {
  db = e.target.result;
  // alert('in upgrade event');
  // db.createObjectStore('Songs', { keyPath: 'sid', autoIncrement: true });
  db.createObjectStore('Songs', { keyPath: 'sid' });
};

dbOpenRequest.onsuccess = function (e) {
  db = e.target.result;
  // alert('in success event');

  db.onversionchange = function (e) {
    // alert('Version Changed !!');
    db.close();
    console.log(e);
  };

  // first time or refresh
  allFiles = [];
  document.querySelector('.songs-list').innerHTML = '';
  updateFiles();
};

dbOpenRequest.onerror = function (e) {
  // alert('Inside on error event !!');
  console.log(e);
};
