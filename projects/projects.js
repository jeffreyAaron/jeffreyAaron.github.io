// Content Data

let data = []

data.push({
    title: "Computer Vision Research",
    organization: "",
    img: "compterVisionResearch.png",
    href: "project_pages/computerVisionResearchHS.html"
});
data.push({
    title: "Boat Telemetry Network and Dashboard",
    organization: "Applied Engineering  -  Arcadia High School",
    img: "boatTelemetrySystemImage.jpg",
    href: "project_pages/boatTelemetrySystemProject.html"
});

data.push({
    title: "Arcadia High Virtual Student ID",
    organization: "App Development Team - Arcadia High School",
    img: "appDevNFCReaderImage.jpg",
    href: "project_pages/appDevNFCReader.html"
});
data.push({
    title: "Differential Drive Robot",
    organization: "",
    img: "differentialRobot.png",
    href: "project_pages/boatTelemetrySystemProject.html"
});
data.push({
    title: "Mini Watch",
    organization: "",
    img: "miniWatch.jpg",
    href: "project_pages/boatTelemetrySystemProject.html"
});
data.push({
    title: "Car",
    organization: "",
    img: "car.bmp",
    href: "project_pages/boatTelemetrySystemProject.html"
});
// data.push({
//     title: "Boat Telej",
//     organization: "",
//     img: "boatTelemetrySystemImage.jpg",
//     href: "project_pages/boatTelemetrySystemProject.html"
// });


function putInRow(content) {
    return `<div class="card">${content}</div>`
}

function getCardTemplate(title, organization, img, href){
    return `
    <div class="animatedUnderline" onclick="onClick('${href}')">
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
}

function onClick(link) {
    console.log("Open: " + link);
    window.open(link,"_self");
}

function generateContent() {
    var cardHtml = ["", "", ""];    
    for (let index = 0; index < data.length; index+=1) {
        console.log("Index: " + index);
        var col = index%3;
        const element = data[index];
        cardHtml[col] += getCardTemplate(element.title, element.organization, element.img, element.href);
    }

    projectsContent.insertAdjacentHTML("beforeend", putInRow(cardHtml[0]));
    projectsContent.insertAdjacentHTML("beforeend", putInRow(cardHtml[1]));
    projectsContent.insertAdjacentHTML("beforeend", putInRow(cardHtml[2]));


    
}