import document from "document";
import * as messaging from "messaging";
import clock from "clock";
import { vibration } from "haptics";
import { display } from "display";
display.autoOff = false;
import { me } from "appbit";

// arc colors, in order of appearance
const COLORS = [
  'fb-indigo', 
  'fb-mint', 
  'fb-cerulean',
  'fb-peach',
  'fb-slate',
  'fb-yellow'
];
const VIBRATE_STYLE = 'alert';


const alertVibrate = () => {
  vibration.start(VIBRATE_STYLE);
  setTimeout(() => vibration.stop(), 6000);
}

const currentElem1 = document.getElementById("current1");
const currentElem2 = document.getElementById("current2");
const currentTimeElem = document.getElementById("currentTime")
const currentArc = document.getElementById("currentArc");
const nextElem = document.getElementById("next");
const pausePlayElem = document.getElementById("pausePlay");

let settings = {
  tasklist: []
}
let started = false;
let paused = false;
let activeIdx = -1;
let taskColor = 0;

const clear = () => {
  started = false;
  paused = false;
  for (var task of settings.tasklist) {
    task.progress = 0;
    task.active = false;
  }
  activeIdx = -1;
  refreshPausePlayIcons();
}

const reset = () => {
  // clear and then restart the timers
  clear();
  activeIdx = 0;
  started = true;
  refreshPausePlayIcons();
}

const refreshPausePlayIcons = () => {
  let icon = btnPlayPause.getElementById("combo-button-icon");
  let icon_press = btnPlayPause.getElementById("combo-button-icon-press");
  
  if (started) {
    icon.image = "btn_combo_pause_p.png"
    icon_press.image = "btn_combo_pause_press_p.png"
  }
  else {
    icon.image = "play_p.png"
    icon_press.image = "play_press_p.png"  
  }
}

const pauseOrPlay = () => {
  if (activeIdx >= 0) {
    paused = !paused; 
    started = !paused; 
    if (started) {
      vibration.start('nudge-max');
    }
  }
  else {
    reset();
  }
  refreshPausePlayIcons();
}

const next = () => {
  activeIdx++;
  refreshPausePlayIcons();
}

function digestStateToUI () {
  // main UI
  const showIdx = activeIdx === -1 ? 0 : activeIdx;
  const activeTask = settings.tasklist[showIdx];
  const taskColor = COLORS[(showIdx || 0) % COLORS.length] || COLORS[0];
  if (activeTask) {
    const activeTaskLines = splitTextToLength(activeTask.name, 12);
    currentElem1.text = activeTaskLines[0];
    currentElem2.text = activeTaskLines[1];
    currentElem1.style.color = taskColor;
    currentElem2.style.color = taskColor;
    const nextTask = settings.tasklist[showIdx+1];
    if(nextTask) {
      nextElem.text = `${nextTask.name} (${nextTask.minutes}m)`;
    }
    else {
      nextElem.text = ""
    }
    const secsLeft = activeTask.minutes * 60 - activeTask.progress;
    currentArc.sweepAngle = 360 * (secsLeft / (activeTask.minutes * 60));
    currentTimeElem.text = Math.floor(secsLeft / 60) + ":" + (secsLeft % 60 ? `${secsLeft % 60}`.padStart(2, '0') : '00');
  }
  
  // reset/skip icons
  btnNext.disabled = !started;
  btnReset.disabled = !started;
  
  // task color
  if (currentArc && currentArc.style)
    currentArc.style.fill = taskColor;
}

clock.granularity = "seconds";
clock.ontick = (evt) => {
  // advance task by one second
  const activeTask = settings.tasklist[activeIdx];
  if (activeTask && started) {
    const secsLeft = activeTask.minutes * 60 - activeTask.progress;
    activeTask.progress++;
    if (secsLeft <= 0) {
      activeIdx++;
      alertVibrate();
    }
  }
 
  digestStateToUI();
 }

let btnPlayPause = document.getElementById("btn-tr");
btnPlayPause.onactivate = function(evt) {
  pauseOrPlay();
}

let btnExit = document.getElementById("btn-tl");
btnExit.onactivate = function(evt) {
  me.exit();
}

let btnNext = document.getElementById("btn-br");
btnNext.onactivate = function(evt) {
  alertVibrate();
  next();
}

let btnReset =  document.getElementById("btn-bl");
btnReset.onactivate = function(evt) {
  reset();
}

function processData(data) {
  // updates a task's duration or the tasklist
  const tasklist = data.tasklist;
  const duration = data.duration;
  if (tasklist) {
    const newTasklist = [];
    for (var itemData of tasklist) {
      let taskToAdd;
      for (var task of settings.tasklist) {
        if (task.name === itemData.name) {
          taskToAdd = task;
        }
      }
      if (!taskToAdd) {
        taskToAdd = {
          name: itemData.name,
          minutes: 1
        };
      }
      newTasklist.push(taskToAdd)
    }
    settings.tasklist = newTasklist;
  }
  else if (duration) {
    const foundTaskToUpdate = false;
    for (var task of settings.tasklist) {
      if (duration.key.slice(4) === task.name && duration.newValue.selected) {
        task.minutes = duration.newValue.values[0].name;
        foundTaskToUpdate = true;
      }
    }
    if (!foundTaskToUpdate) {
      settings.tasklist.push({
          name: duration.key.slice(4),
          minutes: duration.newValue.values[0].name
      });
    }
  }
}

// Message is received
messaging.peerSocket.onmessage = evt => {
  clear();
  if (evt.data.key === "tasklist" && evt.data.newValue) {
    let tasklist = JSON.parse(evt.data.newValue);
    processData({tasklist: tasklist});
  }
  else if (evt.data.key.indexOf('dur_') > -1 && evt.data.newValue) {
    let durationVal = JSON.parse(evt.data.newValue);
    processData({duration: {key: evt.data.key, newValue: durationVal}});
  }
  clear();
};

// Message socket opens
messaging.peerSocket.onopen = () => {
  console.log("App Socket Open");
};

// Message socket closes
messaging.peerSocket.onclose = () => {
  console.log("App Socket Closed");
};

// https://github.com/uxitten/polyfill/blob/master/string.polyfill.js
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padStart
if (!String.prototype.padStart) {
    String.prototype.padStart = function padStart(targetLength, padString) {
        targetLength = targetLength >> 0; //truncate if number, or convert non-number to 0;
        padString = String(typeof padString !== 'undefined' ? padString : ' ');
        if (this.length >= targetLength) {
            return String(this);
        } else {
            targetLength = targetLength - this.length;
            if (targetLength > padString.length) {
                padString += padString.repeat(targetLength / padString.length); //append to original to ensure we are longer than needed
            }
            return padString.slice(0, targetLength) + String(this);
        }
    };
}

function jsn(s, o) {
  console.log(s, JSON.stringify(o))
}

function splitTextToLength(s, len) {
  const tokens = s.split(' ');
  let out1 = '';
  let out2 = '';
  for (var t of tokens) {
    if (out1.length < len) {
      out1 += t + ' '
    }
    else {
      out2 += t + ' '
    }
  }
  return [out1.trim(), out2.trim()];
}