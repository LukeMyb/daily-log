import ctypes
import math
import os
import shutil
import subprocess
import sys
import threading
import time
import webbrowser
from pathlib import Path

import psutil
import pystray
from dotenv import load_dotenv
from PIL import Image, ImageDraw

BASE_DIR = Path(__file__).resolve().parent
APP_DIR = BASE_DIR / "src" / "app"
PUBLIC_DIR = BASE_DIR / "public"
PYTHON_EXE = BASE_DIR / ".venv" / "Scripts" / "python.exe"

load_dotenv(BASE_DIR / ".env")
API_HOST = os.getenv("HOST", "127.0.0.1")
BROWSER_HOST = "127.0.0.1" if API_HOST in ("0.0.0.0", "") else API_HOST
WEB_PORT = int(os.getenv("PORT", 3647))
APP_SHORT_NAME = "DailyLog"
MUTEX_NAME = f"Local\\{APP_SHORT_NAME}_Tray_Manager_Mutex"

CREATE_NO_WINDOW = getattr(subprocess, "CREATE_NO_WINDOW", 0x08000000)


def acquire_single_instance_mutex():
    """多重起動を防止するためのWindows名前付きミューテックスを取得する"""
    if os.name != "nt":
        return None
    kernel32 = ctypes.windll.kernel32
    mutex = kernel32.CreateMutexW(None, False, MUTEX_NAME)
    if kernel32.GetLastError() == 183:  # ERROR_ALREADY_EXISTS
        return None
    return mutex


def _draw_rotated_polygon(
    draw: ImageDraw.ImageDraw,
    points: list[tuple[float, float]],
    fill: tuple[int, int, int, int],
    outline: tuple[int, int, int, int] | None = None,
    width: int = 1,
):
    draw.polygon(points, fill=fill, outline=outline, width=width)


def _render_base_artwork(
    canvas_size: int,
    is_running: bool = True,
    with_badge: bool = False,
    opaque_bg: bool = False,
) -> Image.Image:
    """
    指定解像度で日記帳＋しおりリボン＋万年筆モチーフのアイコンを描画する。
    """
    s = canvas_size / 64.0

    def sc(val: float) -> int:
        return int(round(val * s))

    bg_color = (24, 24, 27, 255)  # #18181b
    if opaque_bg:
        img = Image.new("RGBA", (canvas_size, canvas_size), bg_color)
    else:
        img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))

    draw = ImageDraw.Draw(img)

    # カラーパレット定義（他ツールのスカイブルー枠＋山と太陽＋虫眼鏡と明確に差別化）
    # パープル（アメジスト）枠 ＋ アイボリーの日記帳 ＋ ローズのしおり ＋ アンバーゴールドのペン
    theme_border = (168, 85, 247, 255) if is_running else (82, 82, 91, 255)       # #a855f7 / #52525b
    spine_color = (126, 34, 206, 255) if is_running else (63, 63, 70, 255)        # #7e22ce / #3f3f46
    page_color = (244, 244, 245, 255) if is_running else (113, 113, 122, 255)     # #f4f4f5 / #71717a
    ring_color = (212, 212, 216, 255) if is_running else (82, 82, 91, 255)        # #d4d4d8 / #52525b
    line_color = (168, 85, 247, 255) if is_running else (63, 63, 70, 255)         # 罫線
    ribbon_color = (244, 63, 94, 255) if is_running else (82, 82, 91, 255)        # #f43f5e しおり
    pen_body_color = (251, 191, 36, 255) if is_running else (161, 161, 170, 255)  # #fbbf24 ペン軸
    pen_tip_color = (254, 243, 199, 255) if is_running else (113, 113, 122, 255)  # #fef3c7 ペン先

    # 1. 背景の角丸四角形
    box_max = 56 if with_badge else 60
    pad = 2 if with_badge else 4
    draw.rounded_rectangle(
        [sc(pad), sc(pad), sc(box_max), sc(box_max)],
        radius=sc(13),
        fill=bg_color,
        outline=theme_border,
        width=max(1, sc(3.2)),
    )

    # 中心オフセット（バッジ無しアイコンの場合は中央揃え）
    offset = 0.0 if with_badge else 3.0

    def pt(x: float, y: float) -> tuple[int, int]:
        return (sc(x + offset), sc(y + offset))

    def rect(x1: float, y1: float, x2: float, y2: float) -> list[int]:
        return [sc(x1 + offset), sc(y1 + offset), sc(x2 + offset), sc(y2 + offset)]

    # 2. 日記帳（ノート本体）の描画
    # ページ全体
    draw.rounded_rectangle(
        rect(14, 11, 43, 47),
        radius=sc(4.5),
        fill=page_color,
    )

    # 左側の背表紙（スパイン）
    draw.rounded_rectangle(
        rect(14, 11, 21, 47),
        radius=sc(3.5),
        fill=spine_color,
    )
    draw.rectangle(
        rect(18, 11, 21, 47),
        fill=spine_color,
    )

    # リング綴じ（3箇所）
    for ry in (18, 29, 40):
        draw.rounded_rectangle(
            rect(11.5, ry - 1.6, 17.5, ry + 1.6),
            radius=sc(1.5),
            fill=ring_color,
            outline=bg_color,
            width=max(1, sc(1.0)),
        )

    # 3. しおりリボン（右上から垂れるV字カットリボン）
    ribbon_pts = [
        pt(34, 11),
        pt(39, 11),
        pt(39, 23),
        pt(36.5, 20.2),
        pt(34, 23),
    ]
    draw.polygon(ribbon_pts, fill=ribbon_color)

    # 4. 日記ページの罫線（3本）
    line_h = max(1, sc(2.2))
    draw.rounded_rectangle(rect(24, 20, 31, 22.2), radius=line_h // 2, fill=line_color)
    draw.rounded_rectangle(rect(24, 27, 38, 29.2), radius=line_h // 2, fill=line_color)
    draw.rounded_rectangle(rect(24, 34, 34, 36.2), radius=line_h // 2, fill=line_color)

    # 5. 右斜めから日記を書くペン（万年筆/スタイラス）
    # 中心軸 (33, 39) -> (48, 24) 方向（角度 -45度）
    angle = -math.pi / 4.0
    ux, uy = math.cos(angle), math.sin(angle)      # 軸方向ベクトル (右上へ)
    nx, ny = -uy, ux                               # 法線ベクトル (右下へ)

    tip_x, tip_y = 29.5, 41.5
    cone_len = 5.5
    body_len = 15.5
    half_w = 2.8

    # ペン周囲のダーク縁取り（日記帳の上でくっきり浮かび上がらせる）
    outline_w = half_w + 1.4
    p_tip_out = pt(tip_x - ux * 1.2, tip_y - uy * 1.2)
    p_end_l_out = pt(
        tip_x + ux * (cone_len + body_len + 1.2) - nx * outline_w,
        tip_y + uy * (cone_len + body_len + 1.2) - ny * outline_w,
    )
    p_end_r_out = pt(
        tip_x + ux * (cone_len + body_len + 1.2) + nx * outline_w,
        tip_y + uy * (cone_len + body_len + 1.2) + ny * outline_w,
    )
    p_cone_l_out = pt(
        tip_x + ux * cone_len - nx * outline_w,
        tip_y + uy * cone_len - ny * outline_w,
    )
    p_cone_r_out = pt(
        tip_x + ux * cone_len + nx * outline_w,
        tip_y + uy * cone_len + ny * outline_w,
    )
    draw.polygon(
        [p_tip_out, p_cone_l_out, p_end_l_out, p_end_r_out, p_cone_r_out],
        fill=bg_color,
    )

    # ペン軸本体
    p_cone_l = pt(tip_x + ux * cone_len - nx * half_w, tip_y + uy * cone_len - ny * half_w)
    p_cone_r = pt(tip_x + ux * cone_len + nx * half_w, tip_y + uy * cone_len + ny * half_w)
    p_end_l = pt(
        tip_x + ux * (cone_len + body_len) - nx * half_w,
        tip_y + uy * (cone_len + body_len) - ny * half_w,
    )
    p_end_r = pt(
        tip_x + ux * (cone_len + body_len) + nx * half_w,
        tip_y + uy * (cone_len + body_len) + ny * half_w,
    )
    draw.polygon([p_cone_l, p_end_l, p_end_r, p_cone_r], fill=pen_body_color)

    # ペン先（三角形）
    p_tip = pt(tip_x, tip_y)
    draw.polygon([p_tip, p_cone_l, p_cone_r], fill=pen_tip_color)

    # 6. 右下のステータスバッジ（トレイアイコン用）
    if with_badge:
        badge_bbox = [sc(38), sc(38), sc(62), sc(62)]
        if is_running:
            draw.ellipse(
                badge_bbox,
                fill=(34, 197, 94, 255),
                outline=(9, 9, 11, 255),
                width=max(1, sc(3)),
            )
        else:
            draw.ellipse(
                badge_bbox,
                fill=(245, 158, 11, 255),
                outline=(9, 9, 11, 255),
                width=max(1, sc(3)),
            )
            draw.rectangle([sc(46), sc(45), sc(48), sc(55)], fill=(24, 24, 27, 255))
            draw.rectangle([sc(52), sc(45), sc(54), sc(55)], fill=(24, 24, 27, 255))

    return img


def create_tray_icon(is_running: bool) -> Image.Image:
    """
    このツール専用のアイコン（64x64 RGBA）を描画する
    - is_running=True : テーマカラー枠＋鮮やかなモチーフ＋右下に緑色の稼働バッジ
    - is_running=False: グレー枠＋グレーモチーフ＋右下にオレンジ色の一時停止(||)バッジ
    """
    hi_res = _render_base_artwork(256, is_running=is_running, with_badge=True, opaque_bg=False)
    return hi_res.resize((64, 64), Image.Resampling.LANCZOS)


def generate_app_icons():
    """
    ブラウザタブ（Favicon）およびPWAホーム画面用アイコンを2048x2048からLANCZOS縮小して生成・配置する
    """
    APP_DIR.mkdir(parents=True, exist_ok=True)
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)

    # 透過ありマスター (2048x2048)
    master_transparent = _render_base_artwork(
        2048, is_running=True, with_badge=False, opaque_bg=False
    )
    # iOS用 背景塗りつぶしマスター (2048x2048)
    master_opaque = _render_base_artwork(
        2048, is_running=True, with_badge=False, opaque_bg=True
    )

    # 1. src/app/favicon.ico (16x16, 32x32, 48x48, 64x64)
    favicon_sizes = [(16, 16), (32, 32), (48, 48), (64, 64)]
    favicon_base = master_transparent.resize((256, 256), Image.Resampling.LANCZOS)
    favicon_base.save(
        APP_DIR / "favicon.ico",
        format="ICO",
        sizes=favicon_sizes,
    )

    # 2. src/app/icon.png (512x512, 透過あり)
    icon_512 = master_transparent.resize((512, 512), Image.Resampling.LANCZOS)
    icon_512.save(APP_DIR / "icon.png", format="PNG")

    # 3. src/app/apple-icon.png (180x180, 背景透過なしの塗りつぶし)
    apple_180 = master_opaque.resize((180, 180), Image.Resampling.LANCZOS)
    apple_180.save(APP_DIR / "apple-icon.png", format="PNG")

    # 4. public/icon-192.png (192x192) & public/icon.png (512x512)
    icon_192 = master_transparent.resize((192, 192), Image.Resampling.LANCZOS)
    icon_192.save(PUBLIC_DIR / "icon-192.png", format="PNG")
    icon_512.save(PUBLIC_DIR / "icon.png", format="PNG")


class ServerTrayManager:
    def __init__(self):
        self.frontend_proc: subprocess.Popen | None = None
        self.is_running: bool = False
        self.lock = threading.Lock()
        self.icon: pystray.Icon | None = None

    def _kill_process_tree(self, pid: int):
        try:
            parent = psutil.Process(pid)
            children = parent.children(recursive=True)
            for child in children:
                try:
                    child.terminate()
                except psutil.NoSuchProcess:
                    pass
            parent.terminate()
            _, alive = psutil.wait_procs(children + [parent], timeout=3)
            for p in alive:
                try:
                    p.kill()
                except psutil.NoSuchProcess:
                    pass
        except psutil.NoSuchProcess:
            pass
        except Exception:
            subprocess.run(
                ["taskkill", "/F", "/T", "/PID", str(pid)],
                creationflags=CREATE_NO_WINDOW,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )

    def _kill_processes_on_ports(self, ports: list[int]):
        target_pids = set()
        try:
            for conn in psutil.net_connections(kind="inet"):
                if (
                    conn.status == psutil.CONN_LISTEN
                    and conn.laddr
                    and conn.laddr.port in ports
                    and conn.pid
                ):
                    target_pids.add(conn.pid)
        except Exception:
            pass

        for pid in target_pids:
            if pid != os.getpid():
                self._kill_process_tree(pid)

    def start_servers(self):
        with self.lock:
            if self.is_running:
                return

            self._kill_processes_on_ports([WEB_PORT])

            npm_cmd = shutil.which("npm.cmd") or shutil.which("npm") or "npm.cmd"

            # Next.js フルスタックサーバー起動 (Port: 3647)
            self.frontend_proc = subprocess.Popen(
                [npm_cmd, "run", "start"],
                cwd=str(BASE_DIR),
                creationflags=CREATE_NO_WINDOW,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )

            self.is_running = True
            self._update_tray_ui()

    def stop_servers(self):
        with self.lock:
            if self.frontend_proc and self.frontend_proc.poll() is None:
                self._kill_process_tree(self.frontend_proc.pid)
            self.frontend_proc = None

            self._kill_processes_on_ports([WEB_PORT])

            self.is_running = False
            self._update_tray_ui()

    def restart_servers(self):
        self.stop_servers()
        time.sleep(0.5)
        self.start_servers()

    def _update_tray_ui(self):
        if not self.icon:
            return
        self.icon.icon = create_tray_icon(self.is_running)
        status_str = "常駐稼働中" if self.is_running else "停止中"
        self.icon.title = f"{APP_SHORT_NAME} - {status_str} (Port: {WEB_PORT})"
        self.icon.update_menu()

    def on_open_browser(self, icon=None, item=None):
        webbrowser.open(f"http://{BROWSER_HOST}:{WEB_PORT}")

    def on_open_vscode(self, icon=None, item=None):
        code_cmd = shutil.which("code.cmd") or shutil.which("code")
        if not code_cmd:
            local_app_data = os.environ.get("LOCALAPPDATA", "")
            candidate = Path(local_app_data) / "Programs" / "Microsoft VS Code" / "bin" / "code.cmd"
            if candidate.exists():
                code_cmd = str(candidate)

        if code_cmd:
            subprocess.Popen(
                [code_cmd, str(BASE_DIR)],
                cwd=str(BASE_DIR),
                creationflags=CREATE_NO_WINDOW,
            )
        else:
            os.startfile(str(BASE_DIR))

    def on_toggle_servers(self, icon=None, item=None):
        if self.is_running:
            threading.Thread(target=self.stop_servers, daemon=True).start()
        else:
            threading.Thread(target=self.start_servers, daemon=True).start()

    def on_restart_servers(self, icon=None, item=None):
        threading.Thread(target=self.restart_servers, daemon=True).start()

    def on_exit_tray(self, icon=None, item=None):
        self.stop_servers()
        if self.icon:
            self.icon.stop()

    def build_menu(self) -> pystray.Menu:
        return pystray.Menu(
            pystray.MenuItem(
                lambda item: (
                    f"● 状態: 常駐稼働中 (Port: {WEB_PORT})"
                    if self.is_running
                    else f"○ 状態: 停止中 (Port: {WEB_PORT})"
                ),
                None,
                enabled=False,
            ),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem(
                f"🌐 ブラウザで開く ({BROWSER_HOST}:{WEB_PORT})",
                self.on_open_browser,
                default=True,
            ),
            pystray.MenuItem(
                "📁 プロジェクトフォルダをVS Codeで開く",
                self.on_open_vscode,
            ),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem(
                lambda item: "⏸ 常駐を停止" if self.is_running else "▶ 常駐を再開",
                self.on_toggle_servers,
            ),
            pystray.MenuItem(
                "🔄 常駐サーバーを再起動",
                self.on_restart_servers,
            ),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem(
                "❌ トレイから完全終了",
                self.on_exit_tray,
            ),
        )

    def run(self):
        self.icon = pystray.Icon(
            name=APP_SHORT_NAME.lower(),
            icon=create_tray_icon(False),
            title=f"{APP_SHORT_NAME} - 起動中 (Port: {WEB_PORT})",
            menu=self.build_menu(),
        )

        def setup(icon: pystray.Icon):
            icon.visible = True
            self.start_servers()

        self.icon.run(setup=setup)


if __name__ == "__main__":
    if "--generate-icons" in sys.argv:
        generate_app_icons()
        sys.exit(0)

    mutex = acquire_single_instance_mutex()
    if mutex is None:
        sys.exit(0)

    manager = ServerTrayManager()
    manager.run()
