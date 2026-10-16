
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('characterApi', {
  onReminder: (callback) => {
    const listener = (_event, reminder) => callback(reminder);
    ipcRenderer.on('character:reminder', listener);
    return () => ipcRenderer.removeListener('character:reminder', listener);
  },

  onDemo: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('character:demo', listener);
    return () => ipcRenderer.removeListener('character:demo', listener);
  },

  onMood: (callback) => {
    const listener = (_event, mood) => callback(mood);
    ipcRenderer.on('character:mood', listener);
    return () => ipcRenderer.removeListener('character:mood', listener);
  },

  answer: (answer, reminderId) => {
    ipcRenderer.send('character:answer', { answer, reminderId });
  },

  close: () => ipcRenderer.send('character:close')
});
