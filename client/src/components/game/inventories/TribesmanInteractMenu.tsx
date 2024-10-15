import { TRIBESMAN_TITLE_RECORD, TitleGenerationInfo, TribesmanTitle } from "battletribes-shared/titles";
import { Settings } from "battletribes-shared/settings";
import { TribeType } from "battletribes-shared/tribes";
import InventoryContainer from "./InventoryContainer";
import ItemSlot from "./ItemSlot";
import { getSelectedEntity } from "../../../entity-selection";
import Game from "../../../Game";
import Client from "../../../client/Client";
import { InventoryName, itemTypeIsArmour, itemTypeIsBackpack } from "battletribes-shared/items/items";
import Player from "../../../entities/Player";
import { TribeComponentArray } from "../../../entity-components/server-components/TribeComponent";
import { TribeMemberComponentArray } from "../../../entity-components/server-components/TribeMemberComponent";
import { EntityID } from "../../../../../shared/src/entities";
import { TribesmanAIComponentArray } from "../../../entity-components/server-components/TribesmanAIComponent";
import { InventoryComponentArray } from "../../../entity-components/server-components/InventoryComponent";
import { InventoryUseComponentArray } from "../../../entity-components/server-components/InventoryUseComponent";
import { getEntityAgeTicks } from "../../../world";

const PLAINSPEOPLE_NAMES: ReadonlyArray<string> = [
   "Oda",
   "Grug",
   "Og",
   "Urgh",
   "Blurgh"
];

const BARBARIAN_NAMES: ReadonlyArray<string> = [
   "RAAAAGH",
   "Bjorn",
   "HOUUUURGH",
   "Erik",
   "Ivar",
   "Agmundr",
   "Harald",
   "Frednog",
   "Snigvut"
];

const FROSTLING_NAMES: ReadonlyArray<string> = [
   "Fraazgakk",
   "Fruzeek",
   "Grivve"
];

const GOBLIN_NAMES: ReadonlyArray<string> = [
   "Vuzz",
   "Klanzogz",
   "Striex",
   "Slokx"
];

const TITLE_DISPLAY_OPTIONS: Record<TribesmanTitle, ReadonlyArray<string>> = {
   [TribesmanTitle.builder]: ["Builder", "Object Constructor", "Manipulator of Materials"],
   [TribesmanTitle.berrymuncher]: ["Berry-muncher", "Muncher of Berries"],
   [TribesmanTitle.bloodaxe]: ["Bloodaxe", "Shedder of Blood"],
   [TribesmanTitle.deathbringer]: ["Deathbringer", "Precursor of Doom", "Enemy of Life"],
   [TribesmanTitle.gardener]: ["Gardener", "Maintainer of Plants", "Friend to Plants"],
   [TribesmanTitle.packrat]: ["Packrat", "Carryer of Things"],
   [TribesmanTitle.shrewd]: ["the Shrewd", "Haver of Brains"],
   [TribesmanTitle.sprinter]: ["Owner of the Fast Legs", "Haver of Legs", "the Fast"],
   [TribesmanTitle.wellful]: ["of Good Health", "the Wellful"],
   [TribesmanTitle.winterswrath]: ["Winterswrath", "Antithesis of Cold", "Torment of Winter"],
   [TribesmanTitle.yetisbane]: ["Yetisbane", "Slayer of Yetis"]
};

const UNTITLED_ADJECTIVES: ReadonlyArray<string> = [
   "Useless",
   "Weak",
   "Puny",
   "Small",
   "Frail",
   "Sickly",
   "Inebriated",
   "Demented",
   "Wimp",
   "Weed",
   "Twig",
   "Ant",
   "Rickety",
   "Elderly",
   "Pale",
   "Feeble",
   "Poor",
   "Thing",
   "Pebble",
   "Thin",
   "Anorexic",
   "Limp"
];

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
   readonly tribesman: EntityID;
}

const TribesmanInfocard = ({ tribesman }: TribesmanInfocardProps) => {
   const tribeComponent = TribeComponentArray.getComponent(tribesman);
   const tribeMemberComponent = TribeMemberComponentArray.getComponent(tribesman);
   const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman);
   
   let nameArray: ReadonlyArray<string>;
   switch (tribeComponent.tribeType) {
      case TribeType.plainspeople: {
         nameArray = PLAINSPEOPLE_NAMES;
         break;
      }
      case TribeType.barbarians: {
         nameArray = BARBARIAN_NAMES;
         break;
      }
      case TribeType.frostlings: {
         nameArray = FROSTLING_NAMES;
         break;
      }
      case TribeType.goblins: {
         nameArray = GOBLIN_NAMES;
         break;
      }
   }
   
   let name = nameArray[tribesmanComponent.name % nameArray.length];

   if (tribeMemberComponent.titles.length === 0) {
      const descriptor = UNTITLED_ADJECTIVES[tribesmanComponent.untitledDescriptor % UNTITLED_ADJECTIVES.length];
      name += " the " + descriptor;
   } else {
      for (let i = 0; i < tribeMemberComponent.titles.length; i++) {
         const titleGenerationInfo = tribeMemberComponent.titles[i];
         
         const displayText = TITLE_DISPLAY_OPTIONS[titleGenerationInfo.title][titleGenerationInfo.displayOption - 1];
         name += ", " + displayText;
      }
   }

   const titleListElements = new Array<JSX.Element>();
   for (let i = 0; i < 3; i++) {
      const tier = i + 1;

      const titleGenerationInfo = getTitleByTier(tribeMemberComponent.titles, tier);
      
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

   const ageDays = getEntityAgeTicks(tribesman) / Settings.TIME_PASS_RATE * Settings.TPS / 3600;

   let tribeName: string;
   if (tribeComponent.tribeID === Game.tribe.id) {
      tribeName = Game.tribe.name;
   } else {
      const tribeData = Game.getEnemyTribeData(tribeComponent.tribeID);
      tribeName = tribeData.name;
   }

   const canRecruit = tribesmanComponent.relationsWithPlayer >= 50;

   const recruit = (): void => {
      if (canRecruit) {
         Client.sendRecruitTribesman(tribesman);
      }
   }
   
   return <div id="tribesman-info" className="sub-menu">
      <h2>{name}</h2>

      <p>Belongs to the <span>{tribeName}</span>.</p>

      <p>Age: <span>{ageDays.toFixed(1)} days</span></p>

      <div className="area">
         <h4 style={{"textDecoration": "underline"}}>Titles</h4>
         <ul>
            {titleListElements}
         </ul> 
      </div>

      {tribeComponent.tribeID !== Game.tribe.id ? (
         <div className="area">
            <div className="flex-container space-around">
               <button className={`recruit-button${canRecruit ? " clickable" : ""}`} onClick={recruit}>Recruit</button>
               <RelationSlider relation={tribesmanComponent.relationsWithPlayer} />
            </div>
         </div>
      ) : undefined}
   </div>;
}

const TribesmanInteractMenu = () => {
   const tribesman = getSelectedEntity();
   const inventoryComponent = InventoryComponentArray.getComponent(tribesman);
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman);
   const tribeComponent = TribeComponentArray.getComponent(tribesman);

   const backpackSlotInventory = inventoryComponent.getInventory(InventoryName.backpackSlot)!;
   const armourSlotInventory = inventoryComponent.getInventory(InventoryName.armourSlot)!;

   // @Copy and paste from hotbar

   const playerID = Player.instance !== null ? Player.instance.id : 0;

   const backpackSlotElement = <ItemSlot className="armour-slot" entityID={playerID} inventory={backpackSlotInventory} itemSlot={1} placeholderImg={require("../../../images/miscellaneous/backpack-wireframe.png")} validItemSpecifier={itemTypeIsBackpack} />
   const armourItemSlotElement = <ItemSlot className="backpack-slot" entityID={playerID} inventory={armourSlotInventory} itemSlot={1} placeholderImg={require("../../../images/miscellaneous/armour-wireframe.png")} validItemSpecifier={itemTypeIsArmour} />
   
   return <div id="tribesman-inventory" className="menu" onContextMenu={e => e.preventDefault()}>
      <div className="flex-container space-around">
         {backpackSlotInventory.itemSlots.hasOwnProperty(1) ? (
            <div>
               <InventoryContainer isBordered className="backapck" entityID={tribesman} inventory={inventoryComponent.getInventory(InventoryName.backpack)!} />
            </div>
         ) : undefined}
         <div>
            <TribesmanInfocard tribesman={tribesman} />
         </div>
      </div>

      {tribeComponent.tribeID === Game.tribe.id ? (
         <div className="hotbar-container">
            <InventoryContainer isBordered className="hotbar" entityID={tribesman} inventory={inventoryComponent.getInventory(InventoryName.hotbar)!} selectedItemSlot={inventoryUseComponent.getLimbInfoByInventoryName(InventoryName.hotbar).selectedItemSlot} />
            <div className="inventory">
               {backpackSlotElement}
               {armourItemSlotElement}
            </div>
         </div>
      ) : undefined}
   </div>;
}

export default TribesmanInteractMenu;