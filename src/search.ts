import { Roster } from "@dedis/cothority/network";
import { SkipBlock } from "@dedis/cothority/skipchain";
import * as d3 from "d3";
import { Subject } from "rxjs";
import "uikit";
import { Block } from "./block";
import { Flash } from "./flash";
import "./stylesheets/style.scss";
import { Utils } from "./utils";

/**
 * File to launch requests when searching for a particular block or instance through the search bar
 * @param roster the roster
 * @param flash the flash class that handles the flash messages
 * @param initialBlock the first block displayed at the load of the chain
 * @param genesisBlock the hash of the genesis block
 * @param blockClickedSubject the subject notified each time a block is clicked on
 * @param block Block instance
 * @author Sophia Artioli (sophia.artioli@epfl.ch)
 * @author Lucas Trognon <lucas.trognon@epfl.ch>
 */

export function searchBar(
    roster: Roster,
    flash: Flash,
    initialBlock: SkipBlock,
    genesisBlock: string,
    blockClickedSubject: Subject<SkipBlock>,
    block: Block
) {
    d3.select("#search-input").on("keypress", () => {
        if (d3.event.keyCode === 13) {
            // The enter button is pressed

            // Text inputted by the user in the search-bar
            const input = d3.select("#search-input").property("value");

            // Mode selected by the user in the drop-down menu
            const searchMode = d3.select("#search-mode").property("value");
            if (input.toString() == "") {
                // The user hasn't inputted anything
                // If this check is not done, submitting will look for block 0
                return;
            }
            searchRequest(
                input,
                roster,
                flash,
                genesisBlock,
                initialBlock,
                blockClickedSubject,
                searchMode,
                block
            );
        }
    });

    // The submit button is pressed
    d3.select("#submit-button").on("click", async () => {
        // Text inputted by the user in the search-bar
        const input = d3.select("#search-input").property("value");
        // Mode selected by the user in the drop-down menu
        const searchMode = d3.select("#search-mode").property("value");

        if (input.toString() == "") {
            // The user hasn't inputted anything
            // If this check is not done, submitting will look for block 0
            return;
        }

        await searchRequest(
            input,
            roster,
            flash,
            genesisBlock,
            initialBlock,
            blockClickedSubject,
            searchMode,
            block
        );
    });
}

/**
 * Helper function to search for the blocks
 * @param input the input inserted by the user
 * @param roster the roster defining the blockchain nodes
 * @param flash the flash class that handles the flash messages
 * @param genesisBlock the hash of the genesis block
 * @param initialBlock the first block displayed at the load of the chain
 * @param blockClickedSubject the subject notified each time a block is clicked on
 * @param searchMode the element requested (block hash, block index, instance id)
 * @param block
 */
async function searchRequest(
    input: any,
    roster: Roster,
    flash: Flash,
    genesisBlock: string,
    initialBlock: SkipBlock,
    blockClickedSubject: Subject<SkipBlock>,
    searchMode: string,
    block: Block
) {
    switch (searchMode) {
        case "anything":
            if (input.length < 32) {
                await indexSearch(
                    genesisBlock,
                    input,
                    roster,
                    flash,
                    initialBlock,
                    blockClickedSubject
                );
            } else {
                // The input is in the form of a hash
                try {
                    const block = await Utils.getBlock(
                        Buffer.from(input, "hex"),
                        roster
                    );

                    flash.display(
                        Flash.flashType.INFO,
                        "Valid search for block index: " +
                            block.index.toString()
                    );
                    await Utils.translateOnChain(
                        block.index,
                        initialBlock.index
                    );
                    blockClickedSubject.next(block);
                } catch (error) {
                    // The inputted hash is not a block
                    // Try browsing the chain for instances
                    flash.display(
                        Flash.flashType.INFO,
                        `Browsing the chain for instance ID : ${input}`
                    );
                    block.launchQuery(50, input.toString(), false, true); //modified
                }
            }
            break;

        case "index":
            await indexSearch(
                genesisBlock,
                input,
                roster,
                flash,
                initialBlock,
                blockClickedSubject
            );
            break;
        case "hash":
            try {
                const block = await Utils.getBlock(
                    Buffer.from(input, "hex"),
                    roster
                );

                flash.display(
                    Flash.flashType.INFO,
                    "Valid search for block index: " + block.index.toString()
                );
                await Utils.translateOnChain(block.index, initialBlock.index);
                blockClickedSubject.next(block);
            } catch (error) {
                flash.display(Flash.flashType.ERROR, `Block does not exist`);
            }
            break;

        case "id":
            flash.display(
                Flash.flashType.INFO,
                `Browsing the chain for instance ID : ${input}`
            );
            block.launchQuery(50, input.toString(), true, false); //modifed
            break;
    }

    /**
     * Helper function to request for a searched block by index
     * @param genesisBlock the genesis block's hash
     * @param input user input
     * @param roster
     * @param flash
     * @param initialBlock the first block displayed by the chain
     * @param blockClickedSubject the subject that is notified when a block is clicked
     */
    async function indexSearch(
        genesisBlock: string,
        input: any,
        roster: Roster,
        flash: Flash,
        initialBlock: SkipBlock,
        blockClickedSubject: Subject<SkipBlock>
    ) {
        try {
            const block = await Utils.getBlockByIndex(
                Utils.hex2Bytes(genesisBlock),
                parseInt(input, 10),
                roster
            );
            flash.display(
                Flash.flashType.INFO,
                "Valid search for block index: " + block.index.toString()
            );

            await Utils.translateOnChain(block.index, initialBlock.index);
            blockClickedSubject.next(block);
        } catch (error) {
            flash.display(Flash.flashType.ERROR, "Block does not exist");
        }
    }
}
