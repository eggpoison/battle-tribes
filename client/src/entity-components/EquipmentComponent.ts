import { ServerComponentType } from "webgl-test-shared/dist/components";
import Entity from "../Entity";
import Component from "./Component";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { createFrostShieldBreakParticle } from "../particles";
import { ArmourItemType, ItemType, GloveItemType, ItemTypeString, InventoryName } from "webgl-test-shared/dist/items/items";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";
import { ClientComponentType } from "./components";

// @Incomplete
// public genericUpdateFromData(entityData: EntityData<EntityType.player> | EntityData<EntityType.tribeWorker> | EntityData<EntityType.tribeWarrior>): void {
//    const hasFrostShield = entityData.clientArgs[15];
//    if (this.hasFrostShield && !hasFrostShield) {
//       this.createFrostShieldBreakParticles();
//    }
//    this.hasFrostShield = hasFrostShield;
// }

interface ArmourInfo {
   readonly textureSource: string;
}

const ARMOUR_WORN_INFO: Record<ArmourItemType, ArmourInfo> = {
   [ItemType.leather_armour]: {
      textureSource: "armour/leather-armour.png"
   },
   [ItemType.frost_armour]: {
      textureSource: "armour/frost-armour.png"
   },
   [ItemType.deepfrost_armour]: {
      textureSource: "armour/deepfrost-armour.png"
   },
   [ItemType.meat_suit]: {
      textureSource: "armour/meat-suit.png"
   },
   [ItemType.fishlord_suit]: {
      textureSource: "armour/fishlord-suit.png"
   },
   [ItemType.leaf_suit]: {
      textureSource: "armour/leaf-suit.png"
   }
};

const GLOVES_TEXTURE_SOURCE_RECORD: Record<GloveItemType, string> = {
   [ItemType.gathering_gloves]: "gloves/gathering-gloves.png",
   [ItemType.gardening_gloves]: "gloves/gardening-gloves.png"
};

const getArmourTextureSource = (armourType: ItemType): string => {
   if (!ARMOUR_WORN_INFO.hasOwnProperty(armourType)) {
      console.warn("Can't find armour info for item type '" + ItemTypeString[armourType] + ".");
      return "";
   }

   return ARMOUR_WORN_INFO[armourType as ArmourItemType].textureSource;
}

const getGloveTextureSource = (gloveType: ItemType): string => {
   if (!GLOVES_TEXTURE_SOURCE_RECORD.hasOwnProperty(gloveType)) {
      console.warn("Can't find glove info for item type '" + ItemTypeString[gloveType] + ".");
      return "";
   }

   return GLOVES_TEXTURE_SOURCE_RECORD[gloveType as GloveItemType];
}

class EquipmentComponent extends Component {
   public armourRenderPart: TexturedRenderPart | null = null;
   public gloveRenderParts = new Array<TexturedRenderPart>();
   
   // @Incomplete
   public hasFrostShield: boolean;

   constructor(entity: Entity) {
      super(entity);

      this.hasFrostShield = false;
   }

   public onLoad(): void {
      updateArmourRenderPart(this);
      updateGloveRenderParts(this);
   }

   public createFrostShieldBreakParticles(): void {
      const transformComponent = this.entity.getServerComponent(ServerComponentType.transform);
      for (let i = 0; i < 17; i++) {
         createFrostShieldBreakParticle(transformComponent.position.x, transformComponent.position.y);
      }
   }
}

export default EquipmentComponent;

export const EquipmentComponentArray = new ComponentArray<EquipmentComponent>(ComponentArrayType.client, ClientComponentType.equipment, true, {
   onTick: onTick
});

/** Updates the current armour render part based on the entity's inventory component */
const updateArmourRenderPart = (equipmentComponent: EquipmentComponent): void => {
   const inventoryComponent = equipmentComponent.entity.getServerComponent(ServerComponentType.inventory);
   const armourInventory = inventoryComponent.getInventory(InventoryName.armourSlot)!;
   
   const armour = armourInventory.itemSlots[1];
   if (typeof armour !== "undefined") {
      
      if (equipmentComponent.armourRenderPart === null) {
         equipmentComponent.armourRenderPart = new TexturedRenderPart(
            null,
            3,
            0,
            getTextureArrayIndex(getArmourTextureSource(armour.type))
         );
         equipmentComponent.entity.attachRenderThing(equipmentComponent.armourRenderPart);
      } else {
         equipmentComponent.armourRenderPart.switchTextureSource(getArmourTextureSource(armour.type));
      }
   } else if (equipmentComponent.armourRenderPart !== null) {
      equipmentComponent.entity.removeRenderPart(equipmentComponent.armourRenderPart);
      equipmentComponent.armourRenderPart = null;
   }
}

// @Cleanup: Copy and paste from armour
const updateGloveRenderParts = (equipmentComponent: EquipmentComponent): void => {
   const inventoryComponent = equipmentComponent.entity.getServerComponent(ServerComponentType.inventory);
   const gloveInventory = inventoryComponent.getInventory(InventoryName.gloveSlot)!;
   
   // @Incomplete: Make a glove for every hand
   const glove = gloveInventory.itemSlots[1];
   if (typeof glove !== "undefined") {
      const inventoryUseComponent = equipmentComponent.entity.getServerComponent(ServerComponentType.inventoryUse);

      if (equipmentComponent.gloveRenderParts.length === 0) {
         for (let limbIdx = 0; limbIdx < inventoryUseComponent.limbInfos.length; limbIdx++) {
            const gloveRenderPart = new TexturedRenderPart(
               inventoryUseComponent.limbRenderParts[limbIdx],
               1.1,
               0,
               getTextureArrayIndex(getGloveTextureSource(glove.type))
            );
            equipmentComponent.entity.attachRenderThing(gloveRenderPart);
            equipmentComponent.gloveRenderParts.push(gloveRenderPart);
         }
      } else {
         for (let limbIdx = 0; limbIdx < inventoryUseComponent.limbInfos.length; limbIdx++) {
            equipmentComponent.gloveRenderParts[limbIdx].switchTextureSource(getGloveTextureSource(glove.type));
         }
      }
   } else {
      while (equipmentComponent.gloveRenderParts.length > 0) {
         equipmentComponent.entity.removeRenderPart(equipmentComponent.gloveRenderParts[0]);
         equipmentComponent.gloveRenderParts.splice(0, 1);
      }
   }
}

function onTick(equipmentComponent: EquipmentComponent): void {
   updateArmourRenderPart(equipmentComponent);
   updateGloveRenderParts(equipmentComponent);
}