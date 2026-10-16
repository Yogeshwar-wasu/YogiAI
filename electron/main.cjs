const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  ipcMain,
  nativeImage,
  screen,
} = require("electron");

const path = require("node:path");
const fs = require("node:fs");

const isDev = !app.isPackaged;

let mainWindow;
let characterWindow;
let tray;
let scheduler;
let quitting = false;
let reminders = [];

const dataFile = path.join(app.getPath("userData"), "reminders.json");

function saveData() {
  fs.mkdirSync(path.dirname(dataFile), {
    recursive: true,
  });

  const tempFile = `${dataFile}.tmp`;

  fs.writeFileSync(tempFile, JSON.stringify(reminders, null, 2), "utf8");

  fs.renameSync(tempFile, dataFile);
}

function loadData() {
  try {
    reminders = JSON.parse(fs.readFileSync(dataFile, "utf8"));

    if (!Array.isArray(reminders)) {
      reminders = [];
    }
  } catch {
    reminders = [];
    saveData();
  }
}

function sendReminderList() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("reminders:changed", reminders);
  }
}

function nextOccurrence(reminder) {
  const next = new Date(reminder.dueAt);

  if (reminder.repeat === "daily") {
    next.setDate(next.getDate() + 1);
    return next.toISOString();
  }

  if (reminder.repeat === "weekly") {
    next.setDate(next.getDate() + 7);
    return next.toISOString();
  }

  return null;
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 850,
    minWidth: 760,
    minHeight: 650,
    backgroundColor: "#fafaff",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL("http://127.0.0.1:4200");
  } else {
    mainWindow.loadFile(
      path.join(__dirname, "../frontend/dist/frontend/browser/index.html"),
    );
  }

  // Closing the dashboard hides it. The reminder engine continues.
  mainWindow.on("close", (event) => {
    if (!quitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function createCharacterWindow() {
  if (characterWindow && !characterWindow.isDestroyed()) {
    return;
  }

  const area = screen.getPrimaryDisplay().workArea;

  characterWindow = new BrowserWindow({
    width: 320,
    height: 540,
    x: area.x + 12,
y: area.y + area.height - 540 -12,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, "character-preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  characterWindow.loadFile(path.join(__dirname, "character.html"));

  characterWindow.on("closed", () => {
    characterWindow = null;
  });
}

let characterMoveTimer = null;

function slideCharacterTo(side) {
  if (!characterWindow || characterWindow.isDestroyed()) return;

  if (characterMoveTimer) {
    clearInterval(characterMoveTimer);
    characterMoveTimer = null;
  }

  const area = screen.getPrimaryDisplay().workArea;
  const bounds = characterWindow.getBounds();

  const targetX =
    side === "right" ? area.x + area.width - bounds.width - 12 : area.x + 12;

  const targetY = area.y + Math.round((area.height - bounds.height) / 2);

  const startX = bounds.x;
  const startY = bounds.y;
  const startedAt = Date.now();
  const duration = 3000;

  characterMoveTimer = setInterval(() => {
    if (!characterWindow || characterWindow.isDestroyed()) {
      clearInterval(characterMoveTimer);
      characterMoveTimer = null;
      return;
    }

    const progress = Math.min((Date.now() - startedAt) / duration, 2);

     const eased =
      progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

    const x = Math.round(startX + (targetX - startX) * eased);
    const y = Math.round(startY + (targetY - startY) * eased);

    characterWindow.setPosition(x, y);


     if (progress >= 1) {
      clearInterval(characterMoveTimer);
      characterMoveTimer = null;

      // Hide only after the movement animation finishes.
      if (characterWindow && !characterWindow.isDestroyed()) {
        characterWindow.hide();
      }
    }
  }, 16);
}

function showCharacter(reminder, demo = false) {
  createCharacterWindow();

  const send = () => {
    if (!characterWindow || characterWindow.isDestroyed()) return;

    if (characterMoveTimer) {
      clearInterval(characterMoveTimer);
      characterMoveTimer = null;
    }

    const area = screen.getPrimaryDisplay().workArea;
    const bounds = characterWindow.getBounds();

    // Every new reminder starts on the left.
    characterWindow.setPosition(
      area.x + 12,
      area.y + Math.round((area.height - bounds.height) / 2),
    );

    characterWindow.showInactive();

    characterWindow.webContents.send(
      demo ? "character:demo" : "character:reminder",
      reminder || {},
    );

    if (characterWindow.hideTimer) {
      clearTimeout(characterWindow.hideTimer);
    }

    characterWindow.hideTimer = setTimeout(() => {
      if (characterWindow && !characterWindow.isDestroyed()) {
        characterWindow.hide();
      }
    }, 45000);
  };

  if (characterWindow.webContents.isLoading()) {
    characterWindow.webContents.once("did-finish-load", send);
  } else {
    send();
  }
}

function completeReminder(id) {
  const reminder = reminders.find((item) => item.id === id);

  if (!reminder) return;

  reminder.status = "completed";
  reminder.lastFiredAt = new Date().toISOString();

  saveData();
  sendReminderList();
}

function snoozeReminder(id, minutes = 5) {
  const reminder = reminders.find((item) => item.id === id);

  if (!reminder) return;

  reminder.status = "pending";
  reminder.dueAt = new Date(
    Date.now() + Math.min(Math.max(minutes, 1), 120) * 60000,
  ).toISOString();

  saveData();
  sendReminderList();
}

function fireReminder(reminder) {
  showCharacter(reminder);

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("reminder:due", reminder);
  }

  reminder.lastFiredAt = new Date().toISOString();

  if (reminder.repeat === "daily" || reminder.repeat === "weekly") {
    reminder.dueAt = nextOccurrence(reminder);
  } else {
    reminder.status = "completed";
  }

  saveData();
  sendReminderList();
}

function checkDueReminders() {
  const now = Date.now();

  const dueItems = reminders.filter(
    (item) =>
      item.status === "pending" && new Date(item.dueAt).getTime() <= now,
  );

  for (const item of dueItems) {
    fireReminder(item);
  }
}

function createTray() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg"
         width="32" height="32" viewBox="0 0 32 32">
      <rect width="32" height="32" rx="9" fill="#7665ee"/>
      <text x="16" y="23" font-size="22"
            text-anchor="middle" fill="white"
            font-family="Arial" font-weight="bold">B</text>
    </svg>`;

  const icon = nativeImage.createFromDataURL(
    "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64"),
  );

  tray = new Tray(icon);
  tray.setToolTip("YogiAI Reminders");

  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: "Open YogiAI",
        click: () => {
          if (!mainWindow) createMainWindow();
          mainWindow.show();
          mainWindow.focus();
        },
      },
      {
        label: "Preview Buddy",
        click: () => showCharacter(null, true),
      },
      { type: "separator" },
      {
        label: "Quit YogiAI",
        click: () => {
          quitting = true;
          app.quit();
        },
      },
    ]),
  );

  tray.on("double-click", () => {
    if (!mainWindow) createMainWindow();
    mainWindow.show();
  });
}

function registerIpc() {
  ipcMain.handle("reminders:list", () => reminders);

  ipcMain.handle("reminders:save", (_event, input) => {
    const title = String(input?.title || "").trim();
    const due = new Date(input?.dueAt);

    if (!title || Number.isNaN(due.getTime())) {
      throw new Error("A task title and valid date are required.");
    }

    if (!["none", "daily", "weekly"].includes(input.repeat)) {
      input.repeat = "none";
    }

    const reminder = {
      id: String(input.id || Date.now()),
      type: String(input.type || ""),
      title: title.slice(0, 120),
      notes: String(input.notes || "").slice(0, 500),
      dueAt: due.toISOString(),
      repeat: input.repeat,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    reminders.push(reminder);
    saveData();
    sendReminderList();

    return reminders;
  });

  ipcMain.handle("reminders:delete", (_event, id) => {
    reminders = reminders.filter((item) => item.id !== id);
    saveData();
    sendReminderList();
    return reminders;
  });

  ipcMain.handle("reminders:complete", (_event, id) => {
    completeReminder(id);
    return reminders;
  });

  ipcMain.handle("reminders:snooze", (_event, id, minutes) => {
    snoozeReminder(id, minutes);
    return reminders;
  });

  ipcMain.handle("character:demo", () => {
    showCharacter(null, true);
  });

  ipcMain.handle("character:hide", () => {
    if (characterWindow && !characterWindow.isDestroyed()) {
      characterWindow.hide();
    }
  });

  ipcMain.on("character:complete", (_event, id) => {
    completeReminder(id);
  });

  ipcMain.on("character:snooze", (_event, id, minutes) => {
    snoozeReminder(id, minutes);
  });

  ipcMain.on("character:close", () => {
    if (characterWindow && !characterWindow.isDestroyed()) {
      characterWindow.hide();
    }
  });

  
ipcMain.on("character:answer", (_event, data) => {
  if (!data || !["yes", "no"].includes(data.answer)) return;

  const { answer, reminderId } = data;

  // Stop the automatic hide timer while the animation runs.
  if (characterWindow?.hideTimer) {
    clearTimeout(characterWindow.hideTimer);
    characterWindow.hideTimer = null;
  }

  if (answer === "yes") {
    if (reminderId) {
      completeReminder(reminderId);
    }

    // Play happy animation.
    if (characterWindow && !characterWindow.isDestroyed()) {
      characterWindow.webContents.send("character:mood", "happy");
    }

    // Move right, then hide.
    slideCharacterTo("right");
    return;
  }

  // NO clicked: snooze one-time reminders for 10 minutes.
  const reminder = reminders.find(
    (item) => item.id === reminderId,
  );

  if (reminder && reminder.repeat === "none") {
    snoozeReminder(reminderId, 10);
  }

  // Play sad animation.
  if (characterWindow && !characterWindow.isDestroyed()) {
    characterWindow.webContents.send("character:mood", "sad");
  }

  // Move left, then hide.
  slideCharacterTo("left");
});

}

app.whenReady().then(() => {
  loadData();
  registerIpc();
  createMainWindow();
  createTray();

  scheduler = setInterval(checkDueReminders, 10000);

  // Surface overdue reminders after launching YogiAI.
  setTimeout(checkDueReminders, 1000);
});

app.on("before-quit", () => {
  quitting = true;
  if (scheduler) clearInterval(scheduler);
});

app.on("window-all-closed", () => {
  // Keep the reminder scheduler alive in the system tray.
});
