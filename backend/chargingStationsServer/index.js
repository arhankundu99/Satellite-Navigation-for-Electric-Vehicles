const express = require('express');
const app = express();

const cors = require('cors');

app.use(cors());


app.get('/chargingStations', (req, res) => {
    const {plugType, source, destination} = req.query;

    //require the dataset
    let network = require('./data/chargingStations');

    //filter the network according to the plug type
    network = network.filter((n) => {
        if(n.name == source || n.name == destination)return true;
        return n.availablePlugTypes.includes(plugType);
    });

    res.send(network);
})


const port = process.env.PORT || 3001;
app.listen(port, () => {
    console.log("Charging Stations server running on port:", port);
})