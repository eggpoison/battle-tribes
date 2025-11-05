import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { ArmourItemType, ItemType, GloveItemType, ItemTypeString, InventoryName, ARMOUR_ITEM_TYPES, NUM_ITEM_TYPES, itemTypeIsGlove } from "webgl-test-shared/src/items/items";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getInventory, InventoryComponentArray } from "../server-components/InventoryComponent";
import { getEntityRenderInfo, getEntityType } from "../../world";
import { InventoryUseComponentArray } from "../server-components/InventoryUseComponent";
import ClientComponentArray from "../ClientComponentArray";
import { Entity, EntityType } from "../../../../../shared/src/entities";
import { ClientComponentType } from "../client-component-types";
import { TribeType } from "../../../../../shared/src/tribes";
import { TribeComponentArray } from "../server-components/TribeComponent";
import { registerTextureSource } from "../../texture-atlases/texture-sources";
import { TransformComponentArray } from "../server-components/TransformComponent";
import { Hitbox } from "../../hitboxes";
import { assert } from "../../../../../shared/src/utils";

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

// Register all the armour texture sources
for (let pixelSize: ArmourPixelSize = 0; pixelSize < ArmourPixelSize.__LENGTH; pixelSize++) {
   for (const itemType of ARMOUR_ITEM_TYPES) {
      const pixelSizeString = PIXEL_SIZE_STRINGS[pixelSize as Exclude<ArmourPixelSize, ArmourPixelSize.__LENGTH>];
      const armourString = ARMOUR_TEXTURE_SOURCE_ENDINGS[itemType];
      const textureSource = "armour/" + pixelSizeString + "/" + armourString;
      registerTextureSource(textureSource);
   }
}

// Register the glove texture sources
for (let itemType: ItemType = 0; itemType < NUM_ITEM_TYPES; itemType++) {
   if (itemTypeIsGlove(itemType)) {
      const textureSource = GLOVES_TEXTURE_SOURCE_RECORD[itemType];
      registerTextureSource(textureSource);
   }
}

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
   const equipmentComponent = EquipmentComponentArray.getComponent(entity)!;
   updateArmourRenderPart(equipmentComponent, entity);
   updateGloveRenderParts(equipmentComponent, entity);
}

/** Updates the current armour render part based on the entity's inventory component */
const updateArmourRenderPart = (equipmentComponent: EquipmentComponent, entity: Entity): void => {
   const inventoryComponent = InventoryComponentArray.getComponent(entity);
   assert(inventoryComponent !== null);
   
   const armourInventory = getInventory(inventoryComponent, InventoryName.armourSlot)!;
   
   const armour = armourInventory.itemSlots[1];
   if (typeof armour !== "undefined") {
      const entityType = getEntityType(entity);
      const tribeComponent = TribeComponentArray.getComponent(entity);
      assert(tribeComponent !== null);
      const textureSource = getArmourTextureSource(entityType, tribeComponent.tribeType, armour.type as ArmourItemType);
      
      if (equipmentComponent.armourRenderPart === null) {
         const transformComponent = TransformComponentArray.getComponent(entity);
         assert(transformComponent !== null);
         const hitbox = transformComponent.hitboxes[0] as Hitbox;
         
         equipmentComponent.armourRenderPart = new TexturedRenderPart(
            hitbox,
            5,
            0,
            getTextureArrayIndex(textureSource)
         );

         const renderInfo = getEntityRenderInfo(entity);
         renderInfo.attachRenderPart(equipmentComponent.armourRenderPart);
      } else {
         equipmentComponent.armourRenderPart.switchTextureSource(textureSource);
      }
   } else if (equipmentComponent.armourRenderPart !== null) {
      const renderInfo = getEntityRenderInfo(entity);
      renderInfo.removeRenderPart(equipmentComponent.armourRenderPart);
      equipmentComponent.armourRenderPart = null;
   }
}

// @Cleanup: Copy and paste from armour
const updateGloveRenderParts = (equipmentComponent: EquipmentComponent, entity: Entity): void => {
   const inventoryComponent = InventoryComponentArray.getComponent(entity);
   assert(inventoryComponent !== null);
   const gloveInventory = getInventory(inventoryComponent, InventoryName.gloveSlot)!;
   
   const glove = gloveInventory.itemSlots[1];
   if (typeof glove !== "undefined") {
      const inventoryUseComponent = InventoryUseComponentArray.getComponent(entity);
      assert(inventoryUseComponent !== null);

      if (equipmentComponent.gloveRenderParts.length === 0) {
         for (let limbIdx = 0; limbIdx < inventoryUseComponent.limbInfos.length; limbIdx++) {
            const gloveRenderPart = new TexturedRenderPart(
               inventoryUseComponent.limbRenderParts[limbIdx],
               1.3,
               0,
               getTextureArrayIndex(getGloveTextureSource(glove.type))
            );
            equipmentComponent.gloveRenderParts.push(gloveRenderPart);

            const renderInfo = getEntityRenderInfo(entity);
            renderInfo.attachRenderPart(gloveRenderPart);
         }
      } else {
         for (let limbIdx = 0; limbIdx < inventoryUseComponent.limbInfos.length; limbIdx++) {
            equipmentComponent.gloveRenderParts[limbIdx].switchTextureSource(getGloveTextureSource(glove.type));
         }
      }
   } else {
      while (equipmentComponent.gloveRenderParts.length > 0) {
         const renderInfo = getEntityRenderInfo(entity);
         renderInfo.removeRenderPart(equipmentComponent.gloveRenderParts[0]);
         equipmentComponent.gloveRenderParts.splice(0, 1);
      }
   }
}

function onTick(entity: Entity): void {
   const equipmentComponent = EquipmentComponentArray.getComponent(entity)!;
   updateArmourRenderPart(equipmentComponent, entity);
   updateGloveRenderParts(equipmentComponent, entity);
}