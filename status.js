async function loadLiveStatus() {
    const box = document.getElementById("live-status");
    const title = document.getElementById("live-status-title");
    const detail = document.getElementById("live-status-detail");

    if (!box || !title || !detail) {
        console.error("Live status elements not found.");
        return;
    }

    const lang = document.documentElement.lang === "en" ? "en" : "sk";

    const labels = {
        sk: {
            online: {
                title: "Jazdím – prijímam jazdy",
                detail: "· Som aktuálne k dispozícii na odvoz"
            },
            booking: {
                title: "Prijímam objednávky",
                detail: "· Momentálne nejazdím"
            },
            offline: {
                title: "Offline",
                detail: "· Momentálne neprijímam jazdy ani objednávky"
            }
        },

        en: {
            online: {
                title: "Driving – accepting rides",
                detail: "· I am currently available for a ride"
            },
            booking: {
                title: "Accepting bookings",
                detail: "· I am not currently driving"
            },
            offline: {
                title: "Offline",
                detail: "· I am currently not accepting rides or bookings"
            }
        }
    };

    try {
        const response = await fetch(
            "https://erinkataxi-status.erin-zelenakova-ke.workers.dev/status",
            {
                cache: "no-store"
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }

        const data = await response.json();

        console.log("ErinkaTaxi status:", data);

        const status = ["online", "booking", "offline"].includes(data.status)
            ? data.status
            : "offline";

        box.classList.remove(
            "live-status-loading",
            "live-status-online",
            "live-status-booking",
            "live-status-offline"
        );

        if (status === "online") {
            box.classList.add("live-status-online");
        } else if (status === "booking") {
            box.classList.add("live-status-booking");
        } else {
            box.classList.add("live-status-offline");
        }

        title.textContent = labels[lang][status].title;
        detail.textContent = " " + labels[lang][status].detail;

    } catch (error) {
        console.error("Live status error:", error);

        box.classList.remove(
            "live-status-online",
            "live-status-booking",
            "live-status-offline"
        );

        box.classList.add("live-status-loading");

        title.textContent =
            lang === "en"
                ? "Status temporarily unavailable"
                : "Stav je dočasne nedostupný";

        detail.textContent = "";
    }
}

loadLiveStatus();

setInterval(loadLiveStatus, 10000);