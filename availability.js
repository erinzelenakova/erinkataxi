// Erinka Taxi - shared availability data and renderer for SK/EN pages.
// Short-term availability is loaded automatically from Google Calendar.
// Edit only the longTerm block below for holidays / longer closures.

const AVAILABILITY_API =
    "https://erinkataxi-status.erin-zelenakova-ke.workers.dev/availability?days=31";

const availabilityData = {
    enabled: true,

    // Filled automatically from Google Calendar.
    shortTerm: [],

    // Edit manually only for longer closures / holidays.
    longTerm: [
        {
            date: "24. 09. – 11. 10. 2026",
            time: "",
            icon: "🌴",
            text_sk: "V tomto termíne budem na dovolenke.",
            text_en: "I will be on holiday during this period.",
            nextAvailableDate: "12. 10. 2026",
            nextAvailableTime: "04:00"
        }
    ]
};


document.addEventListener("DOMContentLoaded", async function () {
    const box = document.getElementById("availability-notice");
    if (!box) return;

    const lang =
        document.documentElement.lang === "en" ? "en" : "sk";

    const labels = lang === "sk"
        ? {
            title: "📅 Výnimky a obsadené termíny",
            shortTerm: "Krátkodobé obmedzenia",
            longTerm: "Dlhodobejšie obmedzenia",
            nextBooking:
                "✅ Nové objednávky po dovolenke prijímam od"
        }
        : {
            title: "📅 Exceptions and booked time slots",
            shortTerm: "Short-term availability changes",
            longTerm: "Long-term availability changes",
            nextBooking:
                "✅ I am accepting new bookings again from"
        };


    function formatDate(date) {
        return new Intl.DateTimeFormat(
            lang === "sk" ? "sk-SK" : "en-GB",
            {
                timeZone: "Europe/Bratislava",
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            }
        ).format(date);
    }


    function formatTime(date) {
        return new Intl.DateTimeFormat(
            lang === "sk" ? "sk-SK" : "en-GB",
            {
                timeZone: "Europe/Bratislava",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false
            }
        ).format(date);
    }


    function localizedTime(item) {
        if (item.time) return item.time;

        return lang === "sk"
            ? item.time_sk
            : item.time_en;
    }


    function localizedText(item) {
        return lang === "sk"
            ? item.text_sk
            : item.text_en;
    }


    async function loadCalendarAvailability() {
        try {
            const response = await fetch(
                AVAILABILITY_API,
                {
                    cache: "no-store"
                }
            );

            if (!response.ok) {
                throw new Error(
                    "Availability API returned " +
                    response.status
                );
            }

            const data = await response.json();

            return (data.busy || []).map(function (slot) {
                const start = new Date(slot.start);
                const end = new Date(slot.end);

                return {
                    date: formatDate(start),
                    startTime: formatTime(start),
                    endTime: formatTime(end)
                };
            });

        } catch (error) {
            console.error(
                "Unable to load calendar availability:",
                error
            );

            return [];
        }
    }


    function groupShortTermByDate(items) {
        const grouped = {};

        items.forEach(function (item) {
            if (!grouped[item.date]) {
                grouped[item.date] = [];
            }

            grouped[item.date].push(item);
        });

        return grouped;
    }


    function renderShortTerm(items) {
        if (items.length === 0) {
            return "";
        }

        const grouped =
            groupShortTermByDate(items);

        let html =
            '<strong>' +
            labels.shortTerm +
            '</strong>';

        Object.keys(grouped).forEach(function (date) {
            html +=
                '<div class="availability-day-group">';

            html +=
                '<p class="availability-date">' +
                '<strong>' +
                date +
                '</strong>' +
                '</p>';

            grouped[date].forEach(function (item) {
                html +=
                    '<p class="availability-row">' +
                    '🔒 ' +
                    item.startTime +
                    ' – ' +
                    item.endTime +
                    '</p>';
            });

            html += '</div>';
        });

        return html;
    }


    function renderLongTerm() {
        if (
            availabilityData.longTerm.length === 0
        ) {
            return "";
        }

        let html =
            '<strong class="availability-longterm-title">' +
            labels.longTerm +
            '</strong>';

        availabilityData.longTerm.forEach(
            function (item) {
                const time =
                    localizedTime(item);

                html +=
                    '<p class="availability-row">' +
                    item.icon +
                    ' <strong>' +
                    item.date +
                    '</strong>' +
                    (time
                        ? ' • ' + time
                        : '') +
                    ' • ' +
                    localizedText(item) +
                    '</p>';

                if (item.nextAvailableDate) {
                    const connector =
                        lang === "sk"
                            ? " od "
                            : " at ";

                    html +=
                        '<p class="availability-row">' +
                        labels.nextBooking +
                        ' <strong>' +
                        item.nextAvailableDate +
                        (
                            item.nextAvailableTime
                                ? connector +
                                  item.nextAvailableTime
                                : ''
                        ) +
                        '</strong>.</p>';
                }
            }
        );

        return html;
    }


    availabilityData.shortTerm =
        await loadCalendarAvailability();

    const hasItems =
        availabilityData.shortTerm.length > 0 ||
        availabilityData.longTerm.length > 0;

    if (
        !availabilityData.enabled ||
        !hasItems
    ) {
        box.style.display = "none";
        return;
    }

    let html =
        '<h3>' +
        labels.title +
        '</h3>';

    html += renderShortTerm(
        availabilityData.shortTerm
    );

    html += renderLongTerm();

    box.innerHTML = html;
    box.style.display = "block";
});
