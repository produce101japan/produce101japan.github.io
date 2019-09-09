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
    trainee.id = parseInt(traineeArray[0].split('_')[0]); // trainee id is the original ordering of the trainees in the first csv
    return trainee;
  });
  filteredTrainees = trainees;
  return trainees;
}

// Constructor for a blank trainee
function newTrainee() {
  return {
    id: -1, // -1 denotes a blank trainee spot
    name_romanized: '&#8203;', // this is a blank character
    name_japanese: '&#8203;', // this is a blank character
    company: '&#8203;', // this is a blank character
    grade: 'no',
    image: 'emptyrank.png',
  };
}

// Constructor for a blank ranking list
function newRanking() {
  // holds the ordered list of rankings that the user selects
  let ranking = new Array(99);
  for (let i = 0; i < ranking.length; i++) {
    ranking[i] = newTrainee();
  }
  return ranking;
}

// Clears out the ranking
function clearRanking() {
  // Currently just duplicates first ranking entry
  let ranking_chart = document.getElementById("ranking__pyramid");
  let rankRows = Array.from(ranking_chart.children).slice(1); // remove the title element
  // let rankEntry = rankRows[0].children[0];
  for (let i = 0; i < rowNums.length; i++) {
    let rankRow = rankRows[i];
    for (let j = 0; j < rowNums[i]; j++) {
      removeAllChildren(rankRow);
    }
  }
}

// Uses populated local data structure from getRanking to populate ranking
function renderList(trainee) {
  let listTrainee = document.getElementById("trainee__list");
  for (let i = 0; i < trainee.length; i++) {
      listTrainee.insertAdjacentHTML("beforeend", renderListEntry(trainee[i]))
    }
  }

function renderListEntry(trainee) {
  let modifiedCompany = trainee.company;
  let eliminated = (showEliminated && trainee.eliminated) && "eliminated";
  let top11 = (showTop11 && trainee.top11) && "top11";
  const rankingEntry = `
  <div class="list__entry ${eliminated}">
    <div class="list__entry-view">
      <div class="list__entry-icon">
        <img class="list__entry-img" src="assets/trainees/${trainee.image}" />
        <div class="list__entry-icon-border f-rank-border"></div>
      </div>
    </div>
    <div class="list__row-text">
      <div class="name">${isJapanese?trainee.name_japanese:trainee.name_romanized}</div>
    </div>
  </div>`;
  return rankingEntry;
}

// Uses populated local data structure from getRanking to populate ranking
function populateRanking() {
  // Currently just duplicates first ranking entry
  let ranking_chart = document.getElementById("ranking__pyramid");
  let rankRows = Array.from(ranking_chart.children).slice(1); // remove the title element
  // let rankEntry = rankRows[0].children[0];
  let currRank = 1;
  for (let i = 0; i < rowNums.length; i++) {
    let rankRow = rankRows[i];
    for (let j = 0; j < rowNums[i]; j++) {
      let currTrainee = ranking[currRank-1];
      rankRow.insertAdjacentHTML("beforeend", populateRankingEntry(currTrainee, currRank))

      let insertedEntry = rankRow.lastChild;
      let dragIcon = insertedEntry.children[0].children[0]; // drag icon is just the trainee image and border
      let iconBorder = dragIcon.children[1]; // this is just the border and the recipient of dragged elements
      // only add these event listeners if a trainee exists in this slot
      if (currTrainee.id >= 0) {
        // add event listener to remove item
        insertedEntry.addEventListener("click", function (event) {
          rankingClicked(currTrainee);
        });
        // add event listener for dragging
        dragIcon.setAttribute('draggable', true);
        dragIcon.classList.add("drag-cursor");
        dragIcon.addEventListener("dragstart", createDragStartListener(currRank - 1));
      }
      // add event listeners for blank/filled ranking entries
      iconBorder.addEventListener("dragenter", createDragEnterListener());
      iconBorder.addEventListener("dragleave", createDragLeaveListener());
      iconBorder.addEventListener("dragover", createDragOverListener());
      iconBorder.addEventListener("drop", createDropListener());
      // }
      currRank++;
    }
  }
}

// uses the current filter text to create a subset of trainees with matching info
function filterTrainees(event) {
  let filterText = event.target.value.toLowerCase();
  // filters trainees based on name, alternate names, and company
  filteredTrainees = trainees.filter(function (trainee) {
    let initialMatch = includesIgnCase(trainee.name_romanized, filterText)
      // || includesIgnCase(trainee.company, filterText)
      || includesIgnCase(trainee.name_hangul, filterText)
      || includesIgnCase(trainee.name_japanese, filterText);
    // if alernates exists then check them as well
    let alternateMatch = false;
    let alternates = alternateRomanizations[trainee.name_romanized.toLowerCase()]
    if (alternates) {
      for (let i = 0; i < alternates.length; i++) {
        alternateMatch = alternateMatch || includesIgnCase(alternates[i], filterText);
      }
    }
    return initialMatch || alternateMatch;
  });
  filteredTrainees = sortedTrainees(filteredTrainees);
  rerenderTable();
}

// Checks if mainString includes a subString and ignores case
function includesIgnCase(mainString, subString) {
  return mainString.toLowerCase().includes(subString.toLowerCase());
}

// Finds the first blank spot for
function addRankedTrainee(trainee) {
  for (let i = 0; i < ranking.length; i++) {
    if (ranking[i].id === -1) { // if spot is blank denoted by -1 id
      ranking[i] = trainee;
      return true;
    }
  }
  return false;
}

function removeRankedTrainee(trainee) {
  for (let i = 0; i < ranking.length; i++) {
    if (ranking[i].id === trainee.id) { // if trainee's match
      ranking[i] = newTrainee();
      return true;
    }
  }
  return false;
}

const currentURL = "https://produce101japan.github.io/";
// Serializes the ranking into a string and appends that to the current URL
function generateShareLink() {
  let shareCode = ranking.map(function (trainee) {
    let twoCharID = ("0" + trainee.id).slice(-2); // adds a zero to front of digit if necessary e.g 1 --> 01
    return twoCharID;
  }).join("");
  console.log(shareCode);
  shareCode = btoa(shareCode);
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

function zeroPadding(num,length){
  return ('0' + num).slice(-length);
}

// holds the list of all trainees
var trainees = [];
// holds the list of trainees to be shown on the table
var filteredTrainees = [];
// holds the ordered list of rankings that the user selects
var ranking = newRanking();
const rowNums = [8,8,8,8,8,8,8,8];
// holds true if using japanese
var isJapanese = false;
setLang();
//populateRanking();
readFromCSV("./trainee_info.csv");
//getRanking();
setDate();
