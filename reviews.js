const reviewsData = {
    sk: {
        title: "Čo hovoria cestujúci",

        reviews: [
            "Absolute legend, best driver in the world im telling you.",
            "Erin is the perfect driver, very good drive, fair and a lot of tips over the city.",
            "Excellent driver. Safe and efficient. Great conversation!",
            "Skvelá pani taxikárka.",
            "Som veľmi príjemne prekvapená a chválim pani Erin."
        ]
    },

    en: {
        title: "What passengers say",

        reviews: [
            "Absolute legend, best driver in the world im telling you.",
            "Erin is the perfect driver, very good drive, fair and a lot of tips over the city.",
            "Excellent driver. Safe and efficient. Great conversation!"
        ]
    }
};


const language = document.documentElement.lang === "en" ? "en" : "sk";
const data = reviewsData[language];

const titleElement = document.getElementById("reviews-title");
const textElement = document.getElementById("review-text");

let currentReview = 0;


function renderReview() {
    textElement.textContent = `“${data.reviews[currentReview]}”`;
}


function nextReview() {
    textElement.classList.add("review-hidden");

    setTimeout(() => {
        currentReview = (currentReview + 1) % data.reviews.length;

        renderReview();

        textElement.classList.remove("review-hidden");
    }, 350);
}


titleElement.textContent = data.title;

renderReview();

setInterval(nextReview, 6000);