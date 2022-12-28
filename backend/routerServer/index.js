const express = require('express');
const app = express();

const cors = require('cors');

const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const chargingStationsServiceAPI = process.env.CHARGING_STATIONS_SERVICE || 'http://localhost:3001/chargingStations';


//extract the electricVehicleRouter class
const ElectricVehicleRouter = require('./ElectricVehicleRouter/ElectricVehicleRouter');

//require axios to make http requests
const axios = require('axios').default;

//set to view engine to ejs (embedded javascript)
app.set('view engine', 'ejs');

app.set('views', path.join(__dirname, 'views'));

app.use(cors());


app.get('/route', async (req, res) => {

    //get the queries from the form
    const { source, destination, initialCharge = 320, minimumThresoldCharge = 0, maxCharge = initialCharge, minChargeAtDestination = 0, batterySwapping = false, plugType } = req.query;

    const chargingStationsDataSetAPI = `${chargingStationsServiceAPI}` + `?plugType=${plugType}&source=${source}&destination=${destination}`;
    const chargingStations = await axios.get(chargingStationsDataSetAPI);

    //initialise electricVehicleRouter object
    const electricVehicleRouter = new ElectricVehicleRouter(chargingStations.data);

    //build the graph
    await electricVehicleRouter.buildGraph();

    let electricVehicleRoute = null;

    //if source and destination fields are not empty
    if (source && destination) {
        //get the optimal route
        electricVehicleRoute = await electricVehicleRouter.getOptimalRoute(source, destination, parseInt(initialCharge), parseInt(minimumThresoldCharge), parseInt(maxCharge), parseInt(minChargeAtDestination), batterySwapping, plugType);
    }
    return res.send(electricVehicleRoute);
});


const port = process.env.PORT || 3000;

//start the server on the defined port
app.listen(port, () => {
    console.log("Server running on port: ", port);
})