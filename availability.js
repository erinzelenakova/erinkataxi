// Erinka Taxi - shared availability data and renderer for SK/EN pages.
// Edit only the data block below for ordinary availability updates.

const availabilityData = {
    enabled: true,

    shortTerm: [
        {
            date: "01. 09. 2026",
            time: "05:00 – 08:00",
            icon: "🔒",
            text_sk: "Obsadený termín.",
            text_en: "Fully booked."
        },
        {
            date: "02. 09. 2026",
            time: "18:00 – 20:00",
            icon: "🔒",
            text_sk: "Obsadený termín.",
            text_en: "Fully booked."
        },
        {
            date: "03. 09. 2026",
            time: "15:00 – 22:00",
            icon: "🔒",
            text_sk: "Obsadený termín.",
            text_en: "Fully booked."
        },        
        {
            date: "04. 09. 2026",
            time: "12:00 – 18:00",
            icon: "⏳",
            text_sk: "Predbežne rezervované.",
            text_en: "Tentatively booked."
        },
        {
            date: "08. 09. 2026",
            time: "07:30 – 08:30",
            icon: "🔒",
            text_sk: "Obsadený termín.",
            text_en: "Fully booked."
        },
        {
            date: "16. 09. 2026",
            time: "16:30 – 22:30",
            icon: "🔒",
            text_sk: "Obsadený termín.",
            text_en: "Fully booked."
        },
        {
            date: "20. 09. 2026",
            time_sk: "celý deň",
            time_en: "all day",
            icon: "🔒",
            text_sk: "Obsadený termín.",
            text_en: "Fully booked."
        },
        {
            date: "21. 09. 2026",
            time: "15:00 – 18:30",
            icon: "🔒",
            text_sk: "Obsadený termín.",
            text_en: "Fully booked."
        }
    ],

    longTerm: [
        {
            date: "25. 09. – 11. 10. 2026",
            time: "",
            icon: "🌴",
            text_sk: "V tomto termíne budem na dovolenke.",
            text_en: "I will be on holiday during this period.",
            nextAvailableDate: "12. 10. 2026",
            nextAvailableTime: "04:00"
        }
    ]
};


document.addEventListener("DOMContentLoaded", function () {
    const box = document.getElementById("availability-notice");
    if (!box) return;

    const hasItems = availabilityData.shortTerm.length > 0 || availabilityData.longTerm.length > 0;
    if (!availabilityData.enabled || !hasItems) {
        box.style.display = "none";
        return;
    }

    const lang = document.documentElement.lang === "en" ? "en" : "sk";
    const labels = lang === "sk"
        ? {
            title: "📅 Výnimky a obsadené termíny",
            shortTerm: "Krátkodobé obmedzenia",
            longTerm: "Dlhodobejšie obmedzenia",
            nextBooking: "✅ Nové objednávky po dovolenke prijímam od"
        }
        : {
            title: "📅 Exceptions and booked time slots",
            shortTerm: "Short-term availability changes",
            longTerm: "Long-term availability changes",
            nextBooking: "✅ I am accepting new bookings again from"
        };

    function localizedTime(item) {
        if (item.time) return item.time;
        return lang === "sk" ? item.time_sk : item.time_en;
    }

    function localizedText(item) {
        return lang === "sk" ? item.text_sk : item.text_en;
    }

    function renderItem(item) {
        const time = localizedTime(item);
        return '<p class="availability-row">' +
            item.icon + ' <strong>' + item.date + '</strong>' +
            (time ? ' • ' + time : '') +
            ' • ' + localizedText(item) +
            '</p>';
    }

    let html = '<h3>' + labels.title + '</h3>';

    if (availabilityData.shortTerm.length > 0) {
        html += '<strong>' + labels.shortTerm + '</strong>';
        availabilityData.shortTerm.forEach(function (item) {
            html += renderItem(item);
        });
    }

    if (availabilityData.longTerm.length > 0) {
        html += '<strong class="availability-longterm-title">' + labels.longTerm + '</strong>';

        availabilityData.longTerm.forEach(function (item) {
            html += renderItem(item);

            if (item.nextAvailableDate) {
                const connector = lang === "sk" ? " od " : " at ";
                html += '<p class="availability-row">' + labels.nextBooking + ' <strong>' +
                    item.nextAvailableDate +
                    (item.nextAvailableTime ? connector + item.nextAvailableTime : '') +
                    '</strong>.</p>';
            }
        });
    }

    box.innerHTML = html;
    box.style.display = "block";
});
