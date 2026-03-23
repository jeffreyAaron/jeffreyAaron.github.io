// Content Data

let data = []
data.push({
    title: "3D Gaussian Splatting",
    organization: "Implemented the paper \"3D Gaussian Splatting for Real-Time Radiance Field Rendering\"",
    img: "projects/gaussianSplattingNumbered.gif",
    href: "projects/project_pages/3dgsProject.html",
    externalLink: false,
    date: "Summer 2025",
    language: "Python",
    langColor: "#3572A5"
})

data.push({
    title: "Boat Telemetry Network and Dashboard",
    organization: "Built a wireless sensor network and live web dashboard for the Arcadia Applied Engineering racing boat.",
    img: "projects/project_pages/boatTelemetrySystemImages/map.png",
    href: "projects/project_pages/boatTelemetrySystemProject.html",
    externalLink: false,
    date: "Summer 2024",
    language: "Python",
    langColor: "#3572A5"
});
data.push({
    title: "Computer Vision Research",
    organization: "Built upon NVIDIA's \"End to End Learning for Self-Driving Cars\" with custom datasets and augmentation.",
    img: "projects/mini/compterVisionResearchMini.jpg",
    href: "projects/project_pages/computerVisionResearchHS.html",
    externalLink: false,
    date: "Summer 2023",
    language: "Python",
    langColor: "#3572A5"
});
data.push({
    title: "Arcadia High Mobile App",
    organization: "School companion app with schedules, grades, and push notifications — deployed on the App Store.",
    img: "projects/appDevBanner.png",
    href: "https://get.ahs.app",
    externalLink: true,
    date: "2023 – 2024",
    language: "Swift",
    langColor: "#FA7343"
});
data.push({
    title: "Arcadia High Virtual Student ID",
    organization: "NFC-based virtual student ID system integrated into the school mobile app.",
    img: "projects/mini/appDevNFCReaderImageMini.jpg",
    href: "projects/project_pages/appDevNFCReader.html",
    externalLink: false,
    date: "Fall 2022",
    language: "Swift",
    langColor: "#FA7343"
});
data.push({
    title: "Differential Drive Robot",
    organization: "Designed and built an autonomous differential-drive robot for Arcadia Science Olympiad.",
    img: "projects/mini/differentialRobotMini.jpg",
    href: "projects/project_pages/differentialDriveRobot.html",
    externalLink: false,
    date: "Spring 2024",
    language: "C++",
    langColor: "#f34b7d"
});
data.push({
    title: "Mini Watch",
    organization: "Assembled and programmed the hardware and software for a custom mini watch from scratch.",
    img: "projects/miniWatch.jpg",
    href: "projects/project_pages/miniWatch.html",
    externalLink: false,
    date: "2021",
    language: "C",
    langColor: "#555555"
});


function getCardTemplate(title, organization, img, href, externalLink, date, language, langColor) {
    const badge = externalLink
        ? `<span class="gh-badge">External</span>`
        : `<span class="gh-badge">Public</span>`;

    return `
    <div class="gh-card" onclick="onClick('${href}')">
        <img class="gh-card-image" src="${img}" alt="${title}" loading="lazy"/>
        <div class="gh-card-body">
            <div class="gh-card-header">
                <span class="gh-card-title">${title}</span>
                ${badge}
            </div>
            <p class="gh-card-desc">${organization}</p>
            <div class="gh-card-meta">
                <span class="gh-lang">
                    <span class="gh-lang-dot" style="background-color: ${langColor};"></span>
                    ${language}
                </span>
                <span class="gh-date">${date}</span>
            </div>
        </div>
    </div>
    `;
}


// Content Generation

var projectsContent;

window.onload = () => {
    projectsContent = document.getElementById("projectsContent");
    generateContent();
}

function onClick(link) {
    for (let index = 0; index < data.length; index += 1) {
        const element = data[index];
        if (element.externalLink == true && element.href == link) {
            window.open(link, "_blank");
            return;
        }
    }
    window.open(link, "_self");
}

function generateContent() {
    const sectionTitle = `<h2 class="gh-section-title">Pinned Projects</h2>`;
    let gridItems = "";

    for (let index = 0; index < data.length; index += 1) {
        const el = data[index];
        gridItems += getCardTemplate(
            el.title, el.organization, el.img, el.href,
            el.externalLink, el.date, el.language, el.langColor
        );
    }

    // projectsContent.insertAdjacentHTML("beforeend", sectionTitle);
    projectsContent.insertAdjacentHTML("beforeend", `<div class="gh-grid">${gridItems}</div>`);
}
