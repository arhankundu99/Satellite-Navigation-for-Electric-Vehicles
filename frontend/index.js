
//select the relavant html elements
const submitButton = document.querySelector('#submitButton');

const noOptimalRouteParagraph = document.querySelector('#no-optimal-route-text');
const totalTimeToReachDestinationParagraph = document.querySelector('#total-time-to-reach-destination');
const resultContainer = document.querySelector('#result-container');

const optimalStopsTable = document.querySelector('.table');

//hide the displays of result
noOptimalRouteParagraph.style.display = "none";
totalTimeToReachDestinationParagraph.style.display = "none";
optimalStopsTable.style.display = "none";
//resultContainer.style.display = "none";


//Initialise the map platform
const platform = new H.service.Platform({
    apikey: 'SMVHcy45TbJ2MX8XDILYKcmZ6Fq2atwM1xOYpyN05Kc'
});
const defaultLayers = platform.createDefaultLayers();

//initialise the map
let map = initialiseMap();


submitButton.addEventListener('click', async (event) => {
    event.preventDefault();

    //select the form element for configuration parameters 
    const EVConfigurationParametersForm = document.getElementById('EVConfigurationParameters');

    //get the form data
    const EVConfigurationParametersFormData = new FormData(EVConfigurationParametersForm);

    let params = "";
    for (const [key, value] of EVConfigurationParametersFormData) {
        params += `${key}=${value}`;
        params += '&';
    }

    //get the battery swapping input value
    const batterySwapping = document.getElementById("batterySwapping").checked;
    params += `batterySwapping=${batterySwapping}`;

    const routingAPI = 'https://routing-service.onrender.com/route?';

    //invoke the routing server to get routing data
    const response = await fetch(`${routingAPI}${params}`);
    const routingData = await response.json();

    //display the stops in a table
    displayStopsInTable(routingData);

    //remove all the previous markers in map
    map.removeObjects(map.getObjects());

    //display all the stops in the map
    displayStopsInMap(routingData[3]);

    // prevRoutingData = routingData;

    // currDestination = document.getElementById("destination").value;
    // minimumThresoldCharge = document.getElementById("")
});

function displayStopsInTable(routingData) {
    resultContainer.style.display = "flex";

    //if there is no optimal route
    if (routingData.length == 0) {
        noOptimalRouteParagraph.style.display = "block";
        totalTimeToReachDestinationParagraph.style.display = "none";
        optimalStopsTable.style.display = "none";
        
    }

    else {
        noOptimalRouteParagraph.style.display = "none";
        totalTimeToReachDestinationParagraph.style.display = "inline-block";
        optimalStopsTable.style.display = "inline-block";

        const [stopNames, chargeTimes, totalTimeToReachDestination, chargingStationsLocations, weights, statesOfCharge] = routingData;

        totalTimeToReachDestinationParagraph.innerText = `Total Time to reach destination: ${totalTimeToReachDestination} hours`;

        const optimalStopsTableBody = document.querySelector('tbody');
        optimalStopsTableBody.innerHTML = "";

        for (let i = 0; i < stopNames.length; i++) {
            const tr = document.createElement('tr');

            const th = document.createElement('th');
            th.scope = "row";

            const td1 = document.createElement('td');
            const td2 = document.createElement('td');
            const td3 = document.createElement('td');

            th.innerText = stopNames[i];
            td1.innerText = chargeTimes[i];
            td2.innerText = weights[i];
            td3.innerText = statesOfCharge[i];

            tr.appendChild(th);
            tr.appendChild(td1);
            tr.appendChild(td2);
            tr.appendChild(td3);

            optimalStopsTableBody.appendChild(tr);
        }

    }
}


function initialiseMap() {
    //initialize a map - this map is centered over Europe
    const map = new H.Map(document.getElementById('map'),
        defaultLayers.vector.normal.map, {
        center: { lat: 35, lng: -100 },
        zoom: 4,
        pixelRatio: window.devicePixelRatio || 1
    });

    // make the map interactive
    // MapEvents enables the event system
    // Behavior implements default interactions for pan/zoom (also on mobile touch environments)
    const behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(map));

    // Create the default UI components
    const ui = H.ui.UI.createDefault(map, defaultLayers);

    // add a resize listener to make sure that the map occupies the whole container
    window.addEventListener('resize', () => map.getViewPort().resize());

    return map;
}




function displayStopsInMap(chargingStationsLocations) {
    // Get an instance of the routing service version 8:
    var router = platform.getRoutingService(null, 8);

    for (let i = 0; i < chargingStationsLocations.length - 1; i++) {
        // Create the parameters for the routing request:
        var routingParameters = {
            'routingMode': 'fast',
            'transportMode': 'car',
            // The start point of the route:
            'origin': `${chargingStationsLocations[i].lat},${chargingStationsLocations[i].lng}`,
            // The end point of the route:
            'destination': `${chargingStationsLocations[i + 1].lat},${chargingStationsLocations[i + 1].lng}`,
            // Include the route shape in the response
            'return': 'polyline'
        };

        // Call calculateRoute() with the routing parameters,
        // the callback and an error callback function (called if a
        // communication error occurs):
        router.calculateRoute(routingParameters, onResult,
            function (error) {
                alert(error.message);
            });
    }


}

// Define a callback function to process the routing response:
function onResult(result) {
    // ensure that at least one route was found
    if (result.routes.length) {
        let sections = result.routes[0].sections;
        for (let i = 0; i < sections.length; i++) {
            let section = sections[i];
            // Create a linestring to use as a point source for the route line
            let linestring = H.geo.LineString.fromFlexiblePolyline(section.polyline);

            // Create a polyline to display the route:
            let routeLine = new H.map.Polyline(linestring, {
                style: { strokeColor: 'blue', lineWidth: 3 }
            });

            // Create a marker for the start point:
            let startMarker = new H.map.Marker(section.departure.place.location);

            // Create a marker for the end point:
            let endMarker = new H.map.Marker(
                section.arrival.place.location
            );

            

            // Add the route polyline and the two markers to the map:
            map.addObjects([routeLine, startMarker, endMarker]);

            // Set the map's viewport to make the whole route visible:
            map.getViewModel().setLookAtData({ bounds: routeLine.getBoundingBox() });
        }
    }
};

