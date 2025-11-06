import DevmodeDropdownInput from "../DevmodeDropdownInput";
import { SUMMON_DATA_PARAMS } from "./SummonTab";
import CLIENT_TRIBE_INFO_RECORD from "../../../../game/client-tribe-info";
import { tribes } from "../../../../game/tribes";

const TribeComponentInput = () => {
   const tribeIDs = new Array<number>();
   const options = new Array<string>();
   for (const tribe of tribes) {
      tribeIDs.push(tribe.id);
      options.push(tribe.id + " (" + CLIENT_TRIBE_INFO_RECORD[tribe.tribeType].name + ")");
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