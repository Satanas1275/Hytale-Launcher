const playBtn = document.getElementById("playBtn");
const notif = document.getElementById("notification");
const newsContainer = document.getElementById("newsContainer");

/* ================= NOTIFICATION ================= */
function showNotif(message, success = true) {
    notif.textContent = message;
    notif.style.backgroundColor = success ? "#2ea043" : "#da3633";
    notif.classList.remove("hidden");
}

/* ================= STATUS ================= */
function updateStatus() {
    fetch("/api/status")
        .then(res => res.json())
        .then(data => {

            // Reset bouton
            playBtn.disabled = false;
            playBtn.classList.remove("update");

            if (!data.internet || data.status === "offline") {
                showNotif("⚠️ Pas de connexion internet", false);
                playBtn.textContent = "OFFLINE";
                playBtn.disabled = true;
                return;
            }

            switch (data.status) {
                case "install":
                    playBtn.textContent = "INSTALLER";
                    playBtn.classList.add("update");
                    break;

                case "update":
                    playBtn.textContent = "UPDATE";
                    playBtn.classList.add("update");
                    break;

                case "play":
                    playBtn.textContent = "PLAY";
                    break;

                default:
                    playBtn.textContent = "ERREUR";
                    playBtn.disabled = true;
            }
        })
        .catch(() => {
            showNotif("❌ Impossible de contacter l’API", false);
            playBtn.textContent = "ERREUR";
            playBtn.disabled = true;
        });
}

/* ================= ACTION BOUTON ================= */
playBtn.addEventListener("click", () => {
    fetch("/api/status")
        .then(res => res.json())
        .then(data => {

            if (!data.internet || data.status === "offline") {
                showNotif("⚠️ Pas de connexion internet", false);
                return;
            }

            if (data.status === "install" || data.status === "update") {
                // Appeler /api/action pour installer ou update
                playBtn.disabled = true;
                showNotif("⬇️ Téléchargement / installation en cours...");

                fetch("/api/action", { method: "POST" })
                    .then(res => res.json())
                    .then(r => {
                        if (r.ok) {
                            showNotif(`✅ Installation/Update vers ${r.message || ""} terminée`);
                        } else {
                            showNotif(`❌ Erreur : ${r.error || "inconnue"}`, false);
                        }
                        updateStatus();
                    })
                    .catch(() => {
                        showNotif("❌ Erreur pendant l'installation", false);
                        playBtn.disabled = false;
                    });
            } else if (data.status === "play") {
                // Lancer le jeu
                fetch("/api/launch", { method: "POST" })
                    .then(res => res.json())
                    .then(r => {
                        if (r.ok) {
                            showNotif("🎮 Hytale lancé !");
                        } else {
                            showNotif(`❌ Erreur : ${r.error || "inconnue"}`, false);
                        }
                    })
                    .catch(() => showNotif("❌ Impossible de lancer le jeu", false));
            }
        })
        .catch(() => {
            showNotif("❌ Impossible de contacter l’API", false);
        });
});

/* ================= NEWS ================= */
function loadNews() {
    fetch("/api/news")
        .then(res => res.json())
        .then(data => {
            newsContainer.innerHTML = "";

            data.news.forEach(n => {
                const div = document.createElement("div");
                div.className = "news-item";
                div.innerHTML = `
                    <h3>${n.title}</h3>
                    <span>${n.date}</span>
                    <p>${n.content}</p>
                `;
                newsContainer.appendChild(div);
            });
        })
        .catch(() => {
            showNotif("❌ Impossible de charger les news", false);
        });
}

/* ================= ACCOUNT ================= */
function loadAccount() {
    fetch("/api/account")
        .then(res => {
            if (!res.ok) throw new Error("no account");
            return res.json();
        })
        .then(data => {
            const accountInfo = document.getElementById("account-info");

            const avatarHtml = data.avatar
                ? `<img src="data:image/png;base64,${data.avatar}">`
                : `<img src="/static/png/account.png">`;

            accountInfo.innerHTML = `
                <div class="account-avatar">
                    ${avatarHtml}
                </div>
                <div class="account-text">
                    <div class="account-name">${data.name || "Unknown"}</div>
                    <div class="account-uuid">${data.uuid || ""}</div>
                </div>
            `;
        })
        .catch(() => {
            // Pas de compte configuré → on n'affiche rien
        });
}


/* ================= INIT ================= */
updateStatus();
loadNews();
loadAccount();