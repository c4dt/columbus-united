import { Roster } from "@dedis/cothority/network";
import { StatusRPC } from "@dedis/cothority/status";
import * as d3 from "d3";


/**
 * The class that displays the status of the nodes of the Roster and the statistics 
 * of the Chain underneath the chain (inside an Accordion)
 * 
 * @author Sophia Artioli (sophia.artioli@epfl.ch)
 * @author Noémien Kocher (noémien.kocher@epfl.ch)
 */

export class Status {


    roster: Roster;

    constructor(roster: Roster) {

        this.roster = roster;

        const statusBlockContainer = d3.select("#status");
        //append list item of accordion that will contain all the elements
        const statusContainerLi = statusBlockContainer.append("li")
            .attr("id", "statusLi")
            .attr("class", "uk-open");

        const statusContainerTitle = statusContainerLi.append("a")
            .attr("class", "uk-accordion-title")
            .attr("href", "#");

        statusContainerTitle
            .append("h3")
            .attr("style", "font-weight: 700; font-size: 1.1em; margin-bottom : 15px;")
            .text(" Status of the Skipchain");

        const mainDiv = statusContainerLi.append("div")
            .attr("class", "uk-accordion-content")
            .attr("id", "status-div");

        //list of status of nodes
        const statusRPC = new StatusRPC(roster);

        //create table of nodes status
        const nodeTable = mainDiv.append("table")
            .attr("id", "node-table")
            .attr("class", "uk-table uk-table-small uk-table-divider");

        nodeTable.append("caption")
            .text("Status of Roster's nodes");
        const tableHeader = nodeTable.append("thead").append("tr");
        tableHeader.append("th")
            .text("Name");
        tableHeader.append("th")
            .text("Host");
        tableHeader.append("th")
            .text("Uptime");



        //statusRPC.getStatus(0).then(s => console.log(s));
        const tableBody = nodeTable.append("tbody");

        const nodeLastIndex = Object.keys(statusRPC["conn"]).length - 1;
        
        //console.log(Object.keys(statusRPC).entries)
        for (let i = 0; i < nodeLastIndex; i++) {
            statusRPC.getStatus(i).then(
                (status) => {
                    const tableElement = tableBody.append("tr");
                    const elementName = tableElement.append("td");
                    
                    //name (+advanced infos on hover)
                    const uptime= status.getStatus("Generic").getValue("Uptime");
                    const [uptimeString, uptimeSeconds] = parseTime(uptime);

                    const Tx_bps =(parseInt(status.getStatus("Generic").getValue("TX_bytes"))/ parseInt(uptimeSeconds)).toFixed(3);
                    const Rx_bps =(parseInt(status.getStatus("Generic").getValue("RX_bytes"))/ parseInt(uptimeSeconds)).toFixed(3);
                    const infoList = 
                        ["ConnType " + status.getStatus("Generic").getValue("ConnType"),
                        "Port " + status.getStatus("Generic").getValue("Port"), 
                        "Version " + status.getStatus("Conode").getValue("version"),
                        "Tx/Rx " + Tx_bps + " Bps/ " + Rx_bps + " Bps"];
                    
                   
                    elementName.append("p")
                        .attr("style", "color: lightgreen;font-weight: bold;")
                        .text(status.serverIdentity.description)
                        .attr("uk-tooltip",infoList.join("<br/>"));
                    //host
                    tableElement.append("td")
                        .text(status.getStatus("Generic").getValue("Host"));
                    //uptime
                    
                    tableElement.append("td")
                        .text(uptimeString);
                    

                })
                .catch(error => {
                    console.log(status);
                    const downNode = statusRPC["conn"][i];
                    const tableElement = tableBody.append("tr");
                    const elementName = tableElement.append("td");
                    elementName.append("p")
                        .attr("style", "color: #a63535;font-weight: bold;")
                        .text(downNode.url.origin);
                    tableElement.append("td").text(downNode.url.hostname);
                    
                    tableElement.append("td").text("");
                });

        }

    // function that converts xxxhxxmxxxs to number of days,hours or minutes
    function parseTime(uptime : string){

        const hours = parseInt(uptime.match(/([0-9]+)*(?=h)/)[0]);
        const minutes = parseInt(uptime.match(/([0-9]+)*(?=m)/)[0]);
        
        var resultingText = "";
        if(hours > 24){
            var days= Math.floor(hours/24.);
            if(days > 1)
                resultingText = days + " days";
            else
                resultingText = days + " day";

        }
        else if (hours >= 1){
            
            resultingText = hours +  " hours";
        }
        else{
            var totalMinutes = hours*60 + minutes;
            resultingText = totalMinutes + " minutes";
        }
        const totalSeconds = (hours*60*60 + minutes * 60 + parseInt(uptime.match(/([0-9.]+)*(?=s)/)[0])).toString();
        console.log(uptime);
        console.log(totalSeconds);
        return [resultingText,totalSeconds];
    }

    }


}
