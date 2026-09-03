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
            available: {
                title: "Voľná – prijímam jazdy",
                detail: "· Som aktuálne k dispozícii na odvoz"
            },

            driving: {
                title: "Jazdím – kontaktujte ma cez SMS",
                detail: "· Počas jazdy nemusím vedieť prijať telefonát"
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
            available: {
                title: "Available – accepting rides",
                detail: "· I am currently available for a ride"
            },

            driving: {
                title: "Driving – please text me",
                detail: "· I may not be able to answer calls while driving"
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

        let status = data.status;

        // Spätná kompatibilita so starým stavom "online"
        if (status === "online") {
            status = "available";
        }

        // Spätná kompatibilita so starým stavom "busy"
        if (status === "busy") {
            status = "booking";
        }

        const allowedStatuses = [
            "available",
            "driving",
            "booking",
            "offline"
        ];

        if (!allowedStatuses.includes(status)) {
            status = "offline";
        }

        box.classList.remove(
            "live-status-loading",
            "live-status-online",
            "live-status-available",
            "live-status-driving",
            "live-status-booking",
            "live-status-offline"
        );

        box.classList.add(`live-status-${status}`);

        title.textContent = labels[lang][status].title;
        detail.textContent = " " + labels[lang][status].detail;

    } catch (error) {
        console.error("Live status error:", error);

        box.classList.remove(
            "live-status-online",
            "live-status-available",
            "live-status-driving",
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
