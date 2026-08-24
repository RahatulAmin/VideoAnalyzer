# BehaviorLab Video Coder

A simple Windows app for watching videos and recording behavioral observations.

Your videos and observations stay on your computer. The app can save observation data to an Excel file.

## Download the Windows installer

[Download the Windows installer](./windows%20installer/BehaviorLab%20Video%20Coder_1.0.0_x64-setup.exe)

## Use the Windows app

1. Download and run the Windows installer.
2. Open **BehaviorLab Video Coder**.
3. Enter a project name and click **Choose setup**.
4. Select an existing analysis template or create a new one.
5. Choose a video.
6. Select the observed behavior and demographic information.
7. Click **Save observation**.
8. Export or synchronize the observations to Excel when needed.

## Keyboard shortcuts

- `Space`: Play or pause the video
- `Ctrl + S`: Save an observation
- `Left` / `Right`: Move 2 seconds
- `Shift + Left` / `Shift + Right`: Move 5 seconds

## Run from source

Install [Node.js](https://nodejs.org/), open a terminal in this folder, and run:

```powershell
npm install
npm run dev
```

Open the address shown in the terminal.

## Run the desktop version during development

Install Node.js, Rust, and the Visual Studio C++ Build Tools. Then run:

```powershell
npm install
npm run desktop:dev
```

## Build the Windows app

```powershell
npm run desktop:build
```

The finished installer will be copied to:

```text
windows installer/
```

The portable `.exe` will be created in:

```text
src-tauri/target/release/behaviorlab-video-coder.exe
```

## Run tests

```powershell
npm test
```
