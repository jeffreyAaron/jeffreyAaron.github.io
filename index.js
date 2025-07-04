window.onload = setUpFunctionality;

function setUpFunctionality() {
    setUpInterestsHoverFunctionality();
    setUpTimeline();
}


function setUpInterestsHoverFunctionality() {

    let homeInterestsList = document.getElementById('homeInterestsList');
    let homeInterestsSection = document.getElementById('homeInterestsSection');
    // Iterate through the interests lists and obtain each li element
    homeInterestsList.childNodes.forEach((listElement) => {
        // each list element has a data attribute called index that aligns the list element to the right homeInterestsInfo

        if (listElement.dataset != undefined) {

            let listIndex = listElement.dataset.index;
            let correspondingElement = findElementWithCorrespondingDataIndex(listIndex, homeInterestsSection);

            // Set on hover listener
            listElement.addEventListener("mouseover", () => {
                correspondingElement.style.opacity = "1";
                correspondingElement.style.transform = "scale(1.15, 1.15)";
                // correspondingElement.style.display = "block";
            })
            // Set on hover exit listener
            listElement.addEventListener("mouseout", () => {
                correspondingElement.style.opacity = "0";
                correspondingElement.style.transform = "scale(1, 1)";
                // correspondingElement.style.display = "none";
            })

        }

    })

}



// HELPER FUNCTIONS

function findElementWithCorrespondingDataIndex(dataIndex, elementGroupToSearch) {
    var node = null;
    elementGroupToSearch.childNodes.forEach((childNode) => {
        if (childNode.dataset != null) {
            if (childNode.dataset.index === dataIndex) {
                node = childNode;
            }
        }
    });

    return node;
}

// Timeline functionality
function setUpTimeline() {
    // Add scroll reveal animation for timeline items
    const timelineItems = document.querySelectorAll('.timeline-item');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateX(0)';
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });
    
    timelineItems.forEach(item => {
        observer.observe(item);
    });
}