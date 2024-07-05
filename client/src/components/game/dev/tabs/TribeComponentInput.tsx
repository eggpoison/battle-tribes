import DevmodeDropdownInput from "../DevmodeDropdownInput";
import { SUMMON_DATA_PARAMS } from "./SummonTab";
import Game from "../../../../Game";
import CLIENT_TRIBE_INFO_RECORD from "../../../../client-tribe-info";

const TribeComponentInput = () => {
   const tribeIDs = [Game.tribe.id];
   const options = [Game.tribe.id + " (" + CLIENT_TRIBE_INFO_RECORD[Game.tribe.tribeType].name + ")"];
   for (let i = 0; i < Game.enemyTribes.length; i++) {
      const enemyTribeData = Game.enemyTribes[i];
      tribeIDs.push(enemyTribeData.id);
      options.push(enemyTribeData.id + " (" + CLIENT_TRIBE_INFO_RECORD[enemyTribeData.tribeType].name + ")");
   }

   const updateTribeID = (optionIdx: number): void => {
      const tribeID = tribeIDs[optionIdx];
      SUMMON_DATA_PARAMS.tribeID = tribeID;
   }
   
   return <>
      <DevmodeDropdownInput text="Tribe ID:" options={options} onChange={updateTribeID} />
   </>;
}

export default TribeComponentInput;