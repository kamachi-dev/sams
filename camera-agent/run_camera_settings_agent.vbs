Option Explicit

Dim shell, fileSystem, agentDirectory, batchFile
Set shell = CreateObject("WScript.Shell")
Set fileSystem = CreateObject("Scripting.FileSystemObject")

agentDirectory = fileSystem.GetParentFolderName(WScript.ScriptFullName)
batchFile = fileSystem.BuildPath(agentDirectory, "run_camera_settings_agent.bat")
shell.CurrentDirectory = agentDirectory
shell.Run "cmd.exe /c """ & batchFile & """", 0, False
