const input = document.getElementById("installPath");
const saveBtn = document.getElementById("saveBtn");
const notif = document.getElementById("notification");

/* ===== Notification ===== */
function showNotif(msg, success = true) {
    notif.textContent = msg;
    notif.style.backgroundColor = success ? "#2ea043" : "#da3633";
    notif.classList.remove("hidden");
}

/* ===== Charger config ===== */
fetch("/api/config")
    .then(res => res.json())
    .then(data => {
        input.value = data.install_path || "";
    })
    .catch(() => {
        showNotif("❌ Impossible de charger la configuration", false);
    });

/* ===== Sauvegarder ===== */
saveBtn.addEventListener("click", () => {
    const path = input.value.trim();

    if (!path) {
        showNotif("⚠️ Chemin invalide", false);
        return;
    }

    fetch("/api/config", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            install_path: path
        })
    })
    .then(res => res.json())
    .then(() => {
        showNotif("✅ Chemin sauvegardé");
    })
    .catch(() => {
        showNotif("❌ Erreur lors de la sauvegarde", false);
    });
});
