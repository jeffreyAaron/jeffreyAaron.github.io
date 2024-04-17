// Content Data

let data = []
data.push({
    title: "Boat Telemetry Network and Dashboard",
    organization: "Applied Engineering  -  Arcadia High School",
    img: "boatTelemetrySystemImage.jpg",
    href: "project_pages/boatTelemetrySystemProject.html"
});


data.push({
    title: "Computer Vision Research",
    organization: "",
    img: "compterVisionResearch.png",
    href: "project_pages/computerVisionResearchHS.html"
});
data.push({
    title: "Arcadia High Virtual Student ID",
    organization: "App Development Team - Arcadia High School",
    img: "appDevNFCReaderImage.jpg",
    href: "project_pages/appDevNFCReader.html"
});
// data.push({
//     title: "Boat Tele",
//     organization: "Applied Engineering",
//     img: "boatTelemetrySystemImage.jpg",
//     href: "project_pages/boatTelemetrySystemProject.html"
// });
// data.push({
//     title: "Boat Telej",
//     organization: "Applied Engineering",
//     img: "boatTelemetrySystemImage.jpg",
//     href: "project_pages/boatTelemetrySystemProject.html"
// });


function putInRow(content) {
    return `<div class="cardRow">${content}</div>`
}

function getCardTemplate(title, organization, img, href){
    return `
    <div class="card animatedUnderline" onclick="onClick('${href}')">
        <div class="cardContent mouse-cursor-gradient-tracking">
            <img class="cardImage" src="${img}"/>
            <h2><a>${title}</a></h2>
            <p><small>${organization}</small></p>

        </div>
    </div>
    `
}



// Content Generation

var projectsContent;

window.onload = () => {
    projectsContent = document.getElementById("projectsContent");
    generateContent();
    console.log("hi")
}

function onClick(link) {
    console.log("Open: " + link);
    window.open(link,"_self");
}

function generateContent() {

    for (let row = 0; row < Math.ceil(data.length/3.); row+=1) {
        console.log("Row: " + row);
        var innerRow = "";
        for (let index = row*3; index < Math.min(row*3+3, data.length); index+=1) {
            console.log("Index: " + index);

            const element = data[index];
            innerRow += getCardTemplate(element.title, element.organization, element.img, element.href);
        }
        innerRow = putInRow(innerRow);
        projectsContent.insertAdjacentHTML("beforeend", innerRow);

    }
    
}