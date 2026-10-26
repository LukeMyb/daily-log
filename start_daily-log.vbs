Set ws = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' スクリプトが置かれているプロジェクトのフォルダパスを取得してカレントディレクトリに設定
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
ws.CurrentDirectory = currentDir

' daily-log (Next.js 本番サーバー) の起動
' package.json の start スクリプト経由で .env の HOST / PORT を読み込み、非表示(0)で実行
ws.Run "cmd /c npm run start", 0, False
