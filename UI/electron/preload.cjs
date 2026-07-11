const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('wallwize', {
  platform: process.platform,
  getState: () => ipcRenderer.invoke('wallwize:get-state'),
  chooseFolder: (kind) => ipcRenderer.invoke('wallwize:choose-folder', kind),
  updateSettings: (settings) => ipcRenderer.invoke('wallwize:update-settings', settings),
  scan: () => ipcRenderer.invoke('wallwize:scan'),
  plan: () => ipcRenderer.invoke('wallwize:plan'),
  apply: () => ipcRenderer.invoke('wallwize:apply'),
  openPath: (path) => ipcRenderer.invoke('wallwize:open-path', path),
  getThumbnail: (path, fallbackPath, thumbnailKey) =>
    ipcRenderer.invoke('wallwize:get-thumbnail', path, fallbackPath, thumbnailKey),
  setDesktopWallpaper: (path, fallbackPath) =>
    ipcRenderer.invoke('wallwize:set-desktop-wallpaper', path, fallbackPath),
  approveWallpaper: (path, fallbackPath, destination, operation) =>
    ipcRenderer.invoke('wallwize:approve-wallpaper', path, fallbackPath, destination, operation),
  approveWallpapers: (paths) => ipcRenderer.invoke('wallwize:approve-wallpapers', paths),
  addCategory: (categoryName) => ipcRenderer.invoke('wallwize:add-category', categoryName),
  assignCategory: (paths, categoryName) =>
    ipcRenderer.invoke('wallwize:assign-category', paths, categoryName),
  ignoreWallpapers: (paths) => ipcRenderer.invoke('wallwize:ignore-wallpapers', paths),
  retargetPlan: () => ipcRenderer.invoke('wallwize:retarget-plan'),
  windowCommand: (command) => ipcRenderer.invoke('wallwize:window-command', command),
});
