const uuidInput = document.getElementById("uuid");
const nameInput = document.getElementById("name");
const saveBtn = document.getElementById("saveBtn");
const notif = document.getElementById("notification");
const unlockCheckbox = document.getElementById("unlockUuid");
const warning = document.getElementById("uuidWarning");

function showNotif(msg, success = true) {
    notif.textContent = msg;
    notif.style.backgroundColor = success ? "#2ea043" : "#da3633";
    notif.classList.remove("hidden");
}

/* Charger compte */
fetch("/api/account")
    .then(res => res.json())
    .then(data => {
        uuidInput.value = data.uuid || "";
        nameInput.value = data.name || "";
    })
    .catch(() => {
        showNotif("❌ Impossible de charger le compte", false);
    });

/* Gestion donnée sensible */
unlockCheckbox.addEventListener("change", () => {
    if (unlockCheckbox.checked) {
        uuidInput.disabled = false;
        uuidInput.type = "text";
        warning.classList.remove("hidden");
    } else {
        uuidInput.disabled = true;
        uuidInput.type = "password";
        warning.classList.add("hidden");
    }
});

/* Sauvegarde */
saveBtn.addEventListener("click", () => {
    if (!unlockCheckbox.checked) {
        // UUID non modifiable → on ne l'envoie pas
        fetch("/api/account", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: nameInput.value.trim()
            })
        })
        .then(() => showNotif("✅ Nom sauvegardé"))
        .catch(() => showNotif("❌ Erreur", false));
        return;
    }

    // UUID modifié volontairement
    fetch("/api/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            uuid: uuidInput.value.trim(),
            name: nameInput.value.trim()
        })
    })
    .then(() => showNotif("⚠️ UUID modifié avec succès"))
    .catch(() => showNotif("❌ Erreur", false));
});
