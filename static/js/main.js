function menurun() {
    var getmenu = document.getElementById("menu");
    if (getmenu.style.display == "none") {
        getmenu.style.display = "block";
    }
    else {
        getmenu.style.display = "none";
    }
}
function insertValue(value) {
    var inputField = document.getElementById("chatspace");
    inputField.value = value;
}
var getsearch = document.getElementById("create");
getsearch.addEventListener("click", function () {
    insertValue("Create image");
});    
var getsearch = document.getElementById("summ");
getsearch.addEventListener("click", function () {
    insertValue("summarize text");
});    
var getsearch = document.getElementById("advice");
getsearch.addEventListener("click", function () {
    insertValue("get advice");
});    
var getsearch = document.getElementById("surprise");
getsearch.addEventListener("click", function () {
    insertValue("surprise Me");
});    
var getsearch = document.getElementById("More");
getsearch.addEventListener("click", function () {
    insertValue("More");
});    

function getfile() {
    var fileInput = document.getElementById("hiddenFileInput");
    fileInput.click();
}

var fileIcon = document.getElementById("file");
fileIcon.addEventListener("click", function () {
    getfile();
});

document.getElementById("hiddenFileInput").addEventListener("change", function (event) {
    console.log("Selected file:", event.target.files[0]); 
});


