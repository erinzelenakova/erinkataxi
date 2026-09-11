// Erinka Taxi - non-binding SMS ride request with availability pre-check.
//
// The check combines usual ride times, busy intervals from the main Google
// Calendar, private extraAvailable intervals from a second Google Calendar,
// and manually configured long-term closures.
//
// IMPORTANT: This check NEVER turns the request into a confirmed booking.
// Clear times open the prepared SMS directly. Problematic / uncertain results
// require the customer to consciously choose "send request anyway" first.
// A booking is confirmed only after the driver verifies availability and price
// and the customer confirms.
//
// availability.js must be loaded before this file because this script uses:
//   - AVAILABILITY_API
//   - availabilityData.longTerm

document.addEventListener("DOMContentLoaded", function () {

    const openBtn = document.getElementById("open-booking-check");
    const panel = document.getElementById("booking-check-panel");
    const closeBtn = document.getElementById("booking-check-close");
    const form = document.getElementById("booking-check-form");

    if (!openBtn || !panel || !form) {
        return;
    }

    const lang = document.documentElement.lang === "en" ? "en" : "sk";

    const PHONE = "+421914208898";
    const TIME_ZONE = "Europe/Bratislava";
    const MAX_PASSENGERS = 4;
    const SMS_PREFIX = "[ERINKA TAXI / REQUEST]";

    // Usual public weekday pickup windows. Extra availability can open
    // additional one-off time periods without publishing the reason.
    const WEEKDAY_USUAL_WINDOWS = [
        { start: "03:00", end: "08:00" },
        { start: "16:00", end: "22:00" }
    ];

    // Approximate window around the requested pickup time used only for the
    // advisory conflict check.
    const WINDOW_BEFORE_MINUTES = 15;
    const WINDOW_AFTER_MINUTES = 30;

    const passengersInput = document.getElementById("booking-passengers");
    const childrenInput = document.getElementById("booking-children");
    const childEquipmentGroup = document.getElementById("booking-child-equipment-group");
    const childEquipmentList = document.getElementById("booking-child-equipment-list");

    // ---------------------------------------------------------------------
    // Europe/Bratislava wall-clock time -> UTC
    // ---------------------------------------------------------------------

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

    function zonedWallTimeToUtc(dateStr, timeStr, timeZone) {
        const naiveUtcMs = Date.parse(dateStr + "T" + timeStr + ":00Z");

        if (isNaN(naiveUtcMs)) {
            return new Date(NaN);
        }

        const naiveDate = new Date(naiveUtcMs);
        const offsetMs = getTimeZoneOffsetMs(naiveDate, timeZone);

        return new Date(naiveUtcMs - offsetMs);
    }

    // ---------------------------------------------------------------------
    // Localized labels
    // ---------------------------------------------------------------------

    const labels = lang === "sk"
        ? {
            checking: "Kontrolujem aktuálnu dostupnosť...",
            conflict: "⚠️ V blízkosti zvoleného času už mám inú jazdu alebo je termín blokovaný. Dostupnosť musím najprv preveriť. Žiadosť môžete odoslať aj tak – termín vám následne potvrdím alebo navrhnem iný čas.",
            clear: "✅ Zvolený čas je momentálne možné dopytovať. Konečnú dostupnosť a cenu ešte potvrdím. Otváram SMS...",
            outside: "🕒 Zvolený čas je mimo mojich bežných časov odvozov. Dostupnosť musím potvrdiť individuálne. Ak chcete, môžete napriek tomu odoslať nezáväzný dopyt.",
            weekend: "📅 Víkendové jazdy sú po dohode vopred. Dostupnosť a cenu vám musím najprv potvrdiť. Ak chcete, môžete odoslať nezáväzný dopyt.",
            unknown: "ℹ️ Dostupnosť sa nepodarilo automaticky overiť. Termín preto musím preveriť ručne. Ak chcete, môžete napriek tomu odoslať nezáväzný dopyt.",
            missing: "Vyplňte, prosím, dátum a čas jazdy.",
            missingRoute: "Vyplňte, prosím, odkiaľ a kam máte záujem o odvoz.",
            passengerCount: "Vyberte, prosím, 1 až 4 osoby.",
            childCount: "Počet detí nemôže byť vyšší ako celkový počet osôb.",
            childEquipmentMissing: "Vyberte, prosím, vybavenie pre každé dieťa.",
            childEquipmentLimit: "Pre jednu objednávku je k dispozícii najviac 1× sedačka 9–36 kg a 1× podsedák 22–36 kg.",
            child: "Dieťa",
            sendAnyway: "Odoslať dopyt aj tak"
        }
        : {
            checking: "Checking current availability...",
            conflict: "⚠️ I already have another ride around that time or the period is blocked. I need to check availability first. You can still send a request – I will then confirm the time or suggest another one.",
            clear: "✅ The selected time can currently be requested. Final availability and price will still be confirmed. Opening SMS...",
            outside: "🕒 The selected time is outside my usual ride times. I need to confirm availability individually. If you wish, you can still send a non-binding request.",
            weekend: "📅 Weekend rides are available by prior arrangement. I need to confirm availability and price first. If you wish, you can send a non-binding request.",
            unknown: "ℹ️ Availability could not be verified automatically. I therefore need to check the time manually. If you wish, you can still send a non-binding request.",
            missing: "Please fill in the date and time of the ride.",
            missingRoute: "Please fill in the pickup and destination.",
            passengerCount: "Please select 1 to 4 passengers.",
            childCount: "The number of children cannot exceed the total number of passengers.",
            childEquipmentMissing: "Please select the required equipment for every child.",
            childEquipmentLimit: "A maximum of 1× child seat 9–36 kg and 1× booster seat 22–36 kg is available per request.",
            child: "Child",
            sendAnyway: "Send request anyway"
        };

    const smsFlag = lang === "sk"
        ? {
            conflict: "POZOR - MOZNA CASOVA KOLIZIA / BLOKOVANY TERMIN (overim a potvrdim)",
            clear: "TERMIN JE MOZNE DOPYTOVAT - dostupnost a cenu potvrdim",
            outside: "MIMO BEZNYCH CASOV - dostupnost potvrdim individualne",
            weekend: "VIKEND - po dohode vopred, dostupnost potvrdim",
            unknown: "DOSTUPNOST NEOVERENA - potvrdim rucne"
        }
        : {
            conflict: "WARNING - POSSIBLE TIME CONFLICT / BLOCKED PERIOD (will confirm)",
            clear: "TIME CAN BE REQUESTED - availability and price will be confirmed",
            outside: "OUTSIDE USUAL HOURS - availability will be confirmed individually",
            weekend: "WEEKEND - by prior arrangement, availability will be confirmed",
            unknown: "AVAILABILITY NOT VERIFIED - will confirm manually"
        };

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
            { value: "own-carrier", label: "Own infant carrier – customer brings their own" }
        ];

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
            "own-carrier": "own infant carrier - customer brings their own"
        };

    // ---------------------------------------------------------------------
    // Panel controls
    // ---------------------------------------------------------------------

    openBtn.addEventListener("click", function () {
        panel.hidden = false;
        panel.scrollIntoView({ behavior: "smooth", block: "end" });
    });

    if (closeBtn) {
        closeBtn.addEventListener("click", function () {
            panel.hidden = true;
        });
    }

    // ---------------------------------------------------------------------
    // Passenger counts and per-child equipment selectors
    // ---------------------------------------------------------------------

    function parsePassengerCount(input, fallback) {
        if (!input) {
            return fallback;
        }

        const value = parseInt(input.value, 10);
        return Number.isFinite(value) ? value : fallback;
    }

    function updateChildrenOptions() {
        if (!passengersInput || !childrenInput) {
            return;
        }

        const passengers = Math.max(1, Math.min(MAX_PASSENGERS, parsePassengerCount(passengersInput, 1)));
        const previousChildren = Math.max(0, parsePassengerCount(childrenInput, 0));
        const selectedChildren = Math.min(previousChildren, passengers);

        childrenInput.innerHTML = "";

        for (let i = 0; i <= passengers; i += 1) {
            const option = document.createElement("option");
            option.value = String(i);
            option.textContent = String(i);
            childrenInput.appendChild(option);
        }

        childrenInput.value = String(selectedChildren);
    }

    function getChildEquipmentSelects() {
        if (!childEquipmentList) {
            return [];
        }

        return Array.from(childEquipmentList.querySelectorAll("select[data-child-equipment]"));
    }

    function updateLimitedEquipmentOptions() {
        const selects = getChildEquipmentSelects();

        const selectedValues = selects.map(function (select) {
            return select.value;
        });

        selects.forEach(function (select, index) {
            const seatOption = select.querySelector('option[value="seat-9-36"]');
            const boosterOption = select.querySelector('option[value="booster-22-36"]');

            if (seatOption) {
                seatOption.disabled = selectedValues.some(function (value, otherIndex) {
                    return otherIndex !== index && value === "seat-9-36";
                });
            }

            if (boosterOption) {
                boosterOption.disabled = selectedValues.some(function (value, otherIndex) {
                    return otherIndex !== index && value === "booster-22-36";
                });
            }
        });
    }

    function renderChildEquipmentFields() {
        if (!childrenInput || !childEquipmentGroup || !childEquipmentList) {
            return;
        }

        const childCount = Math.max(0, Math.min(MAX_PASSENGERS, parsePassengerCount(childrenInput, 0)));
        const previousValues = getChildEquipmentSelects().map(function (select) {
            return select.value;
        });

        childEquipmentList.innerHTML = "";

        if (childCount === 0) {
            childEquipmentGroup.hidden = true;
            return;
        }

        childEquipmentGroup.hidden = false;

        for (let i = 0; i < childCount; i += 1) {
            const label = document.createElement("label");
            label.className = "booking-check-field";

            const labelText = document.createElement("span");
            labelText.className = "booking-check-field-label";
            labelText.textContent = labels.child + " " + (i + 1);

            const select = document.createElement("select");
            select.dataset.childEquipment = String(i);
            select.required = true;

            childEquipmentOptions.forEach(function (item) {
                const option = document.createElement("option");
                option.value = item.value;
                option.textContent = item.label;
                select.appendChild(option);
            });

            if (previousValues[i] && childEquipmentOptions.some(function (item) {
                return item.value === previousValues[i];
            })) {
                select.value = previousValues[i];
            }

            select.addEventListener("change", updateLimitedEquipmentOptions);

            label.appendChild(labelText);
            label.appendChild(select);
            childEquipmentList.appendChild(label);
        }

        updateLimitedEquipmentOptions();
    }

    if (passengersInput && childrenInput) {
        passengersInput.addEventListener("change", function () {
            updateChildrenOptions();
            renderChildEquipmentFields();
        });

        childrenInput.addEventListener("change", function () {
            renderChildEquipmentFields();
        });

        updateChildrenOptions();
        renderChildEquipmentFields();
    }

    // ---------------------------------------------------------------------
    // SMS body
    // ---------------------------------------------------------------------

    function yesNo(checked) {
        if (lang === "sk") {
            return checked ? "ano" : "nie";
        }
        return checked ? "yes" : "no";
    }

    function buildSmsBody(values, status) {
        const flagLine = smsFlag[status];

        const childLines = values.childEquipment.map(function (equipment, index) {
            const prefix = lang === "sk" ? "Dieta " : "Child ";
            return prefix + (index + 1) + ": " + (seatLabels[equipment] || equipment);
        });

        const requestLines = lang === "sk"
            ? [
                "Dobry den, mam zaujem o odvoz. (nezavazny dopyt)",
                "Odkial: " + values.from,
                "Kam: " + values.to,
                "Datum a cas: " + values.date + " " + values.time + " (SK cas)",
                "Pocet osob: " + values.totalPassengers,
                "Z toho deti: " + values.children
            ].concat(childLines, [
                "Vacsia batozina: " + yesNo(values.luggage),
                "Domace zviera: " + yesNo(values.pet),
                "Cislo letu: " + (values.flight || "-")
            ])
            : [
                "Hello, I would like to request a ride. (non-binding request)",
                "Pickup: " + values.from,
                "Destination: " + values.to,
                "Date and time: " + values.date + " " + values.time + " (SK time)",
                "Passengers: " + values.totalPassengers,
                "Of which children: " + values.children
            ].concat(childLines, [
                "Larger luggage: " + yesNo(values.luggage),
                "Pet: " + yesNo(values.pet),
                "Flight number: " + (values.flight || "-")
            ]);

        return [SMS_PREFIX, flagLine, ""].concat(requestLines).join("\n");
    }

    function openSms(values, status) {
        const body = buildSmsBody(values, status);
        const encoded = encodeURIComponent(body);
        const fullSmsUrl = "sms:" + PHONE + "?&body=" + encoded;
        const fallbackSmsUrl = "sms:" + PHONE;

        window.location.href = fullSmsUrl;

        // Some browsers/devices do not support an SMS body in the URI.
        // If navigation did not happen, fall back to opening the SMS app
        // with only the phone number.
        setTimeout(function () {
            if (!document.hidden) {
                window.location.href = fallbackSmsUrl;
            }
        }, 1200);
    }

    function showManualSmsChoice(resultBox, values, status) {
        const actionWrap = document.createElement("div");
        actionWrap.className = "booking-check-result-action";

        const actionBtn = document.createElement("button");
        actionBtn.type = "button";
        actionBtn.className = "btn booking-check-send-anyway-btn";
        actionBtn.textContent = labels.sendAnyway;

        actionBtn.addEventListener("click", function () {
            actionBtn.disabled = true;
            openSms(values, status);
        });

        actionWrap.appendChild(actionBtn);
        resultBox.appendChild(actionWrap);
    }

    // ---------------------------------------------------------------------
    // Busy intervals
    // ---------------------------------------------------------------------

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

    function normalizeIntervals(items) {
        return (items || []).map(function (slot) {
            return {
                start: new Date(slot.start),
                end: new Date(slot.end)
            };
        }).filter(function (slot) {
            return !isNaN(slot.start.getTime()) && !isNaN(slot.end.getTime());
        });
    }

    async function getCalendarAvailability() {
        if (typeof AVAILABILITY_API === "undefined") {
            throw new Error("AVAILABILITY_API is not defined");
        }

        const response = await fetch(AVAILABILITY_API, { cache: "no-store" });

        if (!response.ok) {
            throw new Error("Availability API error " + response.status);
        }

        const data = await response.json();

        return {
            busy: normalizeIntervals(data.busy),
            extraAvailable: normalizeIntervals(data.extraAvailable)
        };
    }

    function timeToMinutes(value) {
        const parts = value.split(":");
        return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    }

    function getWallClockWeekday(dateStr) {
        return new Date(dateStr + "T00:00:00Z").getUTCDay();
    }

    function isWithinUsualRideTimes(dateStr, timeStr) {
        const weekday = getWallClockWeekday(dateStr);

        if (weekday === 0 || weekday === 6) {
            return false;
        }

        const minutes = timeToMinutes(timeStr);

        return WEEKDAY_USUAL_WINDOWS.some(function (window) {
            const start = timeToMinutes(window.start);
            const end = timeToMinutes(window.end);
            return minutes >= start && minutes <= end;
        });
    }

    function isWeekend(dateStr) {
        const weekday = getWallClockWeekday(dateStr);
        return weekday === 0 || weekday === 6;
    }

    function isInsideInterval(candidate, intervals) {
        const value = candidate.getTime();

        return intervals.some(function (interval) {
            return value >= interval.start.getTime() && value <= interval.end.getTime();
        });
    }

    function hasWindowConflict(candidate, intervals) {
        const windowStart = candidate.getTime() - WINDOW_BEFORE_MINUTES * 60 * 1000;
        const windowEnd = candidate.getTime() + WINDOW_AFTER_MINUTES * 60 * 1000;

        return intervals.some(function (interval) {
            const busyStart = interval.start.getTime();
            const busyEnd = interval.end.getTime();
            return windowStart <= busyEnd && windowEnd >= busyStart;
        });
    }

    // ---------------------------------------------------------------------
    // Form submit
    // ---------------------------------------------------------------------

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

        const totalPassengers = Math.max(1, Math.min(MAX_PASSENGERS, parsePassengerCount(passengersInput, 1)));
        const children = Math.max(0, parsePassengerCount(childrenInput, 0));

        if (totalPassengers < 1 || totalPassengers > MAX_PASSENGERS) {
            resultBox.textContent = labels.passengerCount;
            resultBox.className = "booking-check-result booking-check-warning";
            return;
        }

        if (children > totalPassengers) {
            resultBox.textContent = labels.childCount;
            resultBox.className = "booking-check-result booking-check-warning";
            return;
        }

        const childSelects = getChildEquipmentSelects();
        const childEquipment = childSelects.map(function (select) {
            return select.value;
        });

        if (children > 0 && (childEquipment.length !== children || childEquipment.some(function (value) {
            return !value;
        }))) {
            resultBox.textContent = labels.childEquipmentMissing;
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
            resultBox.textContent = labels.childEquipmentLimit;
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
            children: children,
            totalPassengers: totalPassengers,
            childEquipment: childEquipment,
            luggage: document.getElementById("booking-luggage").checked,
            pet: document.getElementById("booking-pet").checked,
            flight: document.getElementById("booking-flight").value.trim()
        };

        submitBtn.disabled = true;
        resultBox.textContent = labels.checking;
        resultBox.className = "booking-check-result booking-check-info";

        try {
            const calendarAvailability = await getCalendarAvailability();
            const longTerm = getLongTermIntervals();

            const busyConflict = hasWindowConflict(candidate, calendarAvailability.busy);
            const longTermConflict = hasWindowConflict(candidate, longTerm);
            const extraAvailable = isInsideInterval(candidate, calendarAvailability.extraAvailable);
            const usualTime = isWithinUsualRideTimes(dateVal, timeVal);
            const weekend = isWeekend(dateVal);

            let status;

            // Priority:
            // 1. A concrete busy booking always wins.
            // 2. A deliberate private Extra availability slot can override
            //    a general long-term closure / holiday.
            // 3. Long-term closures block the remaining times.
            // 4. Otherwise use the normal weekly ride schedule.
            if (busyConflict) {
                status = "conflict";
            } else if (extraAvailable) {
                status = "clear";
            } else if (longTermConflict) {
                status = "conflict";
            } else if (usualTime) {
                status = "clear";
            } else if (weekend) {
                status = "weekend";
            } else {
                status = "outside";
            }

            resultBox.textContent = labels[status];

            if (status === "clear") {
                resultBox.className = "booking-check-result booking-check-success";

                // Clear result: continue directly to the prepared SMS.
                setTimeout(function () {
                    openSms(values, status);
                }, 700);
            } else {
                if (status === "conflict") {
                    resultBox.className = "booking-check-result booking-check-warning";
                } else {
                    resultBox.className = "booking-check-result booking-check-neutral";
                }

                // Problematic / uncertain result: stop here so the customer
                // has time to understand that the ride is NOT confirmed.
                // SMS opens only after an explicit second action.
                showManualSmsChoice(resultBox, values, status);
            }

        } catch (error) {
            console.error("Booking availability check failed:", error);

            resultBox.textContent = labels.unknown;
            resultBox.className = "booking-check-result booking-check-neutral";

            // Fail-safe: do not jump straight into SMS when availability
            // could not be checked. Require an explicit customer action.
            showManualSmsChoice(resultBox, values, "unknown");

        } finally {
            submitBtn.disabled = false;
        }
    });
});
