//intermediate path - compare to next location to find when done, request next image, etc.
//table for path, etc.
//distance between waypoints displayed for user
//load waypoints from file

//Routes
//GET currentLocation
//GET waypointImage
//POST stopServer/reset
//POST plannedPath with list of waypoints
//POST goHome

var urlBase = "http://utexas.edu/";

var map;
var labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789';
var planned;
var completed;
var markers = [];
var currImageId = 0;
var home;


function initMap() {
  //starting location set up
  home = new google.maps.LatLng({lat: 30.286403, lng: -97.736671});//gdc
  
  //map and listener setup
  map = new google.maps.Map(document.getElementById('map'), {
    center: home,
    zoom: 16
  });
  map.addListener('click', setWayPoint);

  //inital path setup

  var lineSymbol = {
    path: 'M 0,-1 0,1',
    strokeOpacity: 1,
    scale: 4
  };
  planned = new google.maps.Polyline({
            strokeColor: '#000000',
            strokeOpacity: 0,
            icons: [{
              icon: lineSymbol,
              offset: '0',
              repeat: '20px'
            }],
            strokeWeight: 3
  });
  planned.setMap(map);

  completed = new google.maps.Polyline({
            strokeColor: '#000000',
            strokeOpacity: 1.0,
            strokeWeight: 3
  });
  completed.setMap(map);
  planned.getPath().push(home);
  completed.getPath().push(home)
  //to add to completed just do 
  //completed.getPath().push(planned.getPath().b[1]); planned.getPath().removeAt(0);
  //which will first add the line to completed and then remove it from planned
  //the values 1 and 0 are constant in that line of code

  //inital location set up
  setWayPoint({latLng:home})
}

function setWayPoint(e) {
  var path = planned.getPath();
  var label;
  if(path.length > 0){
    var end = path.pop();
    path.push(e.latLng);
    path.push(end);
    label = labels[path.length - 2];
  }
  

  var marker = new google.maps.Marker({
    position: e.latLng,
    label: label,
    map: map
  });
  markers.push(marker);

  marker.addListener('click', removeWaypoint);

  appendWayPoint(label, e.latLng);

  if(path.length > 1 && google.maps.geometry){
    document.getElementById("totalDistance").innerText = google.maps.geometry.spherical.computeLength(planned.latLngs.b[0].b).toFixed(1) + " meters"
  }
}

function removeWaypoint(e) {
  if(e.latLng == home){
    console.log("Can not remove home location");
    return;
  }
  var toRemove = document.getElementById(e.latLng.toString());
  toRemove.parentNode.removeChild(toRemove);
  var tableNames = $('#locations td:nth-child(1)');
  for (var i = 1; i < tableNames.length; i++) {
    tableNames[i].innerHTML = labels[i - 1]
  }

  markers.filter(function (marker) {
      return marker.position === e.latLng;
  })[0].setMap(null);

  markers = markers.filter(function (marker) {
      return marker.position !== e.latLng;
  });

  for (var i = markers.length - 1; i >= 0; i--) {
    markers[i].setLabel(labels[i]);
  }

  var i = planned.getPath().b.indexOf(e.latLng);
  planned.getPath().removeAt(i);

  if(planned.getPath().length > 1 && google.maps.geometry){
    document.getElementById("totalDistance").innerText = google.maps.geometry.spherical.computeLength(planned.latLngs.b[0].b).toFixed(1) + " meters"
  }
}

function appendWayPoint(name, latLng){
  var table = document.getElementById("locations");
  var row = table.insertRow(planned.getPath().length - 1);
  row.setAttribute("id", latLng.toString())
  var waypoint = row.insertCell(0);
  var lat = row.insertCell(1);
  var lng = row.insertCell(2);

  waypoint.setAttribute("class", "waypoint-label");
  if(name != "A"){
    waypoint.setAttribute("class", "removable");
  }
  waypoint.innerHTML = name;
  waypoint.addEventListener('click', function(e){
    removeWaypoint({latLng:planned.getPath().b[labels.indexOf(e.path[0].innerHTML)]});
  });

  lat.innerHTML = latLng.lat();
  lng.innerHTML = latLng.lng();
}

function resetRequest() {
  $.post(urlBase + "reset-drone", {command: "stop"}, function() {
    console.log("Successfully reset");    
  });
}

function goHome() {
  $.post(urlBase + "go-home", {command: "stop"}, function() { //includ home location in post request
    console.log("Successfully reset");    
  });
}

function sendWaypoints() {
  var res = [];
  for (var i = planned.latLngs.b[0].b.length - 1; i >= 0; i--) {
    res.push({lat: planned.latLngs.b[0].b[i].lat(), lng: planned.latLngs.b[0].b[i].lat()});
  }
  $.post(urlBase + "send-waypoints", {waypoints: res}, function() {
    console.log("Successfully transmitted planned path");
  })
}

var rad = function(x) {
  return x * Math.PI / 180;
};

var getDistance = function(p1, p2) {
  var R = 6378137; // Earth’s mean radius in meter
  var dLat = rad(p2.lat() - p1.lat());
  var dLong = rad(p2.lng() - p1.lng());
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rad(p1.lat())) * Math.cos(rad(p2.lat())) *
    Math.sin(dLong / 2) * Math.sin(dLong / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c;
  return d; // returns the distance in meter
};

function addImage(imgSrc){
  // currImageId += 1;
  // addImage("http://dribbble.s3.amazonaws.com/users/322/screenshots/872485/coldchase.jpg");
  // currImageId += 1;
  // addImage("http://dribbble.s3.amazonaws.com/users/322/screenshots/599584/home.jpg");

  var slider = document.getElementById("slider");
  newChild = `<li>
                  <input type="radio" id="slide${currImageId}" name="slide" checked>
                  <label for="slide${currImageId}"></label>
                  <img src="${imgSrc}">
              </li>`;
  slider.innerHTML += newChild;
}

function getImage() {
  $.get(urlBase + 'currentImage', function (response) {
    console.log(response.image); //I don't know the format of the image
    if(response.image.id > currImageId){//has new image
      currImageId += 1;
      addImage(response.image.src);
    }
  });
}

(function pollLocation() {
  $.get(urlBase + 'currentLocation', function (response) {
    console.log(response.location.lat, response.location.lng);
    if(withinBounds(response.location.lat, response.location.lng)){ //haven't written withinBounds
      getImage();
      completed.getPath().push(planned.getPath().b[1]); planned.getPath().removeAt(0);
    }
    setTimeout(poll, 1000);
  });
}());