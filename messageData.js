
var msgText = 0
var msg = 0

var count = 0

window.onload = () => {
    msgText = document.getElementById("msg")
    var url = window.location.search
    var urlParams = new URLSearchParams(url);
    msg = urlParams.get("msg")
    if(msg != null) {
        msgText.style.visibility = "hidden"
    }

    document.getElementById("btn").onclick = (event) => {

        console.log(url)
        updateView()
    };
}


function updateView() {
    msgText.textContent = msg.substring(0, count)

    count++

    msgText.style.visibility = "visible"

    if(count <= msg.length) {
        setTimeout(updateView, 250)
    }
}

