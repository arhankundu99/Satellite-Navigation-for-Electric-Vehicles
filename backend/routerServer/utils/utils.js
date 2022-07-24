
const travelSpeed = 90; //in kmph


function getDistanceBetweenCoordinates(lat1, lng1, lat2, lng2) {
    let latRad1 = (lat1 * Math.PI) / 180;
    let lngRad1 = (lng1 * Math.PI) / 180;
    let latRad2 = (lat2 * Math.PI) / 180;
    let lngRad2 = (lng2 * Math.PI) / 180;

    let diffLat = latRad2 - latRad1;
    let diffLng = lngRad2 - lngRad1;

    let u = Math.sin(diffLat / 2.0);
    let v = Math.sin(diffLng / 2.0);

    return 2.0 * 6400 * Math.asin(Math.sqrt(u * u + Math.cos(latRad1) * Math.cos(latRad2) * v * v));
}

function convertKmToMsTravel(distanceKm) {
    return Math.floor(((distanceKm / travelSpeed) * (60 * 60 * 1000)));
}

function timeToCharge(currCharge, targetCharge,
    rate, maxCharge){

    if(targetCharge < 0.8 * maxCharge){
        return  Math.floor((((targetCharge - currCharge) / rate) * (60 * 60 * 1000)));
    }
    
    //time to charge 80% of max charge + time to charge from 0.8 * maxCharge to targetCharge
    else{
        
        if(currCharge < 0.8 * maxCharge)
            return Math.floor(((((0.8 * maxCharge) - currCharge) / rate) * (60 * 60 * 1000))) + Math.floor(((((targetCharge) - (0.8 * maxCharge)) / (2 * rate)) * (60 * 60 * 1000)));
        else return Math.floor(((((targetCharge) - (0.8 * maxCharge)) / (2 * rate)) * (60 * 60 * 1000)));
    }
    return time
}

function msToHours(ms) { return (ms) / (60 * 60 * 1000); }

module.exports = {
    getDistanceBetweenCoordinates,
    convertKmToMsTravel,
    timeToCharge,
    msToHours
}
