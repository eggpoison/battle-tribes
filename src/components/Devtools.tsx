import React, { useEffect, useState } from "react";
import OPTIONS from "../options";

type DevtoolsCensus = {
   readonly entityCount: number;
}

export let toggleDevtoolsVisibility: () => void;
export let updateDevtools: (census: DevtoolsCensus) => void;

function Devtools() {
   const [isVisible, setIsVisible] = useState(false);
   const [census, setCensus] = useState<DevtoolsCensus>({ entityCount: 0 });

   useEffect(() => {
      toggleDevtoolsVisibility = (): void => {
         const newVisibility = isVisible ? false : true;
         setIsVisible(newVisibility);
      }

      updateDevtools = (census: DevtoolsCensus): void => {
         setCensus(census);
      }
   });

   const updateShowChunkBordersOption = (e: React.ChangeEvent) => {
      OPTIONS.showChunkBorders = (e.target as HTMLInputElement).checked;
   }

   return isVisible ? (
      <div id="devtools">
         <label>
            Show Chunk Borders
            <input type="checkbox" defaultChecked={false} onChange={e => updateShowChunkBordersOption(e)} />
         </label>

      <h2>Entities</h2>
      <p>{census.entityCount} total entities</p>
      </div>
   ) : null;
}

export default Devtools;