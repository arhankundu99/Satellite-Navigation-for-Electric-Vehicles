
class Label {
  constructor(nodeID, labelID, totalWeight, chargeTime,
        stateOfCharge, parent){
            this.nodeID = nodeID;
            this.labelID = labelID;
            this.totalWeight = totalWeight;
            this.chargeTime = chargeTime;
            this.stateOfCharge = stateOfCharge;
            this.parent = parent;
    }
};

module.exports = Label;