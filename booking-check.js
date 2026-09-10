// Erinka Taxi - nezáväzný dopyt na jazdu cez SMS, s automatickým
// upozornením na možnú časovú kolíziu.
//
// DÔLEŽITÉ: Táto kontrola NIKDY nezablokuje odoslanie SMS. Ide len
// o nezáväzný dopyt zákazníka - web len označí, či sa zvolený čas
// prekrýva s už známym obsadeným termínom, aby si to hneď videla
// v prijatej SMS. Skutočná rezervácia vzniká až keď TY potvrdíš
// dostupnosť a cenu a zákazník objednávku potvrdí späť.
//
// Používa rovnaké zdroje dát ako availability.js (musí sa načítať
// PRED týmto súborom):
//   - AVAILABILITY_API   - Cloudflare Worker endpoint (Google Calendar)
//   - availabilityData.longTerm - dovolenky / dlhodobé uzávierky

document.addEventListener("DOMContentLoaded", function () {

    const openBtn = document.getElementById("open-booking-check");
    const panel = document.getElementById("booking-check-panel");
    const closeBtn = document.getElementById("booking-check-close");
    const form = document.getElementById("booking-check-form");

    if (!openBtn || !panel || !form) {
        return; // prvky nie sú na stránke
    }

    const lang = document.documentElement.lang === "en" ? "en" : "sk";

    const PHONE = "+421914208898";
    const TIME_ZONE = "Europe/Bratislava";

    // Predpokladané okno novej jazdy okolo požadovaného času.
    // Napr. zákazník chce 10:00 -> kontroluje sa cca 09:45-10:30.
    const WINDOW_BEFORE_MINUTES = 15;
    const WINDOW_AFTER_MINUTES = 30;

    // -----------------------------------------------------------
    // Prevod "nástenných" hodín zadaných zákazníkom (vždy myslené
    // ako čas v Europe/Bratislava) na správny UTC okamih - bez
    // ohľadu na to, v akom časovom pásme má nastavený svoj telefón.
    // -----------------------------------------------------------

    function getTimeZoneOffsetMs(date, timeZone) {
        const dtf = new Intl.DateTimeFormat("en-US", {
            timeZone: timeZone,
            hourCycle: "h23",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        });

        const parts = dtf.formatToParts(date).reduce(function (acc, part) {
            acc[part.type] = part.value;
            return acc;
        }, {});

        const asUTC = Date.UTC(
            parseInt(parts.year, 10),
            parseInt(parts.month, 10) - 1,
            parseInt(parts.day, 10),
            parseInt(parts.hour, 10),
            parseInt(parts.minute, 10),
            parseInt(parts.second, 10)
        );

        return asUTC - date.getTime();
    }

    // dateStr: "YYYY-MM-DD", timeStr: "HH:MM" - obe myslené ako
    // miestny čas v Europe/Bratislava, nie v čase zariadenia.
    function zonedWallTimeToUtc(dateStr, timeStr, timeZone) {
        const naiveUtcMs = Date.parse(dateStr + "T" + timeStr + ":00Z");

        if (isNaN(naiveUtcMs)) {
            return new Date(NaN);
        }

        const naiveDate = new Date(naiveUtcMs);
        const offsetMs = getTimeZoneOffsetMs(naiveDate, timeZone);

        return new Date(naiveUtcMs - offsetMs);
    }

    const labels = lang === "sk"
        ? {
            checking: "Kontrolujem dostupnosť...",
            conflict: "⚠️ V blízkosti zvoleného času už mám inú jazdu. Vašu žiadosť môžete pokojne odoslať - dostupnosť preverím podľa trasy a termín aj cenu vám potvrdím (alebo navrhnem iný čas). Otváram SMS...",
            clear: "✅ Bez zistenej časovej kolízie. Otváram SMS s vašou žiadosťou o jazdu...",
            unknown: "ℹ️ Dostupnosť sa nepodarilo automaticky overiť. Žiadosť môžete odoslať aj tak, termín potvrdím ručne. Otváram SMS...",
            missing: "Vyplňte, prosím, dátum a čas jazdy.",
            missingRoute: "Vyplňte, prosím, odkiaľ a kam máte záujem o odvoz."
        }
        : {
            checking: "Checking availability...",
            conflict: "⚠️ I already have another ride around that time. You can still send your request - I'll check the route and confirm the time and price (or suggest another time). Opening SMS...",
            clear: "✅ No conflict detected. Opening SMS with your request...",
            unknown: "ℹ️ Could not automatically verify availability. You can still send your request, I'll confirm manually. Opening SMS...",
            missing: "Please fill in the date and time of the ride.",
            missingRoute: "Please fill in the pickup and destination."
        };

    const smsFlag = lang === "sk"
        ? {
            conflict: "POZOR - MOZNA CASOVA KOLIZIA (overim a potvrdim)",
            clear: "BEZ ZISTENEJ CASOVEJ KOLIZIE",
            unknown: "DOSTUPNOST NEOVERENA - potvrdim rucne"
        }
        : {
            conflict: "WARNING - POSSIBLE TIME CONFLICT (will confirm)",
            clear: "NO CONFLICT DETECTED",
            unknown: "AVAILABILITY NOT VERIFIED - will confirm manually"
        };


    // -----------------------------------------------------------
    // Otváranie / zatváranie panelu
    // -----------------------------------------------------------

    openBtn.addEventListener("click", function () {
        panel.hidden = false;
        panel.scrollIntoView({ behavior: "smooth", block: "end" });
    });

    if (closeBtn) {
        closeBtn.addEventListener("click", function () {
            panel.hidden = true;
        });
    }


    // -----------------------------------------------------------
    // Zostavenie textu SMS z vyplnených údajov
    // -----------------------------------------------------------

    function yesNo(checked) {
        if (lang === "sk") {
            return checked ? "ano" : "nie";
        }
        return checked ? "yes" : "no";
    }

    const seatLabels = lang === "sk"
        ? {
            "none": "bez sedacky",
            "seat-9-36": "sedacka 9-36 kg",
            "booster-22-36": "podsedak 22-36 kg",
            "own-carrier": "vlastne vajicko (do 9 kg)"
        }
        : {
            "none": "none",
            "seat-9-36": "seat 9-36 kg",
            "booster-22-36": "booster 22-36 kg",
            "own-carrier": "own infant carrier (under 9 kg)"
        };

    function buildSmsBody(values, status) {
        const flagLine = smsFlag[status];
        const seatText = seatLabels[values.seat] || values.seat;

        const requestLines = lang === "sk"
            ? [
                "Dobry den, mam zaujem o odvoz. (nezavazny dopyt)",
                "Odkial: " + values.from,
                "Kam: " + values.to,
                "Datum a cas: " + values.date + " " + values.time + " (SK cas)",
                "Pocet osob: " + values.passengers,
                "Vacsia batozina: " + yesNo(values.luggage),
                "Detska sedacka: " + seatText,
                "Domace zviera: " + yesNo(values.pet),
                "Cislo letu: " + (values.flight || "-")
            ]
            : [
                "Hello, I would like to book a ride. (non-binding request)",
                "Pickup: " + values.from,
                "Destination: " + values.to,
                "Date and time: " + values.date + " " + values.time + " (SK time)",
                "Passengers: " + values.passengers,
                "Larger luggage: " + yesNo(values.luggage),
                "Child seat: " + seatText,
                "Pet: " + yesNo(values.pet),
                "Flight number: " + (values.flight || "-")
            ];

        return [flagLine, ""].concat(requestLines).join("\n");
    }

    function openSms(values, status) {
        const body = buildSmsBody(values, status);
        const encoded = encodeURIComponent(body);
        window.location.href = "sms:" + PHONE + "?&body=" + encoded;
    }


    // -----------------------------------------------------------
    // Načítanie obsadených intervalov (rovnaké zdroje ako availability.js)
    // -----------------------------------------------------------

    function getLongTermIntervals() {
        if (typeof availabilityData === "undefined" || !availabilityData.longTerm) {
            return [];
        }

        return availabilityData.longTerm
            .filter(function (item) {
                return item.startDate && item.endDate;
            })
            .map(function (item) {
                return {
                    start: zonedWallTimeToUtc(item.startDate, "00:00", TIME_ZONE),
                    end: zonedWallTimeToUtc(item.endDate, "23:59", TIME_ZONE)
                };
            });
    }

    async function getShortTermIntervals() {
        if (typeof AVAILABILITY_API === "undefined") {
            return [];
        }

        const response = await fetch(AVAILABILITY_API, { cache: "no-store" });

        if (!response.ok) {
            throw new Error("Availability API error " + response.status);
        }

        const data = await response.json();

        return (data.busy || []).map(function (slot) {
            return {
                start: new Date(slot.start),
                end: new Date(slot.end)
            };
        });
    }

    // Skontroluje, či sa predpokladané OKNO novej jazdy
    // (candidate - WINDOW_BEFORE, candidate + WINDOW_AFTER)
    // prekrýva s niektorým existujúcim obsadeným intervalom.
    function hasWindowConflict(candidate, intervals) {
        const windowStart = candidate.getTime() - WINDOW_BEFORE_MINUTES * 60 * 1000;
        const windowEnd = candidate.getTime() + WINDOW_AFTER_MINUTES * 60 * 1000;

        return intervals.some(function (interval) {
            const busyStart = interval.start.getTime();
            const busyEnd = interval.end.getTime();

            // Klasické prekrytie dvoch intervalov
            return windowStart <= busyEnd && windowEnd >= busyStart;
        });
    }


    // -----------------------------------------------------------
    // Odoslanie formulára
    // -----------------------------------------------------------

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        const resultBox = document.getElementById("booking-check-result");
        const submitBtn = document.getElementById("booking-check-submit");

        const dateVal = document.getElementById("booking-date").value;
        const hourVal = document.getElementById("booking-hour").value;
        const minuteVal = document.getElementById("booking-minute").value;

        if (!dateVal || !hourVal || !minuteVal) {
            resultBox.textContent = labels.missing;
            resultBox.className = "booking-check-result booking-check-warning";
            return;
        }

        const timeVal = hourVal + ":" + minuteVal;
        const fromVal = document.getElementById("booking-from").value.trim();
        const toVal = document.getElementById("booking-to").value.trim();

        if (!fromVal || !toVal) {
            resultBox.textContent = labels.missingRoute;
            resultBox.className = "booking-check-result booking-check-warning";
            return;
        }

        const candidate = zonedWallTimeToUtc(dateVal, timeVal, TIME_ZONE);

        if (isNaN(candidate.getTime())) {
            resultBox.textContent = labels.missing;
            resultBox.className = "booking-check-result booking-check-warning";
            return;
        }

        const values = {
            date: dateVal,
            time: timeVal,
            from: fromVal,
            to: toVal,
            passengers: document.getElementById("booking-passengers").value || "1",
            luggage: document.getElementById("booking-luggage").checked,
            seat: document.getElementById("booking-seat").value,
            pet: document.getElementById("booking-pet").checked,
            flight: document.getElementById("booking-flight").value
        };

        submitBtn.disabled = true;
        resultBox.textContent = labels.checking;
        resultBox.className = "booking-check-result booking-check-info";

        try {
            const shortTerm = await getShortTermIntervals();
            const longTerm = getLongTermIntervals();
            const allIntervals = shortTerm.concat(longTerm);

            const conflict = hasWindowConflict(candidate, allIntervals);
            const status = conflict ? "conflict" : "clear";

            resultBox.textContent = labels[status];
            resultBox.className = "booking-check-result " +
                (conflict ? "booking-check-warning" : "booking-check-success");

            setTimeout(function () { openSms(values, status); }, 700);

        } catch (error) {
            console.error("Booking availability check failed:", error);

            resultBox.textContent = labels.unknown;
            resultBox.className = "booking-check-result booking-check-neutral";

            setTimeout(function () { openSms(values, "unknown"); }, 700);

        } finally {
            submitBtn.disabled = false;
        }
    });
});
