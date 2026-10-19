<img width="1354" height="1173" alt="UI" src="https://github.com/user-attachments/assets/8a732842-460e-4285-91d3-95d3307a4696" />

# YogiAI – Smart Desktop Reminder App

YogiAI is a desktop productivity application developed using Angular and Electron. It combines task and reminder management with an interactive virtual buddy to make daily routines more organized, engaging, and enjoyable.

## Features

- **Task Management:** Create and manage reminders for meetings, tasks, emails, documentation, and report preparation.
- **Daily Habit Reminders:** Set reminders for drinking water and taking breaks.
- **Reminder Scheduling:** Schedule reminders for specific dates and times.
- **Recurring Reminders:** Configure repeating reminders using supported repeat rules.
- **Task Tracking:** Organize reminders by all, pending, and completed status.
- **Interactive Buddy:** Use expressive buddy animations to create a more engaging reminder experience.
- **Desktop Application:** Run the application as a desktop app powered by Electron.
- **Windows Installer:** Package the application using Electron Builder with an NSIS installer that allows users to choose the installation directory.

## Tech Stack

- **Frontend:** Angular, TypeScript, HTML5, CSS3
- **Desktop Framework:** Electron
- **Build and Packaging:** Electron Builder
- **Development Tools:** npm, Concurrently, Wait-on

## Getting Started

### Prerequisites

- Node.js and npm
- Git

### Installation

Clone the repository:

```bash
git clone <your-repository-url>
cd YogiAI
```

Install the root dependencies:

```bash
npm install
```

Install the frontend dependencies:

```bash
cd frontend
npm install
cd ..
```

### Run in Development Mode

```bash
npm run dev
```

This starts the Angular development server and launches Electron after the frontend becomes available.

### Build the Angular Frontend

```bash
npm run build:angular
```

### Package the Desktop Application

```bash
npm run dist
```

The packaged application and installer are configured to be generated in the `release` directory.

## Project Goal

YogiAI aims to make daily productivity and healthy habits easier to maintain through convenient reminders, desktop integration, and an interactive virtual buddy.

## License

Add a license file if you intend to distribute this project as open source.
