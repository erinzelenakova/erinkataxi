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
            missingRoute: "Vyplňte, prosím, odkiaľ a kam máte záujem o odvoz.",
            missingChildEquipment: "Pre každé dieťa vyberte, prosím, či nepotrebuje sedačku alebo aké detské vybavenie potrebuje.",
            capacity: "⚠️ Maximálna kapacita vozidla sú 4 cestujúci spolu vrátane detí."
        }
        : {
            checking: "Checking availability...",
            conflict: "⚠️ I already have another ride around that time. You can still send your request - I'll check the route and confirm the time and price (or suggest another time). Opening SMS...",
            clear: "✅ No conflict detected. Opening SMS with your request...",
            unknown: "ℹ️ Could not automatically verify availability. You can still send your request, I'll confirm manually. Opening SMS...",
            missing: "Please fill in the date and time of the ride.",
            missingRoute: "Please fill in the pickup and destination.",
            missingChildEquipment: "For each child, please select whether no seat is needed or which child equipment is required.",
            capacity: "⚠️ Maximum vehicle capacity is 4 passengers in total, including children."
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


    const adultsInput = document.getElementById("booking-adults");
    const childrenInput = document.getElementById("booking-children");
    const childEquipmentGroup = document.getElementById("booking-child-equipment-group");
    const childEquipmentList = document.getElementById("booking-child-equipment-list");

    const MAX_PASSENGERS = 4;

    const childEquipmentOptions = lang === "sk"
        ? [
            { value: "", label: "Vyberte možnosť" },
            { value: "none", label: "Bez sedačky / podsedáku" },
            { value: "booster-22-36", label: "Potrebuje podsedák 22–36 kg" },
            { value: "seat-9-36", label: "Potrebuje sedačku 9–36 kg" },
            { value: "own-carrier", label: "Vlastné vajíčko – zákazník si prinesie vlastné" }
        ]
        : [
            { value: "", label: "Select an option" },
            { value: "none", label: "No child seat / booster needed" },
            { value: "booster-22-36", label: "Booster seat 22–36 kg required" },
            { value: "seat-9-36", label: "Child seat 9–36 kg required" },
            { value: "own-carrier", label: "Own infant carrier – customer must bring their own" }
        ];

    function getChildEquipmentSelects() {
        if (!childEquipmentList) return [];
        return Array.from(
            childEquipmentList.querySelectorAll(".booking-child-equipment-select")
        );
    }

    function updateLimitedEquipmentOptions() {
        const selects = getChildEquipmentSelects();

        selects.forEach(function (select) {
            Array.from(select.options).forEach(function (option) {
                if (option.value !== "seat-9-36" && option.value !== "booster-22-36") {
                    option.disabled = false;
                    return;
                }

                const usedByAnotherChild = selects.some(function (otherSelect) {
                    return otherSelect !== select && otherSelect.value === option.value;
                });

                option.disabled = usedByAnotherChild;
            });
        });
    }

    function renderChildEquipmentFields() {
        if (!childrenInput || !childEquipmentGroup || !childEquipmentList) return;

        const children = Math.max(
            0,
            Math.min(MAX_PASSENGERS, parseInt(childrenInput.value || "0", 10))
        );

        const previousValues = getChildEquipmentSelects().map(function (select) {
            return select.value;
        });

        childEquipmentList.innerHTML = "";

        if (children === 0) {
            childEquipmentGroup.hidden = true;
            return;
        }

        childEquipmentGroup.hidden = false;

        for (let i = 0; i < children; i++) {
            const label = document.createElement("label");
            label.className = "booking-check-field";

            const labelText = document.createElement("span");
            labelText.className = "booking-check-field-label";
            labelText.textContent =
                (lang === "sk" ? "Dieťa " : "Child ") + (i + 1);

            const select = document.createElement("select");
            select.className = "booking-child-equipment-select";
            select.required = true;

            childEquipmentOptions.forEach(function (item) {
                const option = document.createElement("option");
                option.value = item.value;
                option.textContent = item.label;
                select.appendChild(option);
            });

            if (previousValues[i]) {
                select.value = previousValues[i];
            }

            select.addEventListener("change", updateLimitedEquipmentOptions);

            label.appendChild(labelText);
            label.appendChild(select);
            childEquipmentList.appendChild(label);
        }

        updateLimitedEquipmentOptions();
    }

    function normalizePassengerCounts(changedInput) {
        if (!adultsInput || !childrenInput) return;

        let adults = Math.max(
            0,
            Math.min(MAX_PASSENGERS, parseInt(adultsInput.value || "0", 10))
        );
        let children = Math.max(
            0,
            Math.min(MAX_PASSENGERS, parseInt(childrenInput.value || "0", 10))
        );

        if (adults + children > MAX_PASSENGERS) {
            if (changedInput === adultsInput) {
                adults = Math.max(0, MAX_PASSENGERS - children);
            } else {
                children = Math.max(0, MAX_PASSENGERS - adults);
            }
        }

        adultsInput.value = String(adults);
        childrenInput.value = String(children);

        renderChildEquipmentFields();
    }

    if (adultsInput && childrenInput) {
        adultsInput.addEventListener("input", function () {
            normalizePassengerCounts(adultsInput);
        });
        childrenInput.addEventListener("input", function () {
            normalizePassengerCounts(childrenInput);
        });
        adultsInput.addEventListener("change", function () {
            normalizePassengerCounts(adultsInput);
        });
        childrenInput.addEventListener("change", function () {
            normalizePassengerCounts(childrenInput);
        });

        normalizePassengerCounts(null);
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
            "none": "bez sedacky / podsedaku",
            "seat-9-36": "potrebuje sedacku 9-36 kg",
            "booster-22-36": "potrebuje podsedak 22-36 kg",
            "own-carrier": "vlastne vajicko - zakaznik si prinesie vlastne"
        }
        : {
            "none": "no child seat / booster needed",
            "seat-9-36": "child seat 9-36 kg required",
            "booster-22-36": "booster seat 22-36 kg required",
            "own-carrier": "own infant carrier - customer will bring their own"
        };

    function buildSmsBody(values, status) {
        const flagLine = smsFlag[status];

        const requestLines = lang === "sk"
            ? [
                "Dobry den, mam zaujem o odvoz. (nezavazny dopyt)",
                "Odkial: " + values.from,
                "Kam: " + values.to,
                "Datum a cas: " + values.date + " " + values.time + " (SK cas)",
                "Dospeli: " + values.adults,
                "Deti: " + values.children,
                "Spolu cestujucich: " + values.totalPassengers
            ]
            : [
                "Hello, I would like to book a ride. (non-binding request)",
                "Pickup: " + values.from,
                "Destination: " + values.to,
                "Date and time: " + values.date + " " + values.time + " (SK time)",
                "Adults: " + values.adults,
                "Children: " + values.children,
                "Total passengers: " + values.totalPassengers
            ];

        if (values.childEquipment.length > 0) {
            requestLines.push("");

            values.childEquipment.forEach(function (item, index) {
                const text = seatLabels[item] || item;
                requestLines.push(
                    (lang === "sk" ? "Dieta " : "Child ") +
                    (index + 1) +
                    ": " +
                    text
                );
            });
        }

        requestLines.push(
            lang === "sk"
                ? "Vacsia batozina: " + yesNo(values.luggage)
                : "Larger luggage: " + yesNo(values.luggage)
        );

        requestLines.push(
            lang === "sk"
                ? "Domace zviera: " + yesNo(values.pet)
                : "Pet: " + yesNo(values.pet)
        );

        requestLines.push(
            lang === "sk"
                ? "Cislo letu: " + (values.flight || "-")
                : "Flight number: " + (values.flight || "-")
        );

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

        const adultsEl = document.getElementById("booking-adults");
        const childrenEl = document.getElementById("booking-children");

        const adults = parseInt(adultsEl.value || "0", 10);
        const children = parseInt(childrenEl.value || "0", 10);
        const totalPassengers = adults + children;

        if (
            adults < 0 ||
            children < 0 ||
            totalPassengers < 1 ||
            totalPassengers > MAX_PASSENGERS
        ) {
            resultBox.textContent = labels.capacity;
            resultBox.className = "booking-check-result booking-check-warning";
            return;
        }

        const childEquipment = getChildEquipmentSelects().map(function (select) {
            return select.value;
        });

        if (
            childEquipment.length !== children ||
            childEquipment.some(function (value) { return !value; })
        ) {
            resultBox.textContent = labels.missingChildEquipment;
            resultBox.className = "booking-check-result booking-check-warning";
            return;
        }

        const seatCount = childEquipment.filter(function (value) {
            return value === "seat-9-36";
        }).length;

        const boosterCount = childEquipment.filter(function (value) {
            return value === "booster-22-36";
        }).length;

        if (seatCount > 1 || boosterCount > 1) {
            resultBox.textContent = labels.missingChildEquipment;
            resultBox.className = "booking-check-result booking-check-warning";
            updateLimitedEquipmentOptions();
            return;
        }

        const values = {
            date: dateVal,
            time: timeVal,
            from: fromVal,
            to: toVal,
            adults: String(adults),
            children: String(children),
            totalPassengers: String(totalPassengers),
            childEquipment: childEquipment,
            luggage: document.getElementById("booking-luggage").checked,
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
