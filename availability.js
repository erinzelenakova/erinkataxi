const availabilityData = {
    enabled: true,

    shortTerm: [
        {
            date: "25. 08. 2026",
            time: "15:00 – 18:00",
            icon: "🔒",
            text_sk: "Obsadený termín.",
            text_en: "Fully booked."
        },
        {
            date: "26. 08. 2026",
            time: "15:00 – 20:00",
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
            date: "08. 09. 2026",
            time: "07:30 – 08:30",
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

    if (!availabilityData.enabled) {
        box.style.display = "none";
        return;
    }

    const lang = document.documentElement.lang === "en" ? "en" : "sk";

    let html = "";

    html += lang === "sk"
        ? "<h3>📅 Zmeny v dostupnosti</h3>"
        : "<h3>📅 Availability updates</h3>";


    /* KRÁTKODOBÉ OBMEDZENIA */

    if (availabilityData.shortTerm.length > 0) {

        html += lang === "sk"
            ? "<strong>Krátkodobé obmedzenia</strong>"
            : "<strong>Short-term availability changes</strong>";

        availabilityData.shortTerm.forEach(function (item) {
            html += '<p class="availability-row">';

            html += item.icon + " <strong>" + item.date + "</strong>";

            if (item.time) {
                html += " • " + item.time;
            } else if (item.time_sk || item.time_en) {
                html += " • " + (lang === "sk" ? item.time_sk : item.time_en);
            }

            html += " • ";

            html += lang === "sk"
                ? item.text_sk
                : item.text_en;

            html += "</p>";
        });
    }


    /* DLHODOBÉ OBMEDZENIA */

    if (availabilityData.longTerm.length > 0) {

        html += lang === "sk"
            ? '<strong class="availability-longterm-title">Dlhodobejšie obmedzenia</strong>'
            : '<strong class="availability-longterm-title">Long-term availability changes</strong>';            

        availabilityData.longTerm.forEach(function (item) {
            html += '<p class="availability-row">';

            html += item.icon + " <strong>" + item.date + "</strong>";

            if (item.time) {
                html += " • " + item.time;
            } else if (item.time_sk || item.time_en) {
                html += " • " + (lang === "sk" ? item.time_sk : item.time_en);
            }

            html += " • ";

            html += lang === "sk"
                ? item.text_sk
                : item.text_en;

            html += "</p>";


            if (item.nextAvailableDate) {
                html += '<p class="availability-row">';

                if (lang === "sk") {
                    html += "✅ Nové objednávky po dovolenke prijímam od <strong>" +
                        item.nextAvailableDate;

                    if (item.nextAvailableTime) {
                        html += " od " + item.nextAvailableTime;
                    }

                    html += "</strong>.";
                } else {
                    html += "✅ I am accepting new bookings again from <strong>" +
                        item.nextAvailableDate;

                    if (item.nextAvailableTime) {
                        html += " at " + item.nextAvailableTime;
                    }

                    html += "</strong>.";
                }

                html += "</p>";
            }
        });
    }


    box.innerHTML = html;
    box.style.display = "block";
});
