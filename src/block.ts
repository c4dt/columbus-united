import { CONFIG_INSTANCE_ID, Instruction } from "@dedis/cothority/byzcoin";
import { Spawn } from "@dedis/cothority/byzcoin/client-transaction";
import { DataBody, DataHeader, TxResult } from "@dedis/cothority/byzcoin/proto";
import { Roster } from "@dedis/cothority/network";
import { SkipBlock } from "@dedis/cothority/skipchain";
import * as d3 from "d3";
import { Observable, Subject } from "rxjs";
import { connectableObservableDescriptor } from "rxjs/internal/observable/ConnectableObservable";
import { throttleTime } from "rxjs/operators";
import UIkit from "uikit";
import { Chain } from "./chain";
import { Flash } from "./flash";
import { InstructionChain } from "./instructionChain";
import { Lifecycle } from "./lifecycle";
import { TotalBlock } from "./totalBlock";
import { Utils } from "./utils";
import * as blockies from "blockies-ts";

/**
 * the two containers for the details of the clicked block
 * and for the result of the browsing for one instance.
 * It will also highlights some blocks in the blockchain.
 * It also handles the loading screen with the progress bar
 * to be updated.
 *
 * @author Lucas Trognon <lucas.trognon@epfl.ch>
 * @author Julien von Felten <julien.vonfelten@epfl.ch>
 * @export
 * @class Block
 */
export class Block {
    // Observable for the clicked block
    skipBclickedSubject: Subject<SkipBlock>;

    clickedBlock: SkipBlock;
    colorClickedBlock: string;
    // Observable that notifies the updated blocks of blocksDiagram
    loadedSkipBObs: Observable<SkipBlock[]>;

    flash: Flash;
    lifecycle: Lifecycle;
    hashHighligh: SkipBlock[];

    roster: Roster;
    // progress bar
    progressBarContainer: d3.Selection<
        HTMLDivElement,
        unknown,
        HTMLElement,
        any
    >;
    progressBar: d3.Selection<HTMLDivElement, unknown, HTMLElement, any>;
    textBar: d3.Selection<HTMLDivElement, unknown, HTMLElement, any>;
    loadContainer: d3.Selection<HTMLDivElement, unknown, HTMLElement, any>;
    progressBarItem: HTMLElement;

    //code added
    totalBlock: TotalBlock;
    //

    /**
     * Creates an instance of DetailBlock.
     * @param {Observable<SkipBlock>} skipBclickedSubject : Observable for the clicked
     * block. We need this observable to know when a user has clicked on a block,
     * and then display the details of that block.
     * @param {Browsing} browsing
     * @param {Flash} flash
     * @param {Observable<SkipBlock[]>} loadedSkipBObs : Observable that is
     * notified when new blocks are loaded. This is necessary when we highlights
     * the blocks of an instance lifecycle, because if new blocks are added, some
     * may need to be highlighted.
     * @memberof DetailBlock
     */
    constructor(
        skipBclickedSubject: Subject<SkipBlock>,
        lifecycle: Lifecycle, //modfied
        flash: Flash,
        loadedSkipBObs: Observable<SkipBlock[]>,
        roster: Roster
        //totalBlock: TotalBlock //modified
    ) {
        const self = this;

        this.skipBclickedSubject = skipBclickedSubject;
        this.skipBclickedSubject.subscribe({
            next: this.listTransaction.bind(this),
        });

        this.clickedBlock = null;
        this.colorClickedBlock = "#006fff";

        this.roster = roster;

        this.loadedSkipBObs = loadedSkipBObs;

        this.flash = flash;
        this.lifecycle = lifecycle;
        this.hashHighligh = [];

        this.progressBarContainer = undefined;
        this.progressBar = undefined;
        this.textBar = undefined;
        this.loadContainer = undefined;
        this.progressBarItem = undefined;
    }

    /**
     * This function should be called once. It listens on new block clicks and
     * update the view accordingly, ie. by displaying the block info.
     */
    startListen() {
        const self = this;

        this.loadedSkipBObs.subscribe({
            next: (value) => {
                self.highlightBlocks(this.hashHighligh);
            },
        });
    }
    setSearch(search: void) {
        throw new Error("Method not implemented.");
    }

    /**
     * Display the list of all the transactions inside the clicked block.
     * It is triggered on click by the blocksDiagram class which notifies the
     * skipBclickedSubject observable. It also displays the details of the block
     * (verifiers, backlinks, forwardlinks).
     * A browse button to search for the instanceID of the instruction is also
     * displayed
     *
     * @private
     * @param {SkipBlock} block : the clicked block
     * @memberof DetailBlock
     */
    private listTransaction(block: SkipBlock) {
        //SECTION Reseting and init
        // (re)set the color of the clickedBlock
        if (this.clickedBlock !== block) {
            if (this.clickedBlock != null) {
                const blockSVG = d3.select(
                    `[id = "${this.clickedBlock.hash.toString("hex")}"]`
                );
                blockSVG.attr("fill", Chain.getBlockColor(this.clickedBlock));
            }

            this.clickedBlock = block;

            d3.select(`[id = "${block.hash.toString("hex")}"]`).attr(
                "fill",
                this.colorClickedBlock
            );
        }

        const self = this;

        //Left column of the UI, displays all the block details
        const block_detail_container = d3.select(".block-detail-container");
        block_detail_container
            .attr("id", "block_detail_container")
            .text("")
            .append("p");

        //Right column of the UI, displays all the transactions of a block and their details
        const transaction_detail_container = d3.select(".browse-container");
        transaction_detail_container
            .attr("id", "block_detail_container")
            .text("")
            .append("p");
        //!SECTION

        //SECTION Block details
        //Big wrapper for all of the Block details
        const ulBlockDetail = block_detail_container.append("ul");
        ulBlockDetail.attr("multiple", "true");
        ulBlockDetail.attr("class", "clickable-detail-block");

        // Details of the blocks (Verifier, backlinks, forwardlinks) are wrapped in this card
        const blockCard = ulBlockDetail
            .append("div")
            .attr("style", "outline: groove rgba(204, 204, 204, 0.3);");
        blockCard
            .attr("class", "uk-card uk-card-default")
            .attr("id", "detail-window");

        //ANCHOR Header of the card used to display the block index and it's hash
        const blockCardHeader = blockCard.append("div");
        blockCardHeader.attr("class", "uk-card-header  uk-padding-small");

        const blockCardHeaderTitle = blockCardHeader.append("h3");
        blockCardHeaderTitle
            .attr("class", "block-card-content")
            .text(`Block ${block.index}`);

        const blockCardHeaderDetails = blockCardHeader.append("span");

        blockCardHeaderDetails.attr("class", "block-card-header-details");

        //Tooltip for definition of what is a hash
        const hashParagraph = blockCardHeaderDetails.append("p");
        hashParagraph
            .append("svg")
            .attr("width", "20")
            .attr("height", "20")
            .append("image")
            .attr("x", "10%")
            .attr("y", "17%")
            .attr("width", "12")
            .attr("height", "12")
            .attr("href", "assets/information-button-gray.svg")
            .attr(
                "uk-tooltip",
                `The hash of a block is a hexadecimal number, which uniquely identifies the block. It is linked to the previous blocks; which allows to ensure that there aren't any fraudulent transactions and modifications to the blockchain.`
            );

        hashParagraph
            .append("text")
            .text(`Hash : ${block.hash.toString("hex")}`);

        blockCardHeaderDetails
            .append("p")
            .text(`Validated on the ${Utils.getTimeString(block)}`);
     

        const heightParagraph = blockCardHeaderDetails.append("p");
        heightParagraph
            .append("svg")
            .attr("width", "20")
            .attr("height", "20")
            .append("image")
            .attr("x", "10%")
            .attr("y", "17%")
            .attr("width", "12")
            .attr("height", "12")
            .attr("href", "assets/information-button-gray.svg")
            .attr(
                "uk-tooltip",
                `Determines how many forward and backward links the block contains.`
            );

        heightParagraph.append("text").text(`Height : ${block.height}`);

        //ANCHOR Body of the card wrapping all of the accordions
        const blockCardBody = blockCard.append("div");
        blockCardBody.attr("class", "uk-card-body uk-padding-small");

        const blockCardBodyTitle = blockCardBody.append("h3");
        blockCardBodyTitle
            .attr("class", "block-card-content")
            .text("Block details");

        const divDetails = blockCardBody.append("div");
        divDetails.attr("class", "uk-accordion-content");

        //ANCHOR Verifier details
        const ulVerifier = divDetails.append("ul"); // accordion containing all the verifiers of a block
        ulVerifier.attr("uk-accordion", "");
        const liVerifier = ulVerifier.append("li");
        const aVerifier = liVerifier.append("a");

        aVerifier
            .attr("class", "uk-accordion-title")
            .append("svg")
            .attr("width", "20")
            .attr("height", "20")
            .append("image")
            .attr("x", "10%")
            .attr("y", "17%")
            .attr("width", "12")
            .attr("height", "12")
            .attr("href", "assets/information-button-gray.svg")
            .attr(
                "uk-tooltip",
                `Before a new block is added. A number of verifiers assert that the information contained in it is correct.`
            );

        aVerifier.append("text").text(`Verifiers : ${block.verifiers.length}`);
        const divVerifier = liVerifier.append("div");
        divVerifier.attr("class", "uk-accordion-content"); // content on the accordion
        block.verifiers.forEach((uid, j) => {
            const verifierLine = divVerifier.append("p");
            verifierLine.text(` Verifier ${j} , ID:  `);
            Utils.addIDBlocky(verifierLine, uid.toString("hex"), self.flash);
        });

        //ANCHOR BackLink details
        const ulBackLink = divDetails.append("ul");
        ulBackLink.attr("uk-accordion", "");
        const liBackLink = ulBackLink.append("li");
        const aBackLink = liBackLink.append("a");
        aBackLink
            .attr("class", "uk-accordion-title")
            .append("svg")
            .attr("width", "20")
            .attr("height", "20")
            .append("image")
            .attr("x", "10%")
            .attr("y", "17%")
            .attr("width", "12")
            .attr("height", "12")
            .attr("href", "assets/information-button-gray.svg")
            .attr(
                "uk-tooltip",
                "Backward links are cryptographic hashes of past blocks."
            );
        aBackLink.append("text").text(`Back Links : ${block.backlinks.length}`);
        const divBackLink = liBackLink.append("div");
        divBackLink.attr("class", "uk-accordion-content");
        block.backlinks.forEach((value, j) => {
            // This equation is simply derived from the skipchain topology
            const blockIndex = block.index - Math.pow(block.baseHeight, j);

            // For each linked block, a clickable badge is created
            const divBackLinkBadge = divBackLink
                .append("p")
                .text(`Backlink ${j} to `)
                .append("span");

            divBackLinkBadge
                .attr("class", "uk-badge")
                .text(`Block ${blockIndex}`)
                .on("click", async function () {
                    Utils.translateOnChain(
                        (await Utils.getBlock(value, self.roster)).index,
                        block.index
                    );
                })
                .attr("uk-tooltip", `${value.toString("hex")}`);
            Utils.clickable(divBackLinkBadge);
        });

        //ANCHOR ForwardLink
        const ulForwardLink = divDetails.append("ul");
        ulForwardLink.attr("uk-accordion", "");
        const liForwardLink = ulForwardLink.append("li");
        const aForwardLink = liForwardLink.append("a");
        aForwardLink
            .attr("class", "uk-accordion-title")
            .append("svg")
            .attr("width", "20")
            .attr("height", "20")
            .append("image")
            .attr("x", "10%")
            .attr("y", "17%")
            .attr("width", "12")
            .attr("height", "12")
            .attr("href", "assets/information-button-gray.svg")
            .attr(
                "uk-tooltip",
                " Forward links are cryptographic signatures of future blocks."
            );
        aForwardLink
            .append("text")
            .text(`Forward Links : ${block.forwardLinks.length}`);

        const divForwardLink = liForwardLink.append("div");
        divForwardLink.attr("class", "uk-accordion-content");
        block.forwardLinks.forEach((fl, j) => {
            // This equation is simply derived from the skipchain topology
            const blockIndex = block.index + Math.pow(block.baseHeight, j);

            // For each linked block, a clickable badge is created
            const divForwardLinkBadge = divForwardLink
                .append("p")
                .text(`Forward link ${j} to `)
                .append("span");

            divForwardLinkBadge
                .attr("class", "uk-badge")
                .text(`Block ${blockIndex}`)
                .on("click", async function () {
                    Utils.translateOnChain(
                        await (await Utils.getBlock(fl.to, self.roster)).index,
                        block.index
                    );
                })
                .attr("uk-tooltip", `${fl.to.toString("hex")}`);
            Utils.clickable(divForwardLinkBadge);

            // Because forward links need to be verified, signatures are rendered as well
            // Here a tooltip is created to sisplay all the data needed
            const lockIcon = divForwardLink.append("object");
            const lockContent = `<p>Hash : ${fl.hash().toString("hex")}</p>
            <p>signature: ${fl.signature.sig.toString("hex")}</p>`;

            lockIcon
                .attr("class", "white-icon")
                .attr("type", "image/svg+xml")
                .attr("data", "assets/signature.svg")

                .on("click", function () {
                    Utils.copyToClipBoard(lockContent, self.flash);
                });
            const linkDetails = divForwardLink.append("div");
            linkDetails
                .attr("uk-dropdown", "pos: right-center")
                .attr("id", "forwardlink-drop")
                .html(lockContent)
                .style("color", "var(--selected-colour)");
        });

        //ANCHOR Roster
        const ulRoster = divDetails.append("ul"); // accordion containing all the verifiers of a block
        ulRoster.attr("uk-accordion", "");
        const liRoster = ulRoster.append("li");
        const aRoster = liRoster.append("a");

        aRoster
            .attr("class", "uk-accordion-title")
            .append("svg")
            .attr("width", "20")
            .attr("height", "20")
            .append("image")
            .attr("x", "10%")
            .attr("y", "17%")
            .attr("width", "12")
            .attr("height", "12")
            .attr("href", "assets/information-button-gray.svg")
            .attr(
                "uk-tooltip",
                `The roster is a set of server nodes that validate the transactions of a block.`
            );

        aRoster.append("text").text(`Roster nodes: ${block.roster.list.length}`);
        const divRoster = liRoster.append("div").attr("class", "uk-accordion-content");
            
        const pRoster = divRoster
            .append("p");

        // List of participating conodes in the roster
        const descList: string[] = [];
        const addressList: string[] = [];
        for (let i = 0; i < block.roster.list.length; i++) {
            descList[i] = block.roster.list[i].description;
            addressList[i]=block.roster.list[i].address;
        }

        // Roster group
               
        // List the roster's node
        
        let left = 1;
        descList.forEach((node,i) => {
            pRoster
                .append("span")
                .attr("class", "uk-badge")
                .attr("style", "margin: 5px 4px;font-size : 0.875rem;")
                .attr("uk-tooltip","Address: "+addressList[i])
                .text(node);

            left += 1;
        });

                    

        //!SECTION
        //SECTION Transaction details
        const ulTransaction = transaction_detail_container.append("ul");

        // This card simply hold the title of the section in its header, and lists all transactions
        // in its body
        const transactionCard = ulTransaction
            .append("div")
            .attr("style", "outline: groove rgba(204, 204, 204, 0.3);");
        transactionCard
            .attr("class", "uk-card uk-card-default")
            .attr("id", "detail-window");

        const transactionCardHeader = transactionCard.append("div");
        transactionCardHeader.attr("class", "uk-card-header uk-padding-small");

        //
        const downloadButton = transactionCardHeader
        .append("h3") // pas mis div pck
        .html(downloadIconScript())
        .attr("class", "download-icon-1")
        .on("click", function () {
            // Auto click on a element, trigger the file download
            const blobConfig = BTexportDataBlob(block);
            // Convert Blob to URL
            const blobUrl = URL.createObjectURL(blobConfig);

            // Create an a element with blob URL
            const anchor = document.createElement("a");
            anchor.href = blobUrl;
            anchor.target = "_blank";
            anchor.download = `block_${block.index}_data.json`;
            anchor.click();
            URL.revokeObjectURL(blobUrl);
        });
        
        const transactionCardHeaderTitle = transactionCardHeader.append("h3");
        transactionCardHeaderTitle
            .attr("class", "transaction-card-header-title")
            .text(`Transaction details`);
        
        ///

        const body = DataBody.decode(block.payload);

        const totalTransaction = body.txResults.length;

        transactionCardHeaderTitle
            .append("p")
            .text(
                `Total of ${totalTransaction} transaction` +
                    (totalTransaction > 1 ? "s" : "")
            )
            .style("margin-left", "10px");

        const transactionCardBody = transactionCard.append("div");
        transactionCardBody.attr("class", "uk-card-body uk-padding-small");

        body.txResults.forEach((transaction, i) => {
            const accepted: string = transaction.accepted
                ? "Accepted"
                : `<span id ="rejected">Rejected</span>`;

            const liTransaction = transactionCardBody.append("ul");
            liTransaction.attr("id", "detail-window").attr("class", "uk-open");
            const transactionTitle = liTransaction.append("h3");
            let totalInstruction = 0;

            // Each transaction may hold several instructions
            transaction.clientTransaction.instructions.forEach((_, __) => {
                totalInstruction++;
            });
            transactionTitle
                .attr("class", "transaction-title")
                .html(
                    `<b>Transaction ${i}</b> ${accepted}, show ${totalInstruction} instruction` +
                        (totalInstruction > 1 ? `s` : ``) +
                        `:`
                );

            const divTransaction = liTransaction.append("div");
            divTransaction.attr("class", "uk-accordion-content");

            const ulInstruction = divTransaction.append("ul");
            ulInstruction.attr("uk-accordion", "");
            // ANCHOR Transaction displaying
            transaction.clientTransaction.instructions.forEach(
                (instruction, j) => {
                    // This variable helps us keep tracks whether or not we should display
                    //the instruction is a coin transaction between two users.

                    var coin_invoked = false;
                    let args = null;
                    let commandName = null;
                    const liInstruction = ulInstruction.append("li");
                    liInstruction.attr("style", "padding-left:15px");
                    const aInstruction = liInstruction.append("a");
                    aInstruction.attr("class", "uk-accordion-title");

                    if (instruction.type === Instruction.typeSpawn) {
                        const contractName =
                            instruction.spawn.contractID
                                .charAt(0)
                                .toUpperCase() +
                            instruction.spawn.contractID.slice(1);
                        aInstruction
                            .append("svg")
                            .attr("width", "20")
                            .attr("height", "20")
                            .append("image")
                            .attr("x", "10%")
                            .attr("y", "17%")
                            .attr("width", "12")
                            .attr("height", "12")
                            .attr("href", "assets/information-button-gray.svg")
                            .attr(
                                "uk-tooltip",
                                "A new instance of a contract is created."
                            );
                        aInstruction
                            .append("text")
                            .text(`Spawned : ${contractName}`);
                        args = instruction.spawn.args;
                    } else if (instruction.type === Instruction.typeInvoke) {
                        commandName = instruction.invoke.command;
                        const contractName =
                            instruction.invoke.contractID
                                .charAt(0)
                                .toUpperCase() +
                            instruction.invoke.contractID.slice(1);
                        aInstruction
                            .append("svg")
                            .attr("width", "20")
                            .attr("height", "20")
                            .append("image")
                            .attr("x", "10%")
                            .attr("y", "17%")
                            .attr("width", "12")
                            .attr("height", "12")
                            .attr("href", "assets/information-button-gray.svg")
                            .attr(
                                "uk-tooltip",
                                "A function (or command) is executed on the smart contract."
                            );
                        aInstruction
                            .append("text")
                            .text(`Invoked : ${contractName}`);
                        args = instruction.invoke.args;

                        coin_invoked =
                            contractName == "Coin" && args.length > 1;
                    } else if (instruction.type === Instruction.typeDelete) {
                        const contractName =
                            instruction.delete.contractID
                                .charAt(0)
                                .toUpperCase() +
                            instruction.delete.contractID.slice(1);
                        aInstruction
                            .append("svg")
                            .attr("width", "20")
                            .attr("height", "20")
                            .append("image")
                            .attr("x", "10%")
                            .attr("y", "17%")
                            .attr("width", "12")
                            .attr("height", "12")
                            .attr("href", "assets/information-button-gray.svg")
                            .attr(
                                "uk-tooltip",
                                "The instance of the contract is deleted from the ledger."
                            );
                        aInstruction
                            .append("text")
                            .text(`Deleted : ${contractName}`);
                    }

                    const divInstruction = liInstruction.append("div");

                    divInstruction.attr("class", "uk-accordion-content");
                    // Detail of one instruction
                    const pInstruction = divInstruction
                        .append("p")
                        .style("font-family", "monospace");

                    pInstruction
                        .append("svg")
                        .attr("width", "20")
                        .attr("height", "20")
                        .append("image")
                        .attr("x", "10%")
                        .attr("y", "17%")
                        .attr("width", "12")
                        .attr("height", "12")
                        .attr("href", "assets/information-button-gray.svg")
                        .attr(
                            "uk-tooltip",
                            "Unique hexadecimal identifier that is generated whenever a new transaction is executed."
                        );

                    pInstruction
                        .append("text")
                        .text(
                            `Transaction hash : ${instruction
                                .hash()
                                .toString("hex")}`
                        );

                    const hash = instruction.instanceID.toString("hex");
                    Utils.addHashBlocky(
                        divInstruction.append("p").text(`Instance ID : `),
                        hash,
                        self.flash
                    );

                    //TODO Create a beautifier for Columbus which formats each instruction
                    //in a customized way

                    if (!coin_invoked) {
                        if (instruction.signerCounter.length != 0) {
                            const userSignature = instruction.signerIdentities
                                .pop()
                                .toString()
                                .slice(8); //The 8 first characters are the same for all signers ID
                            const emmiterP = divInstruction
                                .append("p")
                                .text("Emmited by ");
                            Utils.addIDBlocky(
                                emmiterP,
                                userSignature,
                                self.flash
                            );
                        }
                        
                        divInstruction.append("p").text("Arguments:");
                        // Args of the instruction
                        const ulArgs = divInstruction.append("ul");
                        ulArgs.attr("uk-accordion", "");
                        // tslint:disable-next-line
                        const beautifiedArgs = instruction.beautify().args;
                        beautifiedArgs.forEach((arg, i) => {
                            const liArgs = ulArgs.append("li");
                            const aArgs = liArgs.append("a");
                            aArgs
                                .attr("class", "uk-accordion-title")
                                .attr("href", "#");
                            aArgs.text(`${i} : ${arg.name}`);
                            const divArgs = liArgs.append("div");
                            divArgs.attr("class", "uk-accordion-content");
                            divArgs.append("p").text(`${arg.value}`);
                        });
                    } else {
                        const beautifiedArgs = instruction.beautify().args;
                        const userSignature = instruction.signerIdentities
                            .pop()
                            .toString()
                            .slice(8);
                        const destinationSignature = beautifiedArgs[1].value;

                        const line = divInstruction.append("p");
                        Utils.addIDBlocky(line, userSignature, self.flash);
                        line.append("span").text(
                            ` gave ${beautifiedArgs[0].value.split(" ")[0]}`
                        );
                        line.append("object")
                            .attr("class", "white-icon")
                            .attr("type", "image/svg+xml")
                            .attr("data", "assets/coin.svg")
                            .style("top", "11px");

                        line.append("span").text(" to ");
                        Utils.addIDBlocky(
                            line,
                            destinationSignature,
                            self.flash
                        );
                        if (beautifiedArgs.length == 3) {
                            divInstruction
                                .append("p")
                                .text(`Challenge : ${beautifiedArgs[2].value}`);
                        }
                    }
                    
                    // only added in case of invoke
                    if(commandName != null && commandName != "transfer"){
                        divInstruction.append("p")
                            .text(`Command: ${commandName}`);
                    }
                    
                    // Search button

                    //ANCHOR Browse button
                    const searchInstance = divInstruction.append("li");
                    searchInstance.append("span").attr("class", "search-text").text(" Search for ");

                    /*const formTag = searchInstance
                        .append("span")
                        .append("form")
                    */
                    // code added 
                    const numberTag = searchInstance
                        .append("span")
                        .append("form")
                        .style("display", "inline");
                    
                    numberTag
                        .append("input")
                        .attr("type", "number")
                        .attr("min", "1")
                        .attr("max", "50000") //random max
                        //.attr("width", "20%")
                        .attr("id", "queryNumber")
                        .attr("class", "search-value uk-input");

                    const directionTag  = numberTag
                        .append("span")
                        .append("form")
                        //.attr("width", "20%")
                        .style("display", "inline");
                    
                    const directionSelect = directionTag
                        .append("select")
                        .attr("value", "0") // added cherche lex X previous par défaut
                        .attr("height", "20px")
                        .attr("class", "search-value uk-select");
                    
                    directionSelect
                        .append("option")
                        .attr("value", "0")
                        .text("previous");
                    
                    directionSelect
                        .append("option")
                        .attr("value", "1")
                        .text("next")

                    directionSelect
                        .append("option")
                        .attr("value", "-1")
                        .text("first");
                    
                    
                    directionTag.append("span").text(" instructions related to this instance ").style("display", "block");
                    //
                    const searchButton = searchInstance.append("div").attr("class", "search-button").append("button");
                    searchButton
                        .attr("class", "uk-button uk-button-default")
                        .text(` Search `);
                    // 

                    var chosenQueryNumber = 0;
                    numberTag.on("change", function() {
                        chosenQueryNumber = parseInt((<HTMLInputElement>document.getElementById("queryNumber")).value);
                        console.log(`new query number:${chosenQueryNumber}`); //à enlever pour debug
                    });

                    var directionQuery = true; //initialement previous
                    var startWithFirstBlock = false;
                    directionSelect.on("change", function () {
                        var query = parseInt(this.options[this.selectedIndex].value);
                        if(query == 0){
                            directionQuery = true; //previous => backward = true, -1
                        } else {
                            directionQuery = false;
                        }
                        if(query == -1){
                            startWithFirstBlock = true;
                        }
                        //console.log(`new query direction:${directionQuery}`);
                    });
                    //Dropdown menu to select the number of reults the tracker should return.
                    /*const formSelect = formTag
                        .append("select")
                        .attr("value", "10")
                        .attr("class", "uk-select");
                    */

                    /*formSelect
                        .append("option")
                        .attr("value", "-1")
                        .text("All instructions related to this instance");
                    */
                    /* formSelect.append("option").attr("value", "100").text(
                        "The 100 previous instructions related to this instance" //modified
                    );

                    //formSelect.append("option").attr("value", "50").text(
                        "The 50 previous instructions related to this instance" //modified
                    );

                    formSelect
                        .append("option")
                        .attr("value", "10")
                        .text(
                            "The 10 previous instructions related to this instance"
                        );

                    var chosenQuery = -1;

                    formSelect.on("change", function () {
                        chosenQuery = parseInt(
                            this.options[this.selectedIndex].value
                        );
                    });*/
                    //var chosenQuery = -1;

                    searchButton
                        // Confirmation and start browsing on click
                        // tslint:disable-next-line
                        .on("click", function () {
                            if(chosenQueryNumber != 0){
                                self.launchQuery(
                                    chosenQueryNumber,
                                    instruction.instanceID.toString("hex"),
                                    directionQuery,
                                    startWithFirstBlock
                                );
                            } else { //Added 
                                self.launchQuery(
                                    10,
                                    instruction.instanceID.toString("hex"),
                                    directionQuery,
                                    startWithFirstBlock
                                );
                            }
                            //scroll to the bottom of the page
                            window.scrollTo(0,document.body.scrollHeight);
                        });
                }
            ); //!SECTION
        });
    }

    /**
     * SECTION Instance tracking
     * ANCHOR Query Launching
     * Launches a query for all instructions that are related to an instance ID
     * This method is called in search.ts at the moment, it could be refactored into something nicer
     * @public
     * @param {number} chosenQuery : The number of results we want to display
     * @param {string} instruction : The id of the instance we're interested in
     * @memberof DetailBlock
     */

    public launchQuery(chosenQuery: number, instanceID: string, direction : boolean, fromFirstBlock: boolean) { //added direction argument
        const self = this;
        self.createLoadingScreen();
        //code added !! si query = all alors on n'aura pas vraiment cherché dans tous les blocks
        this.flash.display(Flash.flashType.INFO, 'Query launched : browsed informations are at the bottom of the page')
        const clickedBlockHash = this.clickedBlock.hash
            .toString("hex")
            .valueOf();
        //this.lifecycle = new Lifecycle(this.roster,this.flash,this.totalBlock,initHash);
        //
        const subjects = self.lifecycle.getInstructionSubject(
            instanceID,
            chosenQuery,
            clickedBlockHash, //modified:added an argument -> the hash of the clicked block
            direction, //code added
            fromFirstBlock //code added
        );
        subjects[0].subscribe({
            next: self.printDataBrowsing.bind(self),
        });
        // throttleTime: ignores the values for the 100 first ms
        subjects[1].pipe(throttleTime(100)).subscribe({
            complete: self.doneLoading,
            next: ([percentage, seenBlock, totalBlock, nbInstanceFound]) => {
                const rate = Math.round((nbInstanceFound/chosenQuery)*100);
                self.updateLoadingScreen(
                    rate,
                    seenBlock,
                    totalBlock,
                    nbInstanceFound,
                    chosenQuery
                );
            },
        });
    }

    //
    /**
     * ANCHOR Query results rendering
     * Displays the result of the browsing, highlights the
     * blocks found.
     *
     * @private
     * @param {[SkipBlock[], Instruction[]]} tuple : value of the observable
     browsing.getInstructionSubject function
     * @memberof DetailBlock
     */
    private printDataBrowsing(tuple: [SkipBlock[], Instruction[]]) {
        //ANCHOR Display and styling
        // Removes previous highlighted blocks
        this.removeHighlighBlocks(this.hashHighligh);
        const self = this;
        // Creates the container for the query results
        const queryContainer = d3.select(".query-answer");
        queryContainer.text("");
        queryContainer.attr("class", "query-answer uk-card uk-card-default");
        // Creates the header used to display the instance ID and the "clear results" button
        const queryHeader = queryContainer.append("p");
        const summaryText = queryHeader
            .attr("id", "query-header")
            .append("div")
            .text(
                `Evolution of contract Coin, instance:`/*${tuple[1][0].instanceID.toString( "hex")}*/
            )
            .style("padding-left","450"); //added
         const blocky = blockies.create({ seed:tuple[1][0].instanceID.toString( "hex") });
         summaryText.append("object")
                    .attr("type", "image/svg+xml")
                    .attr("width", 20)
                    .attr("height", 20)
                    //.style("padding-right",80)
                    .attr("data", blocky.toDataURL())
                        //.attr("x", "10%")
                        //.attr("y", dy-15)
                        //.attr("width", 20)
                        //.attr("height", 20)
                        //.attr("xlink:href", blocky.toDataURL())
                        .attr("uk-tooltip", tuple[0][0].hash.toString("hex"))
                        .on("click", function () {
                            Utils.copyToClipBoard(tuple[1][0].instanceID.toString( "hex"), self.flash);
                        })
                        .on("mouseover", function () {
                            d3.select(this).style("cursor", "pointer");
                        })
                        .on("mouseout", function () {
                            d3.select(this).style("cursor", "default");
                        });;
           /* .text("Summary of the evolution of the instance: ").style("text-anchor", "middle")
            Utils.addHashBlocky(
                queryHeader,
                tuple[1][0].instanceID.toString("hex"),
                this.flash);*/

        //code added for second downloadButton
        const downloadButton = queryHeader
            .append("div")
            /*.attr("type", "image/svg+xml")
        .attr("width", 25)
        .attr("height", 25)
        .style("padding-right",80)
        .attr("data", "assets/download-data-icon.png")*/
            .html(downloadIconScript())
            .attr("class", "download-icon-2")
            //.style("position", "relative")
            //.style("left", `${window.innerWidth-400}`)
            /*
        .on("mouseover", function(){
            d3.select(this)
            .attr("data", "assets/download-data-icon-hover.png")
            .style("cursor", "pointer");
        })
        .on("mouseout", function(){
            d3.select(this)
            .attr("data", "assets/download-data-icon.png")
            .style("cursor", "default");
        })*/
            .on("click", function () {
                // Auto click on a element, trigger the file download
                const blobConfig = ISexportDataBlob(tuple);
                // Convert Blob to URL
                const blobUrl = URL.createObjectURL(blobConfig);

                // Create an a element with blob URL
                const anchor = document.createElement("a");
                anchor.href = blobUrl;
                anchor.target = "_blank";
                anchor.download = `instance_search_data.json`;
                anchor.click();

                URL.revokeObjectURL(blobUrl);
            });
        //

        // Clears the results of a previous query
        const closeButtonWrap = queryHeader.append("div");
        closeButtonWrap.attr("id", "clear-query-button");
        closeButtonWrap
            .append("button")
            .attr("class", "uk-close-large")
            .attr("type", "button")
            .attr("uk-close", "")
            .on("click", function () {
                const confir = confirm(
                    "Are you sure you want to clear the query results ?"
                );
                if (confir) {
                    self.removeHighlighBlocks(self.hashHighligh);
                    queryContainer.html("");
                }
            });

        // Creates a container in which we'll put the cards
        const queryCardContainer = queryContainer.append("div"); // modified was ul
        queryCardContainer
            .attr("id", "query-card-container")
            .attr("multiple", "true")
            .attr("class", "uk-flex");
        

        // Creates a card for each instruction, the header contains a title with references
        // to both the transaction hash and the block hash.
        // The body contains the arguments of the instruction
        const instructions = new InstructionChain(this.roster,this.flash,tuple,this.clickedBlock);
        //instructions.displayChain();

        // Highlights the blocks in the blockchain
        this.highlightBlocks(tuple[0]);
        this.hashHighligh = tuple[0];

        //ANCHOR Mouse events handling for clicking and dragging
        //Stores the current scroll position
        var pos = { left: 0, x: 0 };


        /*
        //Fires when the mouse is down and moved, refreshes the scroll position
        const mouseMoveHandler = function () {
            const dx = d3.event.clientX - pos.x;
            queryCardContainer.node().scrollLeft = pos.left - dx;
        };

        //Fires when the mouse is released.
        //Removes the move and up event handler and resets cursor properties.
        const mouseUpHandler = function () {
            queryCardContainer.style("cursor", "grab");
            queryCardContainer.node().style.removeProperty("user-select");
            queryCardContainer.on("mousemove", function (e) {});
            queryCardContainer.on("mouseup", null);
        };

        //When mousedown fires in query card container, we instantiate the other event listener
        queryCardContainer.on("mousedown", function (e) {
            queryCardContainer.style("cursor", "grabbing");
            queryCardContainer.style("user-select", "none");

            pos = {
                left: queryCardContainer.node().scrollLeft,
                x: d3.event.clientX,
            };
            queryCardContainer.on("mousemove", mouseMoveHandler);
            queryCardContainer.on("mouseup", mouseUpHandler);
        });

        document.addEventListener("mousemove", mouseMoveHandler);
        */
    }

    // enveler cette fonction, déjà dans instructionChain
    /**
     * Highlights the blocks in the blockchain
     *
     * @private
     * @param {string[]} blocks : the blocks to be highlighted
     * @memberof DetailBlock
     */
    private highlightBlocks(blocks: SkipBlock[]) {
        for (let i = 0; i < blocks.length; i++) {
            const blockSVG = d3.select(
                `[id = "${blocks[i].hash.toString("hex")}"]`
            );
            const button = d3.select(`#buttonInstance${i}`);
            if (!blockSVG.empty()) {
                blockSVG.attr("stroke", "red").attr("stroke-width", 5);
            } // tslint:disable-next-line
            button.on("mouseover", function () {
                blockSVG.attr("stroke", "red").attr("stroke-width", 10);
            }); // tslint:disable-next-line
            button.on("mouseout", function () {
                blockSVG.attr("stroke", "red").attr("stroke-width", 5);
            });
        }
    }
    // 


    /**
     * Removes the highlights of the blocks in the blockchain
     *
     * @private
     * @param {string[]} blocks : the blocks to remove the highlight
     * @memberof DetailBlock
     */
    private removeHighlighBlocks(blocks: SkipBlock[]) {
        for (let i = 0; i < blocks.length; i++) {
            const blockSVG = d3.select(
                `[id = "${blocks[i].hash.toString("hex")}"]`
            );
            const button = d3.select(`#buttonInstance${i}`);
            if (!blockSVG.empty()) {
                blockSVG.attr("stroke", "red").attr("stroke-width", 0);
            } // tslint:disable-next-line
            button.on("mouseover", function () {
                blockSVG.attr("stroke", "green").attr("stroke-width", 0);
            }); // tslint:disable-next-line
            button.on("mouseout", function () {
                blockSVG.attr("stroke", "red").attr("stroke-width", 0);
            });
        }
    }

    /**
     * ANCHOR Loading screen
     * Creates the loading screen
     *
     * @private
     * @memberof DetailBlock
     */
    private createLoadingScreen() {
        const self = this;
        this.loadContainer = d3
            .select(".query-answer")
            .append("div")
            .attr("class", "load-container");
        /*this.loadContainer
            .append("div")
            .append("div")
            .attr("class", "logo") // tslint:disable-next-line
            .on("click", function () {
                window.open("https://www.epfl.ch/labs/dedis/");
            });*/
        const divLoad = this.loadContainer
            .append("div")
            .attr("class", "div-load");
        divLoad
            .append("h3")  //modified was div
            .html(`<svg id="svg-spinner" xmlns="http://www.w3.org/2000/svg" width="70" height="70" viewBox="0 0 48 48">
                  <circle cx="24" cy="4" r="4" fill="#1749b3"/>
                  <circle cx="12.19" cy="7.86" r="3.7" fill="#2552b3"/>
                  <circle cx="5.02" cy="17.68" r="3.4" fill="#365eb3"/>
                  <circle cx="5.02" cy="30.32" r="3.1" fill="#4064b3"/>
                  <circle cx="12.19" cy="40.14" r="2.8" fill="#5271b3"/>
                  <circle cx="24" cy="44" r="2.5" fill="#627cb3"/>
                  <circle cx="35.81" cy="40.14" r="2.2" fill="#7086b3"/>
                  <circle cx="42.98" cy="30.32" r="1.9" fill="#8593b3"/>
                  <circle cx="42.98" cy="17.68" r="1.6" fill="#a7b7da"/>
                  <circle cx="35.81" cy="7.86" r="1.3" fill="#c8ddf0"/>
                </svg>`)
            //.attr("class", "spinner")
            //.attr("uk-spinner", "ratio : 2")
            //.style("color", "blue");

        this.progressBarContainer = this.loadContainer
            .append("div")
            .attr("id", "progress-bar-container");

        this.progressBar = this.progressBarContainer
            .append("div")
            .attr("id", "progress-bar")
            .style("width", "0");
        this.textBar = this.progressBarContainer
            .append("div")
            .attr("id", "text-bar")
            .text(`instructions found: ???`); // ???% --- block parsed: ??? / ??? and instances found: ???`

        this.progressBarContainer
            .append("button")
            .attr("class", "cancel-button")
            .attr("id", "cancel-button")
            .text("Abort search")
            // tslint:disable-next-line
            .on("click", function () {
                const conf = confirm(
                    "Are you sure you want to abort the browse?"
                );
                if (conf) {
                    self.lifecycle.abort = true;
                }
            });
        this.progressBarItem = document.getElementById("progress-bar");
    }

    /**
     *
     * Called at each percent by the subject. It updates the loading screen
     *
     * @private
     * @param {number} percentage
     * @param {number} seenBlocks
     * @param {number} totalBlocks
     * @param {number} nbInstanceFound
     * @memberof DetailBlock
     */
    private updateLoadingScreen(
        percentage: number,
        seenBlocks: number,
        totalBlocks: number,
        nbInstanceFound: number,
        queryNumber: number
    ) {
        if (nbInstanceFound > 0) {
            this.textBar.text(
                `${percentage}% of instances found: ${nbInstanceFound}/${queryNumber}`
            );
            this.progressBarItem.style.width = percentage + "%";
        } else {
            this.textBar.text(
               `instances found: ${nbInstanceFound}`
            ); //`???%  --  Seen blocks: ${seenBlocks}/ Total blocks: ???. Number of instances found: ${nbInstanceFound}`
        }
    }

    //!SECTION

    /**
     * Removes the loading screen
     *
     * @private
     * @memberof DetailBlock
     */
    private doneLoading() {
        d3.select(".load-container").remove();
    }
}

//code added for data exportation: create the blob to be transfomed to a JSON f
function BTexportDataBlob(block: SkipBlock) {
    var transactionData = new Array();
    const body = DataBody.decode(block.payload);
    body.txResults.forEach((transaction, i) => {
        var instructionData = new Array();
        transaction.clientTransaction.instructions.forEach((instruction, j) => {
            var argsData = new Array();
            instruction.beautify().args.forEach((arg, i) => {
                const argsEntries = {
                    name: arg.name,
                    value: arg.value,
                };
                argsData.push(argsEntries);
            });
            let action: string;
            let contract: string;
            if (instruction.type == Instruction.typeSpawn) {
                action = "Spawned:coin";
                contract = instruction.spawn.contractID;
            } else if (instruction.type == Instruction.typeInvoke) {
                action = "Invoked:coin";
                contract = instruction.invoke.contractID;
            } else {
                action = "Deleted";
                contract = instruction.delete.contractID;
            }
            const instructionEntries = {
                instanceID: instruction.instanceID.toString("hex"),
                contract: contract,
                action: action,
                args: argsData,
            };
            instructionData.push(instructionEntries);
        });
        const transactionEntries = {
            accepted: transaction.accepted,
            instructions: instructionData,
        };

        transactionData.push(transactionEntries);
    });

    const previousBlockHash = Utils.bytes2String(block.backlinks[0]);
    var blockData = {
        index: block.index,
        previousBlockIndex: previousBlockHash,
        hash: block.hash.toString("hex"),
        height: block.height,
        transactions: transactionData,
    };
    const json = { Block: blockData };
    // Convert object to Blob
    const blobConfig = new Blob([JSON.stringify(json)], {
        type: "text/json;charset=utf-8",
    });
    return blobConfig;
}


function ISexportDataBlob(tuple: [SkipBlock[], Instruction[]]) {
    var instructionData = new Array();
    var blocksData = new Array();
    var currentBlock = tuple[0][0];
    for (let i = 0; i < tuple[1].length; i++) {
        const blocki = tuple[0][i];
        const instruction = tuple[1][i];
        if (currentBlock.index != blocki.index) {
            const blockEntries = {
                "block index": currentBlock.index,
                instructions: instructionData,
            };
            blocksData.push(blockEntries);
            instructionData = new Array();
            currentBlock = blocki;
        }

        var argsData = new Array();
        instruction.beautify().args.forEach((arg, i) => {
            const argEntries = {
                "name" : arg.name,
                "value" :  arg.value };
            argsData.push(argEntries);
        });

        let action: string;
        let contract: string;
        if (instruction.type == Instruction.typeSpawn) {
            action = "Spawned:coin";
            contract = instruction.spawn.contractID;
        } else if (instruction.type == Instruction.typeInvoke) {
            action = "Invoked:coin";
            contract = instruction.invoke.contractID;
        } else {
            action = "Deleted";
            contract = instruction.delete.contractID;
        }
        const instructionEntries = {
            contract: "coin",
            action: action,
            args: argsData,
        };
        instructionData.push(instructionEntries);
    }

    //add last instruction set
    const blockEntries = {
        "block index": currentBlock.index,
        instructions: instructionData,
    };
    blocksData.push(blockEntries);

    const json = {
        "instance browsed": tuple[1][0].instanceID.toString("hex"),
        "instructions found by block": blocksData,
    };
    // Convert object to Blob
    const blobConfig = new Blob([JSON.stringify(json)], {
        type: "text/json;charset=utf-8",
    });
    return blobConfig;
}

function downloadIconScript() {
    //put it in Utils.ts
    return `<svg viewBox="0 0 983 962" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" xmlns:serif="http://www.serif.com/" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:1.5;">
    <g transform="matrix(-0.957787,0.406581,-0.590533,-0.752044,3103.91,1811.35)">
        <path d="M1155.03,2714.41C1170.1,2886.92 991.944,2915.2 912.412,2865.58C832.879,2815.96 777.954,2711.51 866.2,2621.87C772.313,2628.14 725.686,2554.84 741.327,2472.55C759.019,2379.46 827.77,2317.71 927.981,2322.22C853.973,2282.21 890.359,2067.84 1059.26,2077.12C1111.96,2080.02 1189.08,2121.62 1252.17,2155.73C1285.9,2173.96 1302.58,2183.73 1302.58,2183.73" style="fill:none;stroke-width:48.29px;"/>
    </g>
    <g transform="matrix(-0.957787,0.406581,-0.590533,-0.752044,3085.54,1811.35)">
        <path d="M1436.26,2289.36C1436.26,2289.36 1492.51,2319.71 1534.2,2342.25C1568.65,2360.88 1597.86,2388.63 1612.87,2427.29C1667.9,2569.03 1521.93,2739.32 1361.07,2659.61C1440.51,2746.17 1415.7,2825.59 1378.53,2871.73C1341.35,2917.87 1242.68,2973.01 1142.98,2907.35" style="fill:none;stroke-width:48.29px;"/>
    </g>
    <g transform="matrix(1,0,0,1,-3916.53,-1953.26)">
        <g transform="matrix(0.428312,-0.428312,0.428312,0.428312,1930.88,2695.11)">
            <path d="M2635.61,2829.81L2635.61,3085.72L2891.52,3085.72" style="fill:none;stroke-width:89.42px;"/>
        </g>
        <g transform="matrix(1,0,0,1,1544.84,-129.382)">
            <path d="M2836.56,2986.15L2836.56,2558.74" style="fill:none;stroke-width:54.17px;"/>
        </g>
    </g>
</svg>`;
}



//
