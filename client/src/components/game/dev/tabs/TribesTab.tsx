import { useCallback, useEffect, useReducer, useState } from "react";
import Game from "../../../../Game";
import DevmodeScrollableOptions from "../DevmodeScrollableOptions";
import { TribeData } from "webgl-test-shared/dist/techs";
import Client from "../../../../client/Client";
import { TribeType, NUM_TRIBE_TYPES } from "webgl-test-shared/dist/tribes";
import CLIENT_TRIBE_INFO_RECORD from "../../../../client-tribe-info";
import DevmodeDropdownInput from "../DevmodeDropdownInput";

export let TribesTab_refresh: () => void = () => {};

const TribesTab = () => {
   // @Cleanup: copy paste from tribecomponentinput
   const tribeIDs = Game.enemyTribes.map(enemyTribeData => enemyTribeData.id);
   tribeIDs.unshift(Game.tribe.id);

   const [selectedTribeID, setSelectedTribeID] = useState(tribeIDs[0]);
   const [, forceUpdate] = useReducer(x => x + 1, 0);

   useEffect(() => {
      TribesTab_refresh = forceUpdate;
   }, []);
   
   const selectTribeID = (optionIdx: number): void => {
      const tribeID = tribeIDs[optionIdx];
      setSelectedTribeID(tribeID);
   }

   const updateTribeType = useCallback((optionIdx: number): void => {
      const tribeType = optionIdx as TribeType;
      Client.sendDevChangeTribeType(selectedTribeID, tribeType);
   }, [selectedTribeID]);

   let tribeData: TribeData;
   if (selectedTribeID === Game.tribe.id) {
      // @Hack
      tribeData = Game.tribe;
   } else {
      tribeData = Game.getEnemyTribeData(selectedTribeID);
   }

   const tribeTypeOptions = new Array<string>();
   for (let tribeType: TribeType = 0; tribeType < NUM_TRIBE_TYPES; tribeType++) {
      const clientInfo = CLIENT_TRIBE_INFO_RECORD[tribeType];
      tribeTypeOptions.push(clientInfo.name);
   }
   

   return <div id="tribes-tab" className="devmode-tab devmode-container">
      <div className="flex-container">
         <DevmodeScrollableOptions options={tribeIDs.map(id => id.toString())} onOptionSelect={selectTribeID} />
         
         <div className="flex-container column">
            <div className="spawn-options devmode-menu-section">
               <h2 className="devmode-menu-section-title">{tribeData.name}</h2>
               <div className="bar"></div>

               <DevmodeDropdownInput text="Tribe type:" options={tribeTypeOptions} onChange={updateTribeType} />
            </div>

            <div className="devmode-menu-section">
               <button onClick={() => Client.sendDevCreateTribe()}>Create tribe</button>
            </div>
         </div>
      </div>
   </div>;
}

export default TribesTab;