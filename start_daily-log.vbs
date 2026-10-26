Set ws = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Set working directory to the project root where this script is located
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
ws.CurrentDirectory = currentDir

' Start daily-log production server in hidden window (0)
ws.Run "cmd /c npm run start", 0, False
