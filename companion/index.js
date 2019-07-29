import * as messaging from "messaging";
import { settingsStorage } from "settings";

// Message socket opens
messaging.peerSocket.onopen = () => {
  console.log("Companion Socket Open");
  restoreSettings();
};

// Message socket closes
messaging.peerSocket.onclose = () => {
  console.log("Companion Socket Closed");
};

function removeInvalidSettings () {
  for (let index = 0; index < settingsStorage.length; index++) {
    let storedSetting = settingsStorage.key(index);
    if (storedSetting.slice(0, 4) !== 'dur_' && storedSetting !== "tasklist") {
      settingsStorage.removeItem(storedSetting);
    }
  }
}

function removeFormerTasklistDurations (newTaskNameSet) {
  for (let index = 0; index < settingsStorage.length; index++) {
    let storedSetting = settingsStorage.key(index);
    if (storedSetting.slice(0, 4) === 'dur_') {
      if(!newTaskNameSet.includes(storedSetting.slice(4))) {
        settingsStorage.removeItem(storedSetting);
      }
    }
  }
}

// A user changes settings
settingsStorage.onchange = evt => {
  removeInvalidSettings();
  if (evt.key === 'tasklist') {
    const incomingTasklist = JSON.parse(evt.newValue);
    const taskNames = [];
    for (var t of incomingTasklist) {
      taskNames.push(t.name);
    }
    removeFormerTasklistDurations(taskNames);
    // const tasklistSetting = settingsStorage.getItem("tasklist");
    // for(var task of tasklistSetting) {
    //   let inNewTasklist = false;
    //   for (var newTask of JSON.parse(data.newValue)) {
    //     if (newTask.name === task.name) {
    //       inNewTasklist = true;
    //     }
    //   }
    //   if (!inNewTasklist) {
    //     settingsStorage.removeItem("dur_"+task.name);
    //   }
    // }
  }
  
  let data = {
    key: evt.key,
    newValue: evt.newValue
  };
  sendVal(data);
};

// Restore any previously saved settings and send to the device
function restoreSettings() {
  removeInvalidSettings();
  for (let index = 0; index < settingsStorage.length; index++) {
    let key = settingsStorage.key(index);
    if (key) {
      if (key === 'tasklist') {  
        const incomingTasklist = JSON.parse(settingsStorage.getItem(key));
        const taskNames = [];
        for (var t of incomingTasklist) {
          taskNames.push(t.name);
        }
        removeFormerTasklistDurations(taskNames);
      }
      let data = {
        key: key,
        newValue: settingsStorage.getItem(key)
      };
      sendVal(data);
    }
  }
}

// Send data to device using Messaging API
function sendVal(data) {
  if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
    messaging.peerSocket.send(data);
  }
}

// From https://github.com/latusinski/polyfill-array-includes/blob/master/array-includes.js
if (!Array.prototype.includes) {
  Object.defineProperty(Array.prototype, 'includes', {
    value: function (searchElement, fromIndex) {

      // 1. Let O be ? ToObject(this value).
      if (this == null) {
        throw new TypeError('"this" is null or not defined');
      }

      var o = Object(this);

      // 2. Let len be ? ToLength(? Get(O, "length")).
      var len = o.length >>> 0;

      // 3. If len is 0, return false.
      if (len === 0) {
        return false;
      }

      // 4. Let n be ? ToInteger(fromIndex).
      //    (If fromIndex is undefined, this step produces the value 0.)
      var n = fromIndex | 0;

      // 5. If n ≥ 0, then
      //  a. Let k be n.
      // 6. Else n < 0,
      //  a. Let k be len + n.
      //  b. If k < 0, let k be 0.
      var k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);

      function sameValueZero(x, y) {
        return x === y || (typeof x === 'number' && typeof y === 'number' && isNaN(x) && isNaN(y));
      }

      // 7. Repeat, while k < len
      while (k < len) {
        // a. Let elementK be the result of ? Get(O, ! ToString(k)).
        // b. If SameValueZero(searchElement, elementK) is true, return true.
        // c. Increase k by 1.
        if (sameValueZero(o[k], searchElement)) {
          return true;
        }
        k++;
      }

      // 8. Return false
      return false;
    }
  });
}
