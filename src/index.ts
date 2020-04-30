import { Roster } from "@dedis/cothority/network";
import { BlocksDiagram } from "./blocksDiagram";
import { Browsing } from "./browsing";
import { DetailBlock } from "./detailBlock";

import { getRosterStr } from "./roster";

export function sayHi() {
  var roster = Roster.fromTOML(rosterStr);
  if (!roster) {
    console.log("Roster is undefined");
    return;
  }
  let blocksDiagram = new BlocksDiagram(roster);
  blocksDiagram.loadFirstBlocks();

  let myobserver = blocksDiagram.getBlockObserver()
  let mybrowse = new Browsing(roster);

  let mydetailBlock = new DetailBlock(myobserver, mybrowse)


  mybrowse.sayHi1();

}
const rosterStr = getRosterStr();
