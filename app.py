import flask
import requests
import os
import json
import configparser
import zipfile
import shutil
from io import BytesIO
import subprocess
import base64

app = flask.Flask(__name__)

# ================= CONFIG =================
CONFIG_FILE = "config.json"
ONLINEFIX_PATH = "C:/Users/Public/Documents/OnlineFix/Hytale/OnlineFix.ini"

MIRRORS_VERSION = [
    "https://hytale-mirror-1.serveousercontent.com/version.txt",
    "https://hytale-mirror-2.serveo.net/version.txt",
    "https://hytale-miror-3.rocknite-studio.com/version.txt"
]

MIRRORS_GAME = [
    "https://hytale-mirror-1.serveousercontent.com/game.zip",
    "https://hytale-mirror-2.serveo.net/game.zip",
    "https://hytale-miror-3.rocknite-studio.com/game.zip"
]

# ================= UTILS =================

def load_config():
    if not os.path.exists(CONFIG_FILE):
        return {"install_path": "C:/Hytale"}
    with open(CONFIG_FILE, "r") as f:
        return json.load(f)

def save_config(data):
    with open(CONFIG_FILE, "w") as f:
        json.dump(data, f, indent=4)

def version_tuple(v):
    try:
        return tuple(map(int, v.split(".")))
    except:
        return (0, 0, 0)

def has_internet():
    try:
        requests.get("https://www.google.com", timeout=3)
        return True
    except:
        return False

def get_remote_version():
    for url in MIRRORS_VERSION:
        try:
            r = requests.get(url, timeout=3)
            if r.status_code == 200:
                return r.text.strip()
        except:
            continue
    return None

def get_local_version(install_path):
    version_file = os.path.join(install_path, "version.txt")
    if not os.path.exists(version_file):
        return None
    try:
        with open(version_file, "r") as f:
            return f.read().strip()
    except:
        return None

def get_account_avatar(uuid, install_path):
    if not uuid or not install_path:
        return None

    avatar_path = os.path.join(
        install_path,
        "install/release/package/game/latest/Client/UserData/CachedAvatarPreviews",
        f"{uuid}.png"
    )

    if not os.path.exists(avatar_path):
        return None

    try:
        with open(avatar_path, "rb") as img:
            return base64.b64encode(img.read()).decode("utf-8")
    except:
        return None

# ================= ACCOUNT =================

def read_account():
    if not os.path.exists(ONLINEFIX_PATH):
        return None
    config = configparser.ConfigParser()
    config.read(ONLINEFIX_PATH, encoding="utf-8-sig")
    if "User" not in config:
        return None
    return {
        "uuid": config["User"].get("UUID", ""),
        "name": config["User"].get("Name", "")
    }

def write_account(uuid, name):
    config = configparser.ConfigParser()
    config["User"] = {"UUID": uuid, "Name": name}
    os.makedirs(os.path.dirname(ONLINEFIX_PATH), exist_ok=True)
    with open(ONLINEFIX_PATH, "w", encoding="utf-8") as f:
        config.write(f)

# ================= INSTALL / UPDATE =================

def download_and_extract_game(install_path, remote_version):
    os.makedirs(install_path, exist_ok=True)  # Crée le dossier s'il n'existe pas

    # Télécharger zip depuis le premier mirror qui répond
    zip_path = os.path.join(install_path, "temp_game.zip")
    downloaded = False
    for url in MIRRORS_GAME:
        try:
            r = requests.get(url, stream=True, timeout=15)
            if r.status_code == 200:
                with open(zip_path, "wb") as f:
                    for chunk in r.iter_content(1024*1024):
                        f.write(chunk)
                downloaded = True
                break
        except:
            continue
    if not downloaded:
        raise Exception("Impossible de télécharger le jeu depuis tous les mirrors.")

    # Sauvegarder les dossiers critiques
    userdata_dir = os.path.join(install_path, "install/release/package/game/latest/Client/UserData")
    server_dir = os.path.join(install_path, "install/release/package/game/latest/Server")

    tmp_userdata = None
    tmp_server = None

    if os.path.exists(userdata_dir):
        tmp_userdata = userdata_dir + "_backup"
        shutil.move(userdata_dir, tmp_userdata)
    if os.path.exists(server_dir):
        tmp_server = server_dir + "_backup"
        shutil.move(server_dir, tmp_server)

    # Extraire le zip
    with zipfile.ZipFile(zip_path, 'r') as zf:
        zf.extractall(install_path)

    os.remove(zip_path)

    # Restaurer les dossiers protégés
    if tmp_userdata:
        if os.path.exists(userdata_dir):
            shutil.rmtree(userdata_dir)
        shutil.move(tmp_userdata, userdata_dir)
    if tmp_server:
        if os.path.exists(server_dir):
            shutil.rmtree(server_dir)
        shutil.move(tmp_server, server_dir)

    # Vérification rapide
    required_dirs = [
        os.path.join(install_path, "install/release/package/game/latest/Client"),
        os.path.join(install_path, "install/release/package/game/latest/Server")
    ]
    for d in required_dirs:
        if not os.path.exists(d):
            raise Exception(f"Dossier manquant après extraction : {d}")

    # Écrire version.txt
    version_file = os.path.join(install_path, "version.txt")
    with open(version_file, "w") as f:
        f.write(remote_version)

# ================= ROUTES =================

@app.route("/")
def index():
    return flask.render_template("index.html")

@app.route("/settings")
def settings():
    return flask.render_template("settings/index.html")

@app.route("/account")
def account_page():
    return flask.render_template("account/index.html")

@app.route("/api/status")
def status():
    config = load_config()
    install_path = config.get("install_path")

    if not has_internet():
        return {"internet": False, "status": "offline"}

    remote_version = get_remote_version()
    if remote_version is None:
        return {"internet": False, "status": "offline"}

    if not os.path.exists(install_path):
        return {"internet": True, "status": "install", "remote_version": remote_version}

    local_version = get_local_version(install_path)
    if local_version is None:
        return {"internet": True, "status": "install", "remote_version": remote_version}

    if version_tuple(local_version) < version_tuple(remote_version):
        return {"internet": True, "status": "update", "local_version": local_version, "remote_version": remote_version}

    return {"internet": True, "status": "play", "local_version": local_version}

@app.route("/api/config", methods=["GET", "POST"])
def config_api():
    if flask.request.method == "POST":
        data = flask.request.json
        save_config(data)
        return {"ok": True}
    return load_config()

@app.route("/api/action", methods=["POST"])
def action():
    config = load_config()
    install_path = config.get("install_path")
    remote_version = get_remote_version()
    try:
        download_and_extract_game(install_path, remote_version)
        return {"ok": True, "message": f"{remote_version}"}
    except Exception as e:
        return {"ok": False, "error": str(e)}, 500

@app.route("/api/launch", methods=["POST"])
def launch_game():
    config = load_config()
    install_path = config.get("install_path")
    exe_path = os.path.join(install_path, "HytaleLauncher.exe")

    if not os.path.exists(exe_path):
        return {"ok": False, "error": "Le fichier HytaleLauncher.exe est introuvable"}, 404

    try:
        subprocess.Popen(
            [exe_path],
            cwd=install_path,
            shell=True,
            creationflags=subprocess.CREATE_NEW_CONSOLE
        )
        return {"ok": True, "message": "Hytale lancé"}
    except Exception as e:
        return {"ok": False, "error": str(e)}, 500

@app.route("/api/news")
def news():
    for mirror in [
        "https://hytale-mirror-1.serveousercontent.com",
        "https://hytale-mirror-2.serveo.net",
        "https://hytale-miror-3.rocknite-studio.com"
    ]:
        try:
            r = requests.get(f"{mirror}/news.json", timeout=5)
            if r.status_code == 200:
                data = r.json()
                # On s’assure que la clé "news" existe
                if "news" in data:
                    return {"news": data["news"]}
        except Exception as e:
            continue

    # Si aucun mirror n’a répondu, on renvoie un fallback statique
    return {
        "news": [
            {"title": "Error", "content": "Impossible de récuperer les news sur les mirror. merci de réessayer ulterieurement.", "date": "2026-01-19"},
            {"title": "Error", "content": "De ce fait, il sera sans doute impossible de recuperer les dernier mise a jour.", "date": "2026-01-18"}
        ]
    }


@app.route("/api/account", methods=["GET", "POST"])
def account_api():
    if flask.request.method == "GET":
        account = read_account()
        if account is None:
            return {"error": "Fichier introuvable"}, 404

        config = load_config()
        install_path = config.get("install_path")

        avatar_base64 = get_account_avatar(account.get("uuid"), install_path)

        return {
            "uuid": account.get("uuid"),
            "name": account.get("name"),
            "avatar": avatar_base64  # null si absent
        }

    data = flask.request.json
    write_account(data.get("uuid", ""), data.get("name", ""))
    return {"ok": True}



# ================= MAIN =================

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8569, debug=True)
