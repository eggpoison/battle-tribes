import { getTextureArrayIndex } from "../../texture-atlases";
import { TribeType, Entity, EntityType, ArmourItemType, ItemType, GloveItemType, ItemTypeString, InventoryName, ARMOUR_ITEM_TYPES, NUM_ITEM_TYPES, itemTypeIsGlove } from "webgl-test-shared";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getInventory, InventoryComponentArray } from "../server-components/InventoryComponent";
import { getEntityRenderObject, getEntityType } from "../../world";
import { InventoryUseComponentArray } from "../server-components/InventoryUseComponent";
import ClientComponentArray from "../ClientComponentArray";
import { ClientComponentType } from "../client-component-types";
import { TribeComponentArray } from "../server-components/TribeComponent";
import { TransformComponentArray } from "../server-components/TransformComponent";

const enum ArmourPixelSize {
   _12x12,
   _14x14,
   _16x16,

   __LENGTH
}

export interface EquipmentComponentData {}

export interface EquipmentComponent {
   armourRenderPart: TexturedRenderPart | null;
   gloveRenderParts: Array<TexturedRenderPart>;
}

// @Cleanup: copy the file name frmo the client item info thing
const ARMOUR_TEXTURE_SOURCE_ENDINGS: Record<ArmourItemType, string> = {
   [ItemType.leather_armour]: "leather-armour.png",
   [ItemType.frostArmour]: "frost-armour.png",
   [ItemType.meat_suit]: "meat-suit.png",
   [ItemType.fishlord_suit]: "fishlord-suit.png",
   [ItemType.leaf_suit]: "leaf-suit.png",
   [ItemType.mithrilArmour]: "mithril-armour.png",
   [ItemType.crabplateArmour]: "crabplate-armour.png",
   [ItemType.winterskinArmour]: "winterskin-armour.png",
};

const GLOVES_TEXTURE_SOURCE_RECORD: Record<GloveItemType, string> = {
   [ItemType.gathering_gloves]: "gloves/gathering-gloves.png",
   [ItemType.gardening_gloves]: "gloves/gardening-gloves.png"
};

const PIXEL_SIZE_STRINGS: Record<Exclude<ArmourPixelSize, ArmourPixelSize.__LENGTH>, string> = {
   [ArmourPixelSize._12x12]: "12x12",
   [ArmourPixelSize._14x14]: "14x14",
   [ArmourPixelSize._16x16]: "16x16"
};

const getArmourTextureSource = (entityType: EntityType, tribeType: TribeType, armourItemType: ArmourItemType): string => {
   let textureSource = "armour/";

   let pixelSize: ArmourPixelSize;
   switch (entityType) {
      case EntityType.tribeWorker: pixelSize = ArmourPixelSize._14x14; break;
      case EntityType.tribeWarrior:
      case EntityType.player: {
         pixelSize = ArmourPixelSize._16x16;
         break;
      }
      default: {
         throw new Error();
      }
   }
   if (tribeType === TribeType.dwarves) {
      pixelSize--;
   }

   textureSource += PIXEL_SIZE_STRINGS[pixelSize as Exclude<ArmourPixelSize, ArmourPixelSize.__LENGTH>] + "/";

   textureSource += ARMOUR_TEXTURE_SOURCE_ENDINGS[armourItemType];

   return textureSource;
}

const getGloveTextureSource = (gloveType: ItemType): string => {
   if (!GLOVES_TEXTURE_SOURCE_RECORD.hasOwnProperty(gloveType)) {
      console.warn("Can't find glove info for item type '" + ItemTypeString[gloveType] + ".");
      return "";
   }

   return GLOVES_TEXTURE_SOURCE_RECORD[gloveType as GloveItemType];
}

export const EquipmentComponentArray = new ClientComponentArray<EquipmentComponent>(ClientComponentType.equipment, true, createComponent, getMaxRenderParts);
EquipmentComponentArray.onLoad = onLoad;
EquipmentComponentArray.onTick = onTick;

export function createEquipmentComponentData(): EquipmentComponentData {
   return {};
}

function createComponent(): EquipmentComponent {
   return {
      armourRenderPart: null,
      gloveRenderParts: []
   };
}

function getMaxRenderParts(): number {
   // 1 armour, 2 gloves
   return 3;
}

function onLoad(entity: Entity): void {
   const equipmentComponent = EquipmentComponentArray.getComponent(entity);
   updateArmourRenderPart(equipmentComponent, entity);
   updateGloveRenderParts(equipmentComponent, entity);
}

/** Updates the current armour render part based on the entity's inventory component */
const updateArmourRenderPart = (equipmentComponent: EquipmentComponent, entity: Entity): void => {
   const inventoryComponent = InventoryComponentArray.getComponent(entity);
   
   const armourInventory = getInventory(inventoryComponent, InventoryName.armourSlot)!;
   
   const armour = armourInventory.itemSlots[1];
   if (armour !== undefined) {
      const entityType = getEntityType(entity);
      const tribeComponent = TribeComponentArray.getComponent(entity);
      const textureSource = getArmourTextureSource(entityType, tribeComponent.tribeType, armour.type as ArmourItemType);
      
      if (equipmentComponent.armourRenderPart === null) {
         const transformComponent = TransformComponentArray.getComponent(entity);
         const hitbox = transformComponent.hitboxes[0];
         
         equipmentComponent.armourRenderPart = new TexturedRenderPart(
            hitbox,
            5,
            0,
            0, 0,
            getTextureArrayIndex(textureSource)
         );

         const renderObject = getEntityRenderObject(entity);
         renderObject.attachRenderPart(equipmentComponent.armourRenderPart);
      } else {
         equipmentComponent.armourRenderPart.switchTextureSource(textureSource);
      }
   } else if (equipmentComponent.armourRenderPart !== null) {
      const renderObject = getEntityRenderObject(entity);
      renderObject.removeRenderPart(equipmentComponent.armourRenderPart);
      equipmentComponent.armourRenderPart = null;
   }
}

// @Cleanup: Copy and paste from armour
const updateGloveRenderParts = (equipmentComponent: EquipmentComponent, entity: Entity): void => {
   const inventoryComponent = InventoryComponentArray.getComponent(entity);
   const gloveInventory = getInventory(inventoryComponent, InventoryName.gloveSlot)!;
   
   const glove = gloveInventory.itemSlots[1];
   if (glove !== undefined) {
      const inventoryUseComponent = InventoryUseComponentArray.getComponent(entity);

      if (equipmentComponent.gloveRenderParts.length === 0) {
         for (let limbIdx = 0; limbIdx < inventoryUseComponent.limbInfos.length; limbIdx++) {
            const gloveRenderPart = new TexturedRenderPart(
               inventoryUseComponent.limbRenderParts[limbIdx],
               1.3,
               0,
               0, 0,
               getTextureArrayIndex(getGloveTextureSource(glove.type))
            );
            equipmentComponent.gloveRenderParts.push(gloveRenderPart);

            const renderObject = getEntityRenderObject(entity);
            renderObject.attachRenderPart(gloveRenderPart);
         }
      } else {
         for (let limbIdx = 0; limbIdx < inventoryUseComponent.limbInfos.length; limbIdx++) {
            equipmentComponent.gloveRenderParts[limbIdx].switchTextureSource(getGloveTextureSource(glove.type));
         }
      }
   } else {
      while (equipmentComponent.gloveRenderParts.length > 0) {
         const renderObject = getEntityRenderObject(entity);
         renderObject.removeRenderPart(equipmentComponent.gloveRenderParts[0]);
         equipmentComponent.gloveRenderParts.splice(0, 1);
      }
   }
}

function onTick(entity: Entity): void {
   const equipmentComponent = EquipmentComponentArray.getComponent(entity);
   updateArmourRenderPart(equipmentComponent, entity);
   updateGloveRenderParts(equipmentComponent, entity);
}