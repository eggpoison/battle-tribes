import { ServerComponentType } from "webgl-test-shared/dist/components";
import Entity from "../Entity";
import RenderPart from "../render-parts/RenderPart";
import Component from "./Component";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { createFrostShieldBreakParticle } from "../particles";
import { ArmourItemType, ItemType, GloveItemType, ItemTypeString, InventoryName } from "webgl-test-shared/dist/items/items";

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
   private armourRenderPart: RenderPart | null = null;
   private gloveRenderParts = new Array<RenderPart>();
   
   // @Incomplete
   public hasFrostShield: boolean;

   constructor(entity: Entity) {
      super(entity);

      this.hasFrostShield = false;
   }

   public onLoad(): void {
      this.updateArmourRenderPart();
      this.updateGloveRenderParts();
   }

   public tick(): void {
      this.updateArmourRenderPart();
      this.updateGloveRenderParts();
   }

   /** Updates the current armour render part based on the entity's inventory component */
   public updateArmourRenderPart(): void {
      const inventoryComponent = this.entity.getServerComponent(ServerComponentType.inventory);
      const armourInventory = inventoryComponent.getInventory(InventoryName.armourSlot);
      
      const armour = armourInventory.itemSlots[1];
      if (typeof armour !== "undefined") {
         
         if (this.armourRenderPart === null) {
            this.armourRenderPart = new RenderPart(
               this.entity,
               getTextureArrayIndex(getArmourTextureSource(armour.type)),
               3,
               0
            );
            this.entity.attachRenderPart(this.armourRenderPart);
         } else {
            this.armourRenderPart.switchTextureSource(getArmourTextureSource(armour.type));
         }
      } else if (this.armourRenderPart !== null) {
         this.entity.removeRenderPart(this.armourRenderPart);
         this.armourRenderPart = null;
      }
   }

   // @Cleanup: Copy and paste from armour
   private updateGloveRenderParts(): void {
      const inventoryComponent = this.entity.getServerComponent(ServerComponentType.inventory);
      const gloveInventory = inventoryComponent.getInventory(InventoryName.gloveSlot);
      
      // @Incomplete: Make a glove for every hand
      const glove = gloveInventory.itemSlots[1];
      if (typeof glove !== "undefined") {
         const inventoryUseComponent = this.entity.getServerComponent(ServerComponentType.inventoryUse);

         if (this.gloveRenderParts.length === 0) {
            for (let limbIdx = 0; limbIdx < inventoryUseComponent.useInfos.length; limbIdx++) {
               const gloveRenderPart = new RenderPart(
                  inventoryUseComponent.limbRenderParts[limbIdx],
                  getTextureArrayIndex(getGloveTextureSource(glove.type)),
                  1.1,
                  0
               );
               this.entity.attachRenderPart(gloveRenderPart);
               this.gloveRenderParts.push(gloveRenderPart);
            }
         } else {
            for (let limbIdx = 0; limbIdx < inventoryUseComponent.useInfos.length; limbIdx++) {
               this.gloveRenderParts[limbIdx].switchTextureSource(getGloveTextureSource(glove.type));
            }
         }
      } else {
         while (this.gloveRenderParts.length > 0) {
            this.entity.removeRenderPart(this.gloveRenderParts[0]);
            this.gloveRenderParts.splice(0, 1);
         }
      }
   }

   public createFrostShieldBreakParticles(): void {
      for (let i = 0; i < 17; i++) {
         createFrostShieldBreakParticle(this.entity.position.x, this.entity.position.y);
      }
   }
}

export default EquipmentComponent;