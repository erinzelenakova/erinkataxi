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
let reviewIntervalId = null;
let reviewTransitionTimeoutId = null;


function renderReview() {
    textElement.textContent = `“${data.reviews[currentReview]}”`;
}


function nextReview() {
    textElement.classList.add("review-hidden");

    reviewTransitionTimeoutId = setTimeout(() => {
        currentReview = (currentReview + 1) % data.reviews.length;

        renderReview();

        textElement.classList.remove("review-hidden");
        reviewTransitionTimeoutId = null;
    }, 350);
}


function stopReviewRotation() {
    if (reviewIntervalId !== null) {
        clearInterval(reviewIntervalId);
        reviewIntervalId = null;
    }

    if (reviewTransitionTimeoutId !== null) {
        clearTimeout(reviewTransitionTimeoutId);
        reviewTransitionTimeoutId = null;
        textElement.classList.remove("review-hidden");
    }
}

function startReviewRotation() {
    stopReviewRotation();

    if (document.hidden) {
        return;
    }

    reviewIntervalId = setInterval(nextReview, 6000);
}

titleElement.textContent = data.title;
renderReview();
startReviewRotation();

document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
        stopReviewRotation();
        return;
    }

    // Keep the current review visible and start a fresh six-second cycle.
    startReviewRotation();
});
