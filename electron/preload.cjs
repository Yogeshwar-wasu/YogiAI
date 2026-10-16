const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("buddy", {
  listReminders: () =>
    ipcRenderer.invoke("reminders:list"),

  saveReminder: (reminder) =>
    ipcRenderer.invoke("reminders:save", reminder),

  deleteReminder: (id) =>
    ipcRenderer.invoke("reminders:delete", id),

  completeReminder: (id) =>
    ipcRenderer.invoke("reminders:complete", id),

  snoozeReminder: (id, minutes) =>
    ipcRenderer.invoke("reminders:snooze", id, minutes),

  openCharacterDemo: () =>
    ipcRenderer.invoke("character:demo"),

  hideCharacter: () =>
    ipcRenderer.invoke("character:hide"),

  onReminderDue: (callback) => {
    const listener = (_event, reminder) => callback(reminder);

    ipcRenderer.on("reminder:due", listener);

    return () => {
      ipcRenderer.removeListener("reminder:due", listener);
    };
  }
});