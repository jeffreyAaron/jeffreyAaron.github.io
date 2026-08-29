// Content Data

let data = []
data.push({
    title: "Project 0: Becoming Friends with Your Camera",
    organization: "Exploring perspective, focal length, and zoom through selfies, architecture, and a dolly zoom.",
    img: "mini/proj0Mini.jpg",
    href: "proj0/",
    externalLink: false
});


function getCardTemplate(title, organization, img, href, externalLink) {
    const badge = externalLink
        ? `<span class="gh-badge">External</span>`
        : `<span class="gh-badge">Public</span>`;

    return `
    <div class="gh-card" onclick="onClick('${href}')">
        <div class="gh-card-image-wrapper">
            <div class="gh-card-image-bg" style="background-image: url('${img}');"></div>
            <img class="gh-card-image" src="${img}" alt="${title}" loading="lazy"/>
        </div>
        <div class="gh-card-body">
            <div class="gh-card-header">
                <span class="gh-card-title">${title}</span>
                ${badge}
            </div>
            <p class="gh-card-desc">${organization}</p>
        </div>
    </div>
    `;
}


// Content Generation

var projectsContent;

document.addEventListener("DOMContentLoaded", () => {
    projectsContent = document.getElementById("projectsContent");
    generateContent();
});

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
    let gridItems = "";

    for (let index = 0; index < data.length; index += 1) {
        const el = data[index];
        gridItems += getCardTemplate(
            el.title, el.organization, el.img, el.href, el.externalLink
        );
    }

    projectsContent.insertAdjacentHTML("beforeend", `<div class="gh-grid">${gridItems}</div>`);
}
