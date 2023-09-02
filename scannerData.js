function isNumeric(str) {
    if (typeof str != "string") return false // we only process strings!  
    return !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
           !isNaN(parseFloat(str)) // ...and ensure strings of whitespace fail
  }

  var succText = 0
  var failText = 0

window.onload = () => {
    succText = document.getElementById("succ")
    failText = document.getElementById("fail")

    if(isNumeric(localStorage.getItem("succ")) && isNumeric(localStorage.getItem("fail"))){
        // alert("number")
    } else {
        // alert("not number")
        localStorage.setItem("succ", "0")
        localStorage.setItem("fail", "0")
    }

    document.getElementById("reset").onclick = () => {
        if(confirm("Do you want to reset all data?")) {
            localStorage.setItem("succ", "0")
            localStorage.setItem("fail", "0")
            updateView()
        }
    }

    updateView()
}


function updateView() {
    succText.textContent = "Scans completed: " + localStorage.getItem("succ")
    failText.textContent = "Scans failed: " + localStorage.getItem("fail")
}


function increment(prop) {
    var n = Number(localStorage.getItem(prop))    
    localStorage.setItem(prop, (n+1)+"");
}

document.addEventListener("keypress", function(event) {
    if (event.keyCode == 13) { // enter key
        increment("fail")
        increment("succ")
        updateView()
    } else if (event.keyCode == 32) { // enter key
        increment("succ")
        updateView()
    }
  });
