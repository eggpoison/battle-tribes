import { TRIBESMAN_TITLE_RECORD, TitleGenerationInfo } from "battletribes-shared/titles";
import { Settings } from "battletribes-shared/settings";
import InventoryContainer from "./InventoryContainer";
import ItemSlot from "./ItemSlot";
import { getSelectedEntity } from "../../../game/entity-selection";
import { InventoryName, itemTypeIsArmour, itemTypeIsBackpack } from "battletribes-shared/items/items";
import { TribeComponentArray } from "../../../game/entity-components/server-components/TribeComponent";
import { Entity } from "../../../../../shared/src/entities";
import { TribesmanAIComponentArray } from "../../../game/entity-components/server-components/TribesmanAIComponent";
import { getInventory, InventoryComponentArray } from "../../../game/entity-components/server-components/InventoryComponent";
import { getLimbByInventoryName, InventoryUseComponentArray } from "../../../game/entity-components/server-components/InventoryUseComponent";
import { getEntityAgeTicks } from "../../../game/world";
import { getTribeByID, playerTribe } from "../../../game/tribes";
import { TribeMemberComponentArray } from "../../../game/entity-components/server-components/TribeMemberComponent";
import { TribesmanComponentArray } from "../../../game/entity-components/server-components/TribesmanComponent";
import { playerInstance } from "../../../game/player";
import { sendRecruitTribesmanPacket } from "../../../game/networking/packet-sending";

const getTitleByTier = (titles: ReadonlyArray<TitleGenerationInfo>, tier: number): TitleGenerationInfo | null => {
   for (let i = 0; i < titles.length; i++) {
      const titleGenerationInfo = titles[i];

      const titleInfo = TRIBESMAN_TITLE_RECORD[titleGenerationInfo.title];
      if (titleInfo.tier === tier) {
         return titleGenerationInfo;
      }
   }

   return null;
}

interface RelationSliderProps {
   readonly relation: number;
}

const RelationSlider = (props: RelationSliderProps) => {
   const sliderProgress = (props.relation + 100) / 200;

   let markerColour = "#eee";
   if (props.relation <= -30) {
      markerColour = "#e68383";
   } else if (props.relation >= 50) {
      markerColour = "#83e69d";
   }
   
   return <div className="relation-slider-container">
      <div className="enemy-region"></div>
      <div className="friendly-region"></div>
      <div className="slider-marker" style={{"left": (sliderProgress * 100) + "%", "backgroundColor": markerColour}}></div>
      <div className="inner-shadow"></div>
   </div>;
}

interface TribesmanInfocardProps {
   readonly tribesman: Entity;
}

const TribesmanInfocard = ({ tribesman }: TribesmanInfocardProps) => {
   const tribeComponent = TribeComponentArray.getComponent(tribesman);
   if (tribeComponent === null) {
      return;
   }
   
   const tribeMemberComponent = TribeMemberComponentArray.getComponent(tribesman);
   if (tribeMemberComponent === null) {
      return;
   }

   const tribesmanComponent = TribesmanComponentArray.getComponent(tribesman);
   if (tribesmanComponent === null) {
      return;
   }
   
   const tribesmanAIComponent = TribesmanAIComponentArray.getComponent(tribesman);
   if (tribesmanAIComponent === null) {
      return;
   }

   // @Cleanup: what?
   if (tribesmanComponent.titles.length === 0) {
   } else {
      for (let i = 0; i < tribesmanComponent.titles.length; i++) {
         const titleGenerationInfo = tribesmanComponent.titles[i];
      }
   }

   const titleListElements = new Array<JSX.Element>();
   for (let i = 0; i < 3; i++) {
      const tier = i + 1;

      const titleGenerationInfo = getTitleByTier(tribesmanComponent.titles, tier);
      
      if (titleGenerationInfo !== null) {
         const titleInfo = TRIBESMAN_TITLE_RECORD[titleGenerationInfo.title];
         titleListElements.push(
            <li key={i}>{titleInfo.name}</li>
         );
      } else {
         titleListElements.push(
            <li style={{"color":"#222"}} key={i}><i>None</i></li>
         );
      }
   }

   const ageDays = getEntityAgeTicks(tribesman) / Settings.TIME_PASS_RATE * Settings.TICK_RATE / 3600;

   let tribeName: string;
   if (tribeComponent.tribeID === playerTribe.id) {
      tribeName = playerTribe.name;
   } else {
      const tribeData = getTribeByID(tribeComponent.tribeID);
      tribeName = tribeData.name;
   }

   const canRecruit = tribesmanAIComponent.relationsWithPlayer >= 50;

   const recruit = (): void => {
      if (canRecruit) {
         sendRecruitTribesmanPacket(tribesman);
      }
   }
   
   return <div id="tribesman-info" className="sub-menu">
      <h2>{tribeMemberComponent.name}</h2>

      <p>Belongs to the <span>{tribeName}</span>.</p>

      <p>Age: <span>{ageDays.toFixed(1)} days</span></p>

      <div className="area">
         <h4 style={{"textDecoration": "underline"}}>Titles</h4>
         <ul>
            {titleListElements}
         </ul> 
      </div>

      {tribeComponent.tribeID !== playerTribe.id ? (
         <div className="area">
            <div className="flex-container space-around">
               <button className={`recruit-button${canRecruit ? " clickable" : ""}`} onClick={recruit}>Recruit</button>
               <RelationSlider relation={tribesmanAIComponent.relationsWithPlayer} />
            </div>
         </div>
      ) : undefined}
   </div>;
}

const TribesmanInteractMenu = () => {
   const tribesman = getSelectedEntity();
   const inventoryComponent = InventoryComponentArray.getComponent(tribesman);
   if (inventoryComponent === null) {
      return;
   }
   
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman);
   if (inventoryUseComponent === null) {
      return;
   }
   
   const tribeComponent = TribeComponentArray.getComponent(tribesman);
   if (tribeComponent === null) {
      return;
   }

   const backpackSlotInventory = getInventory(inventoryComponent, InventoryName.backpackSlot)!;
   const armourSlotInventory = getInventory(inventoryComponent, InventoryName.armourSlot)!;

   // @Copy and paste from hotbar

   const playerID = playerInstance || 0;

   const backpackSlotElement = <ItemSlot className="armour-slot" entityID={playerID} inventory={backpackSlotInventory} itemSlot={1} placeholderImg={require("../../../images/miscellaneous/backpack-wireframe.png")} validItemSpecifier={itemTypeIsBackpack} />
   const armourItemSlotElement = <ItemSlot className="backpack-slot" entityID={playerID} inventory={armourSlotInventory} itemSlot={1} placeholderImg={require("../../../images/miscellaneous/armour-wireframe.png")} validItemSpecifier={itemTypeIsArmour} />
   
   return <div id="tribesman-inventory" className="menu" onContextMenu={e => e.preventDefault()}>
      <div className="flex-container space-around">
         {backpackSlotInventory.itemSlots.hasOwnProperty(1) ? (
            <div>
               <InventoryContainer isBordered className="backapck" entityID={tribesman} inventory={getInventory(inventoryComponent, InventoryName.backpack)!} />
            </div>
         ) : undefined}
         <div>
            <TribesmanInfocard tribesman={tribesman} />
         </div>
      </div>

      {tribeComponent.tribeID === playerTribe.id ? (
         <div className="hotbar-container">
            <InventoryContainer isBordered className="hotbar" entityID={tribesman} inventory={getInventory(inventoryComponent, InventoryName.hotbar)!} selectedItemSlot={getLimbByInventoryName(inventoryUseComponent, InventoryName.hotbar).selectedItemSlot} />
            <div className="inventory">
               {backpackSlotElement}
               {armourItemSlotElement}
            </div>
         </div>
      ) : undefined}
   </div>;
}

export default TribesmanInteractMenu;