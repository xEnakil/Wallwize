on run argv
  if (count of argv) is 0 then error "Wallpaper path was not provided."

  set wallpaperPathText to item 1 of argv
  set wallpaperFile to POSIX file wallpaperPathText

  tell application "System Events"
    repeat with currentDesktop in desktops
      set picture of currentDesktop to wallpaperFile
    end repeat
  end tell

  return "Desktop wallpaper applied: " & wallpaperPathText
end run
