// Takes in name of csv and populates necessary data in table
function readFromCSV(path) {
  var rawFile = new XMLHttpRequest();
  rawFile.open("GET", path, false);
  rawFile.onreadystatechange = function() {
    if (rawFile.readyState === 4) {
      if (rawFile.status === 200 || rawFile.status == 0) {
        let allText = rawFile.responseText;
        let out = CSV.parse(allText);
        let trainees = convertCSVArrayToTraineeData(out);
        renderList(trainees);
      }
    }
  };
  rawFile.send(null);
}

// Takes in an array of trainees and converts it to js objects
// Follows this schema:
/*
trainee: {
  id: ... // position in csv used for simple recognition
  name_romanized: ...
  name_hangul: ...
  name_japanese: ...
  company: ...
  grade: a/b/c/d/f
  birthyear: ...
  image: ...
  selected: false/true // whether user selected them
  eliminated: false/true
  top11: false/true
}
*/
function convertCSVArrayToTraineeData(csvArrays) {
  trainees = csvArrays.map(function(traineeArray, index) {
    trainee = {};
    trainee.image = traineeArray[0] + ".jpg";
    trainee.name_romanized = traineeArray[1];
    trainee.name_hangul = traineeArray[1];
    trainee.name_japanese = traineeArray[2];
    trainee.company = traineeArray[4];
    trainee.grade = traineeArray[5];
    trainee.birthyear = traineeArray[6];
    trainee.eliminated = traineeArray[7] === 'e'; // sets trainee to be eliminated if 'e' appears in 6th col
    trainee.top11 = traineeArray[8] === 't'; // sets trainee to top 11 if 't' appears in 6th column
    trainee.id = index
    return trainee;
  });
  filteredTrainees = trainees;
  return trainees;
}

// Uses populated local data structure from getRanking to populate ranking
function renderList(trainee) {
  let listTrainee = document.getElementById("trainee__list");
  for (let i = 0; i < trainee.length; i++) {
    listTrainee.insertAdjacentHTML("beforeend", renderListEntry(trainee[i]))
    document.getElementById("list__entry-trainee-"+ i)
      .addEventListener("click", function (event) {
        var currentGrade = getCurrentGrade(getGradeOfTrainee(i));
        var hasA = false;
        for (let j = 0; j < trainee.length; j++) {
          if(getCurrentGrade(getGradeOfTrainee(j)) == "a"){
            hasA = true;
            break;
          }
        }
        var nextGrade = toggleGrade(currentGrade, hasA);
        setGradeToTrainee(i, nextGrade)
      });
  }
}

function getGradeOfTrainee(traineeIdToGet){
  return document.getElementById("list__entry-view-"+ traineeIdToGet).className;
}

function setGradeToTrainee(traineeIdToSet, traineeGradeToSet){
  document.getElementById("list__entry-view-"+traineeIdToSet).className = traineeGradeToSet+"-rank";
}

function getCurrentGrade(className){
  if(className.includes("a-rank")){
    return "a";
  }
  if(className.includes("b-rank")){
    return "b";
  }
  if(className.includes("c-rank")){
    return "c";
  }
  return "no";
}

function toggleGrade(currentGrade, hasA){
  if(currentGrade === "no"){
    return "c";
  }
  if(currentGrade === "c"){
    return "b";
  }
  if(currentGrade === "b"){
    if(hasA){
      return "no";
    }else{
      return "a";
    }
  }
  if(currentGrade === "a"){
    return "no";
  }
}

function renderListEntry(trainee) {
  let modifiedCompany = trainee.company;
  let eliminated = (showEliminated && trainee.eliminated) && "eliminated";
  let top11 = (showTop11 && trainee.top11) && "top11";
  const rankingEntry = `
  <div id="list__entry-trainee-${trainee.id}" class="list__entry ${eliminated}">
    <div id="list__entry-view-${trainee.id}" class="no-rank">
      <div class="list__entry-view">
        <div class="list__entry-icon">
          <img class="list__entry-img" src="assets/trainees/${trainee.image}" />
        </div>
      </div>
      <div class="list__row-text">
        <div class="name">${isJapanese?trainee.name_japanese:trainee.name_romanized}</div>
      </div>
    </div>
  </div>`;
  return rankingEntry;
}

const currentURL = "https://produce101japan.github.io/list.html";
// Serializes the ranking into a string and appends that to the current URL
function generateShareLink() {
  var shareCode= "";
  for (let j = 0; j < trainees.length; j++) {
    var grade = getCurrentGrade(document.getElementById("list__entry-view-"+ trainees[j].id).className);
    if(grade != "no"){
      shareCode += zeroPadding(j, 2) + grade;
    }
  }
  console.log(shareCode);
  shareCode = btoa(shareCode);
  console.log(shareCode.length);
  shareURL = currentURL + "?r=" + shareCode;
  showShareLink(shareURL);
}

function showShareLink(shareURL) {
  let shareBox = document.getElementById("getlink-textbox");
  shareBox.value = shareURL;
  document.getElementById("getlink-textbox").style.display = "block";
  document.getElementById("copylink-button").style.display = "block";
}

function copyLink() {
  let shareBox = document.getElementById("getlink-textbox");
  shareBox.select();
  document.execCommand("copy");
}

function setLang() {
  var urlParams = new URLSearchParams(window.location.search)
  if(urlParams.get("lang")){
    isJapanese = urlParams.get("lang") == "ja"
  }else{
    isJapanese = (window.navigator.userLanguage || window.navigator.language || window.navigator.browserLanguage).substr(0,2) == "ja" ;
  }
}

function setDate() {
  var today = new Date();
  var dateString = today.getFullYear()
                   + "/" + zeroPadding(today.getMonth() + 1, 2)
                   + "/" + zeroPadding(today.getDate() , 2)
                   + " " + zeroPadding(today.getHours() , 2)
                   + ":" + zeroPadding(today.getMinutes(), 2) ;

  document.getElementById("current_date").innerHTML =  (isJapanese?"":"at ") + dateString + (isJapanese?" 現在":"");
}

function zeroPadding(num, length){
  return ('0' + num).slice(-length);
}

function setGrades() {
  var urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has("r")) {
    let rankString = atob(urlParams.get("r")) // decode the saved ranking
    let rankingIds = [];
    for (let i = 0; i < rankString.length; i += 3) {
      let traineeId = rankString.substr(i, 2);
      let traineeGrade = rankString.substr(i+2, 1);
      setGradeToTrainee(Number(traineeId), traineeGrade)
    }
  }
}

// holds the list of all trainees
var trainees = [];
// holds the list of trainees to be shown on the table
var filteredTrainees = [];
// holds true if using japanese
var isJapanese = false;
setLang();
readFromCSV("./trainee_info.csv");
//getRanking();
setDate();
setGrades();
