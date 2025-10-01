// Content Data

let data = []
data.push({
    title: "3D Gaussian Splatting",
    organization: "Implemented the paper \"3D Gaussian Splatting for Real-Time Radiance Field Rendering\"",
    img: "projects/3dgsProject.gif",
    href: "projects/project_pages/3dgsProject.html",
    externalLink: false,
    date: "Summer 2025"
})
// data.push({
//     title: "TFT Display Driver for Wearables",
//     organization: "Personal Project",
//     img: "projects/kicadWatchPCB.png",
//     href: "projects/project_pages/kicadWatchPCB.html",
//     externalLink: false,
//     date: "May 2025"
// })

data.push({
    title: "Boat Telemetry Network and Dashboard",
    organization: "Arcadia Applied Engineering Team",
    img: "projects/project_pages/boatTelemetrySystemImages/map.png",
    href: "projects/project_pages/boatTelemetrySystemProject.html",
    externalLink: false,
    date: "Summer 2024"
});
data.push({
    title: "Computer Vision Research",
    organization: "Built upon NVIDIA's \"End to End Learning for Self-Driving Cars\"",
    img: "projects/mini/compterVisionResearchMini.jpg",
    href: "projects/project_pages/computerVisionResearchHS.html",
    externalLink: false,
    date: "Summer 2023"
});
data.push({
    title: "Arcadia High Mobile App",
    organization: "Arcadia High Mobile",
    img: "projects/appDevBanner.png",
    href: "https://get.ahs.app",
    externalLink: true,
    date: "2023 - 2024"
});
data.push({
    title: "Arcadia High Virtual Student ID",
    organization: "Arcadia High Mobile",
    img: "projects/mini/appDevNFCReaderImageMini.jpg",
    href: "projects/project_pages/appDevNFCReader.html",
    externalLink: false,
    date: "Fall 2022"
});
// data.push({
//     title: "Fusion 360 Car",
//     organization: "",
//     img: "projects/carProject.PNG",
//     href: "projects/project_pages/carProject.html",
//     externalLink: false
// });
data.push({
    title: "Differential Drive Robot",
    organization: "Arcadia Science Olympiad",
    img: "projects/mini/differentialRobotMini.jpg",
    href: "projects/project_pages/differentialDriveRobot.html",
    externalLink: false,
    date: "Spring 2024"
});
data.push({
    title: "Mini Watch",
    organization: "Assembled and programmed the hardware and software for a mini watch",
    img: "projects/miniWatch.jpg",
    href: "projects/project_pages/miniWatch.html",
    externalLink: false,
    date: "2021"
});
// data.push({
//     title: "Inventor Car",
//     organization: "Personal Project",
//     img: "projects/carFrameRendered.bmp",
//     href: "projects/project_pages/carFrame.html",
//     externalLink: false
// });
// data.push({
//     title: "Boat Telej",
//     organization: "",
//     img: "projects/boatTelemetrySystemImage.jpg",
//     href: "projects/project_pages/boatTelemetrySystemProject.html"
// });


function putInRow(content) {
    return `<div class="card">${content}</div>`
}

function getCardTemplate(title, organization, img, href, externalLink, date){
    return `
    <div class="animatedUnderline" onclick="onClick('${href}')">
        <div class="cardContent mouse-cursor-gradient-tracking">
            <div class="cardDate"><b>${date}</b></div>
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
    for (let index = 0; index < data.length; index+=1) {
        const element = data[index];
        if(element.externalLink == true) {
            console.log(element.link + " " + link);
            if(element.href == link) {
                window.open(link,"_blank");
                return;
            }
        }
    }
    console.log("Open: " + link);
    window.open(link,"_self");
}

function generateContent() {
    var cardHtml = ["", "", ""];    
    for (let index = 0; index < data.length; index+=1) {
        console.log("Index: " + index);
        var col = index%3;
        const element = data[index];
        cardHtml[col] += getCardTemplate(element.title, element.organization, element.img, element.href, element.externalLink, element.date);
    }

    projectsContent.insertAdjacentHTML("beforeend", putInRow(cardHtml[0]));
    projectsContent.insertAdjacentHTML("beforeend", putInRow(cardHtml[1]));
    projectsContent.insertAdjacentHTML("beforeend", putInRow(cardHtml[2]));


    
}