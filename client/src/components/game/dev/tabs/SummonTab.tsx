import { EntityType, NUM_ENTITY_TYPES } from "webgl-test-shared/dist/entities";
import CLIENT_ENTITY_INFO_RECORD from "../../../../client-entity-info";
import { useEffect, useState } from "react";
import DevmodeRangeInput from "../DevmodeRangeInput";
import { closeCurrentMenu, setMenuCloseFunction } from "../../../../player-input";
import Game, { GameInteractState } from "../../../../Game";
import { EntitySummonPacket } from "webgl-test-shared/dist/dev-packets";

type EntityTypeTuple = [EntityType, string];

let alphabeticalEntityTypes: ReadonlyArray<EntityType>;
{
   const entityTypeTuples = new Array<EntityTypeTuple>();
   for (let entityType: EntityType = 0; entityType < NUM_ENTITY_TYPES; entityType++) {
      const clientEntityInfo = CLIENT_ENTITY_INFO_RECORD[entityType];
      entityTypeTuples.push([entityType, clientEntityInfo.name]);
   }

   const sortedTuples = entityTypeTuples.sort((a, b) => a[1] > b[1] ? 1 : -1);

   const sortedEntityTypes = new Array<EntityType>();
   for (let i = 0; i < sortedTuples.length; i++) {
      const tuple = sortedTuples[i];
      sortedEntityTypes.push(tuple[0]);
   }
   alphabeticalEntityTypes = sortedEntityTypes;
}

interface EntitySelectorProps {
   readonly entityType: EntityType;
   readonly isSelected: boolean;
   onClick(): void;
}

const EntitySelector = (props: EntitySelectorProps) => {
   const clientEntityInfo = CLIENT_ENTITY_INFO_RECORD[props.entityType];
   
   let className = "entity-selector";
   if (props.isSelected) {
      className += " selected";
   }
   
   return <li className={className} onClick={props.onClick}>
      {clientEntityInfo.name}
      {props.isSelected ? (
         <div className="selection-marker"></div>
      ) : null}
   </li>;
}

const SummonTab = () => {
   const [selectedEntityType, setSelectedEntityType] = useState(alphabeticalEntityTypes[0]);

   // Spawn options
   const [spawnRange, setSpawnRange] = useState(0);

   const beginSummon = (): void => {
      // Close the tab
      closeCurrentMenu();
      Game.setInteractState(GameInteractState.summonEntity);
   }

   useEffect(() => {
      const packet: EntitySummonPacket = {
         // The position and rotation values are overriden with the actual values when the packet is sent
         position: [0, 0],
         rotation: 0,
         entityType: selectedEntityType,
         summonData: {}
      };
      Game.summonPacket = packet;
   }, [selectedEntityType, spawnRange]);

   const entitySelectorElems = new Array<JSX.Element>();
   for (let i = 0; i < NUM_ENTITY_TYPES; i++) {
      const entityType = alphabeticalEntityTypes[i];
      
      if (i > 0) {
         entitySelectorElems.push(
            <div key={entitySelectorElems.length} className="separator"></div>
         );
      }

      entitySelectorElems.push(
         <EntitySelector key={entitySelectorElems.length} entityType={entityType} isSelected={entityType === selectedEntityType} onClick={() => setSelectedEntityType(entityType)} />
      );
   }
   
   return <div id="summon-tab" className="devmode-tab devmode-container">
      <div className="flex-container">
         <div className="entity-selector-container devmode-menu-section">
            <ul>
               {entitySelectorElems}
            </ul>
         </div>
         <div className="spawn-options devmode-menu-section">
            <h2 className="devmode-menu-section-title">Spawn Options</h2>
            <div className="bar"></div>

            <DevmodeRangeInput text="Spawn range:" defaultValue={spawnRange} onChange={setSpawnRange} />

            <button onClick={beginSummon}>Summon</button>
         </div>
      </div>
   </div>;
}

export default SummonTab;