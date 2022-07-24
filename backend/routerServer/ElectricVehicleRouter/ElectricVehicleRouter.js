//require priority queue class
const PriorityQueue = require('js-priority-queue');

const {
    getDistanceBetweenCoordinates,
    convertKmToMsTravel,
    timeToCharge,
    msToHours
} = require('../utils/utils')

const Label = require('./Label.js');

class ElectricVehicleRouter {

    //constructor
    constructor(chargingStations) {
        this.chargingStations = chargingStations;

        //graph of charging stations
        this.graph = new Array(this.chargingStations.length);

        for (let i = 0; i < this.chargingStations.length; i++) {
            this.graph[i] = new Array();
        }
    }
    async buildGraph() {

        for (let i = 0; i < this.chargingStations.length; i++) {
            for (let j = i + 1; j < this.chargingStations.length; j++) {

                const routeDist = await this.getDistance(i, j);

                this.graph[i].push([j, routeDist]);
                this.graph[j].push([i, routeDist]);

            }
        }
    }

    getNodeID(nodeName) {
        for (let i = 0; i < this.chargingStations.length; i++) {
            if (this.chargingStations[i].name == nodeName)
                return i;
        }
        return -1;
    }

    getSelectedStations(sourceName, targetName) {

        const sourceStation = this.chargingStations[this.getNodeID(sourceName)];
        const targetStation = this.chargingStations[this.getNodeID(targetName)];

        let maxRadius = getDistanceBetweenCoordinates(sourceStation.lat, sourceStation.lon, targetStation.lat, targetStation.lon);
        let selectedStations = [];

        for (let i = 0; i < this.chargingStations.length; i++) {

            let currStation = this.chargingStations[i];

            let haversineDistance = getDistanceBetweenCoordinates(sourceStation.lat, sourceStation.lon, currStation.lat, currStation.lon)

            if (haversineDistance > maxRadius) continue;
            selectedStations.push(i);
        }

        return selectedStations;
    }

    async getOptimalRoute(sourceName, targetName, initialCharge, minimumThresoldCharge, maxCharge, minChargeAtDestination, batterySwapping, plugType) {


        //node map with key as node id and value as the array of nodes which can be considered in optimal route
        const labelMap = {};

        //visited map, if a node is previously visited, then the node is not considered again
        const visitedMap = {};

        let labelId = 0;

        //min heap
        const priorityQueue = new PriorityQueue({
            comparator: function (a, b) {
                if (a.totalWeight == b.totalWeight)
                    return b.stateOfCharge - a.stateOfCharge;
                return a.totalWeight - b.totalWeight;

            }
        });

        //This set contains the nodes which are dominated by other nodes 
        //(A node is dominated by other node if the weight and charge left both ar better than those of other node)
        const deletedLabels = new Set();

        //extract the source and destination node id
        const sourceNodeID = this.getNodeID(sourceName);
        const targetNodeID = this.getNodeID(targetName);

        //push the source node's node
        priorityQueue.queue(new Label(sourceNodeID, labelId++, 0, 0, initialCharge, sourceNodeID));

        while (priorityQueue.length != 0) {

            //get the top node from the queue
            const currLabel = priorityQueue.dequeue();

            //extract the node id of current node
            let currNodeID = currLabel.nodeID;

            //if this node is in the deletedLabels set or the node is already visited, do not consider this node  
            if (deletedLabels.has(currNodeID) || visitedMap[currNodeID]) {
                continue;
            }

            //push the node in visited set
            visitedMap[currNodeID] = currLabel;

            //if the current node is the target node
            if (currNodeID % this.chargingStations.length == targetNodeID) {
                break;
            }

            //get the charging station details in the current node
            const currStation = this.chargingStations[currNodeID % this.chargingStations.length];

            for (let edge of this.graph[currNodeID % this.chargingStations.length]) {
                const adjNodeID = edge[0];
                const distToNeighbour = edge[1];

                let minThresoldChargeForCurrentEdge = minimumThresoldCharge;
                
                //if the adjacentNode is the target node, then minThresold is max(minimumThresoldCharge, minChargeAtDestination)
                //because if we reach the target node, there should be atleast minChargeAtDestination Charge left
                if (adjNodeID == targetNodeID) {
                    minThresoldChargeForCurrentEdge = Math.max(minimumThresoldCharge, minChargeAtDestination);
                }


                //assuming we do not charge in the source node
                if (currLabel.nodeID == sourceNodeID && distToNeighbour > initialCharge - minThresoldChargeForCurrentEdge) continue;

                //if distance to this edge is greater than the max charge, then this edge cannot be considered
                if (distToNeighbour > maxCharge - minThresoldChargeForCurrentEdge) continue;

                //if this node is already visited, do not consider this node again
                if (visitedMap[adjNodeID]) {
                    continue;
                }

                //get the weight in ms
                const directWeightToNeighbor = convertKmToMsTravel(distToNeighbour);

                const labels = [];

                // check if we can go to the neighbour without charging
                if (distToNeighbour <= currLabel.stateOfCharge - minThresoldChargeForCurrentEdge) {
                    labels.push(new Label(adjNodeID, labelId++,
                        currLabel.totalWeight + directWeightToNeighbor, 0,
                        currLabel.stateOfCharge - distToNeighbour, currNodeID));
                }

                // Do a battery swapping if available and user has selected the battery swapping option
                if (batterySwapping == 'true' && currLabel.nodeID % this.chargingStations.length != sourceNodeID &&
                    currLabel.stateOfCharge < maxCharge &&
                    this.chargingStations[currLabel.nodeID % this.chargingStations.length].batterySwapping == 1) {

                    //push the label in the labels array
                    labels.push(
                        new Label(adjNodeID + this.chargingStations.length, labelId++,
                            currLabel.totalWeight + directWeightToNeighbor,
                            0, maxCharge - distToNeighbour, currNodeID));
                }

                // assuming we do not charge in the source node, consider doing full charge. 
                if (currLabel.nodeID % this.chargingStations.length != sourceNodeID && currLabel.stateOfCharge < maxCharge) {
                    //get the time to fully charge and add the wait time also
                    const chargingTime = parseInt(timeToCharge(currLabel.stateOfCharge, maxCharge, currStation.rate[plugType], maxCharge)) + parseInt(this.chargingStations[currLabel.nodeID % this.chargingStations.length].waitTime);

                    //push the label in the labels array
                    labels.push(
                        new Label(adjNodeID + (2 * this.chargingStations.length), labelId++,
                            currLabel.totalWeight + directWeightToNeighbor + chargingTime,
                            chargingTime, maxCharge - distToNeighbour, currNodeID));
                }

                // Charging till 80 %
                if (currLabel.nodeID % this.chargingStations.length != sourceNodeID && currLabel.stateOfCharge < 0.8 * maxCharge &&
                    (0.8 * maxCharge) - distToNeighbour >= minThresoldChargeForCurrentEdge) {
                    //get the time to fully charge and add the wait time also
                    const chargingTime = parseInt(timeToCharge(currLabel.stateOfCharge, 0.8 * maxCharge, currStation.rate[plugType], maxCharge)) + parseInt(this.chargingStations[currLabel.nodeID % this.chargingStations.length].waitTime);

                    //push the label in the labels array
                    labels.push(
                        new Label(adjNodeID + (3 * this.chargingStations.length), labelId++,
                            currLabel.totalWeight + directWeightToNeighbor + chargingTime,
                            chargingTime, (0.8 * maxCharge) - distToNeighbour, currNodeID));
                }

                // Assuming we do not charge in the source node, only charge enough to get to the adjacent node.
                if (currLabel.nodeID % this.chargingStations.length != sourceNodeID &&
                    currLabel.stateOfCharge < maxCharge &&
                    currLabel.stateOfCharge - minThresoldChargeForCurrentEdge < distToNeighbour) {

                    //get the time to charge. Add the wait time also
                    const chargingTime = parseInt(timeToCharge(currLabel.stateOfCharge, distToNeighbour + minThresoldChargeForCurrentEdge, currStation.rate[plugType], maxCharge)) + parseInt(this.chargingStations[currLabel.nodeID % this.chargingStations.length].waitTime);

                    //push the label in the labels array
                    labels.push(
                        new Label(adjNodeID + (4 * this.chargingStations.length), labelId++,
                            currLabel.totalWeight + directWeightToNeighbor + chargingTime,
                            chargingTime, minThresoldChargeForCurrentEdge, currNodeID));
                }

                //get the existing labels for the current adjacent node 
                let adjNodeLabels = labelMap[adjNodeID];

                //if there are no existing labels, push all the labels in the label queue
                if (!adjNodeLabels) {
                    for (const label of labels) {
                        priorityQueue.queue(label);
                    }

                    //update the label map
                    labelMap[adjNodeID] = labels;
                }

                else {
                    for (const label of labels) {

                        //if the label is already dominated by the existing labels, do not consider this label
                        if (this.isLabelDominated(adjNodeLabels, label)) {
                            continue;
                        }

                        //get the labels which are dominated by the current label
                        const dominatedLabels = this.getDominatedLabels(adjNodeLabels, label);

                        //add all the dominated labels in deletedLabels list
                        for (const dominatedLabel of dominatedLabels) {
                            deletedLabels.add(dominatedLabel.labelId);
                        }

                        //remove all the dominated lables from the label map
                        adjNodeLabels = adjNodeLabels.filter((id) => !deletedLabels.has(id));
                        adjNodeLabels.push(label);

                        labelMap[adjNodeID] = adjNodeLabels;

                        //add the label in the queue
                        priorityQueue.queue(label);

                    }
                }
            }
        }

        return this.buildOptimalRoute(visitedMap, sourceNodeID, targetNodeID)
    }

    buildOptimalRoute(visitedMap, sourceNodeID, targetNodeID) {
        //array of the stopNames of the nodes in optimal path
        const stopNames = [];

        //array of the charging times in optimal path
        const chargeTimes = [];

        let curr = visitedMap[targetNodeID];

        if (!curr)
            curr = visitedMap[targetNodeID + this.chargingStations.length];

        if (!curr)
            curr = visitedMap[targetNodeID + (2 * this.chargingStations.length)];

        if (!curr)
            curr = visitedMap[targetNodeID + (3 * this.chargingStations.length)];

        if (!curr)
            curr = visitedMap[targetNodeID + (4 * this.chargingStations.length)];

        //if there is no path possible from src to destination
        if (!curr) return [];



        const totalTimeToReachTarget = msToHours(curr.totalWeight).toFixed(2);

        const chargingStationsLocations = [];
        const weights = [];
        const statesOfCharge = [];

        //build the stopNames and charging times array
        while (curr.nodeID != sourceNodeID) {
            stopNames.push(this.chargingStations[curr.nodeID % this.chargingStations.length].name);
            chargeTimes.push(msToHours(curr.chargeTime).toFixed(2));

            chargingStationsLocations.push({
                "lat": this.chargingStations[curr.nodeID % this.chargingStations.length].lat,
                "lng": this.chargingStations[curr.nodeID % this.chargingStations.length].lon
            });

            weights.push(msToHours(curr.totalWeight).toFixed(2));
            statesOfCharge.push(curr.stateOfCharge.toFixed(2));

            curr = visitedMap[curr.parent];
        }

        //append the destination name
        stopNames.push(this.chargingStations[curr.nodeID].name);

        //assuming that we won't charge in the source node
        chargeTimes.unshift(0);

        chargingStationsLocations.push({
            "lat": this.chargingStations[curr.nodeID].lat,
            "lng": this.chargingStations[curr.nodeID].lon
        });

        weights.push(curr.totalWeight);
        statesOfCharge.push(curr.stateOfCharge.toFixed(2));

        return [stopNames.reverse(), chargeTimes.reverse(), totalTimeToReachTarget, chargingStationsLocations.reverse(), weights.reverse(), statesOfCharge.reverse()];
    }

    async getDistance(source, dest) {
        const sourceStation = this.chargingStations[source];
        const destStation = this.chargingStations[dest];
        // try{
        //     const baseURL = 'https://api.tomtom.com/routing/1/calculateRoute/';

        //     const routeDataApi = `${baseURL}${sourceStation.lat},${sourceStation.lon}:${destStation.lat},${destStation.lon}/json?key=${process.env.API_KEY}`;
        //     const routeData = await axios.get(routeDataApi);
        //     const travelDist = (routeData["data"]["routes"][0]["summary"]["lengthInMeters"] / 1000);

        //     return travelDist.toFixed(2);
        // }
        // catch(e){
        //     console.error(e);
        // }
        return getDistanceBetweenCoordinates(sourceStation.lat, sourceStation.lon, destStation.lat, destStation.lon);
    }

    //returns true if the label is dominated by the existing labels
    isLabelDominated(existingLabels, label) {
        for (let existingLabel of existingLabels) {
            if (existingLabel.totalWeight < label.totalWeight && existingLabel.stateOfCharge > label.stateOfCharge) {
                return true;
            }
        }
        return false;
    }

    //return the nodes which are dominated by the current node
    getDominatedLabels(existingLabels, node) {
        const dominatedLabels = [];

        for (let existingLabel of existingLabels) {
            if (node.totalWeight < existingLabel.totalWeight && node.stateOfCharge > existingLabel.stateOfCharge) {
                dominatedLabels.push(existingLabel);
            }
        }
        return dominatedLabels;
    }
}

module.exports = ElectricVehicleRouter;


