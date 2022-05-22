import React, { useEffect, useState } from "react";
import EntitySpawner from "../EntitySpawner";
import OPTIONS from "../options";
import { toggleMenu } from "./menus/MenuManager";

type DevtoolsCensus = {
   readonly entityCount: number;
   readonly mobCount: number;
   readonly resourceCount: number;
}

const getDefaultCensus = (): DevtoolsCensus => {
   return {
      entityCount: 0,
      mobCount: 0,
      resourceCount: 0
   };
}

export let toggleDevtoolsVisibility: () => void;
export let updateDevtools: (census: DevtoolsCensus) => void;

function Devtools() {
   const [isVisible, setIsVisible] = useState(false);
   const [census, setCensus] = useState<DevtoolsCensus>(getDefaultCensus());

   useEffect(() => {
      toggleDevtoolsVisibility = (): void => {
         const newVisibility = isVisible ? false : true;
         setIsVisible(newVisibility);
      }

      updateDevtools = (census: DevtoolsCensus): void => {
         setCensus(census);
      }
   });

   const updateShowChunkBordersOption = (e: React.ChangeEvent): void => {
      OPTIONS.showChunkBorders = (e.target as HTMLInputElement).checked;
   }

   const updateShowEntityHitboxesOption = (e: React.ChangeEvent): void => {
      OPTIONS.showEntityHitboxes = (e.target as HTMLInputElement).checked;
   }

   return isVisible ? (
      <div id="devtools">
         <label>
            Show chunk borders
            <input type="checkbox" defaultChecked={false} onChange={e => updateShowChunkBordersOption(e)} />
         </label>

         <label>
            Show entity hitboxes
            <input type="checkbox" defaultChecked={false} onChange={e => updateShowEntityHitboxesOption(e)} />
         </label>

         <h2>Entities</h2>
         <p>{census.entityCount} total entities</p>
         <ul>
            <li>{census.mobCount}/{EntitySpawner.targetMobCount} mobs</li>
            <li>{census.resourceCount} resources</li>
         </ul>

         <button onClick={() => toggleMenu("mobSpawn")}>Spawn mob</button>
      </div>
   ) : null;
}

export default Devtools;