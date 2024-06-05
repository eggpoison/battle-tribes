import { Settings } from "webgl-test-shared/dist/settings";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { TribeType } from "webgl-test-shared/dist/tribes";
import { EntityType } from "webgl-test-shared/dist/entities";
import { EntityData, HitData } from "webgl-test-shared/dist/client-server-types";
import { angle, lerp, randFloat, randInt, randItem } from "webgl-test-shared/dist/utils";
import { InventoryName, ItemType } from "webgl-test-shared/dist/items";
import { TileType } from "webgl-test-shared/dist/tiles";
import RenderPart from "../render-parts/RenderPart";
import Entity, { ComponentDataRecord } from "../Entity";
import { BloodParticleSize, LeafParticleSize, createBloodParticle, createBloodParticleFountain, createBloodPoolParticle, createLeafParticle } from "../particles";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import { AudioFilePath, playSound } from "../sound";
import Game from "../Game";
import { getTribesmanRadius } from "../entity-components/TribeMemberComponent";
import { getTribeType } from "../entity-components/TribeComponent";

export const TRIBE_MEMBER_Z_INDEXES: Record<string, number> = {
   hand: 1,
   body: 2
}

const GOBLIN_EAR_OFFSET = 4;
const GOBLIN_EAR_ANGLE = Math.PI / 3;

const GOBLIN_HURT_SOUNDS: ReadonlyArray<AudioFilePath> = ["goblin-hurt-1.mp3", "goblin-hurt-2.mp3", "goblin-hurt-3.mp3", "goblin-hurt-4.mp3", "goblin-hurt-5.mp3"];
const GOBLIN_DIE_SOUNDS: ReadonlyArray<AudioFilePath> = ["goblin-die-1.mp3", "goblin-die-2.mp3", "goblin-die-3.mp3", "goblin-die-4.mp3"];

const getFistTextureSource = (tribesman: Entity, tribeType: TribeType): string => {
   switch (tribesman.type) {
      case EntityType.player:
      case EntityType.tribeWorker:
      case EntityType.tribeWarrior: {
         switch (tribeType) {
            case TribeType.plainspeople: {
               return "entities/plainspeople/fist.png";
            }
            case TribeType.goblins: {
               return "entities/goblins/fist.png";
            }
            case TribeType.frostlings: {
               return "entities/frostlings/fist.png";
            }
            case TribeType.barbarians: {
               return "entities/barbarians/fist.png";
            }
            default: {
               const unreachable: never = tribeType;
               return unreachable;
            }
         }
      }
      default: throw new Error();
   }
}

const getBodyTextureSource = (entity: Entity, tribeType: TribeType): string => {
   switch (tribeType) {
      case TribeType.plainspeople: {
         if (entity.type === EntityType.tribeWarrior) {
            return "entities/plainspeople/warrior.png";
         } else if (entity.type === EntityType.player) {
            return "entities/plainspeople/player.png";
         } else {
            return "entities/plainspeople/worker.png";
         }
      }
      case TribeType.goblins: {
         if (entity.type === EntityType.tribeWarrior) {
            return "entities/goblins/warrior.png";
         } else if (entity.type === EntityType.player) {
            return "entities/goblins/player.png";
         } else {
            return "entities/goblins/worker.png";
         }
      }
      case TribeType.frostlings: {
         if (entity.type === EntityType.tribeWarrior) {
            return "entities/frostlings/warrior.png";
         } else if (entity.type === EntityType.player) {
            return "entities/frostlings/player.png";
         } else {
            return "entities/frostlings/worker.png";
         }
      }
      case TribeType.barbarians: {
         if (entity.type === EntityType.tribeWarrior) {
            return "entities/barbarians/warrior.png";
         } else if (entity.type === EntityType.player) {
            return "entities/barbarians/player.png";
         } else {
            return "entities/barbarians/worker.png";
         }
      }
   }
}

// @Cleanup: sucks
// @Incomplete: NOT CALLED
export function addTribeMemberRenderParts(tribesman: Entity, componentDataRecord: ComponentDataRecord): void {
   let warPaintType: number;
   let tribeType: TribeType;
   
   // @Hack
   if (Object.keys(componentDataRecord).length === 0) {
      const tribeComponent = tribesman.getServerComponent(ServerComponentType.tribe);
      const tribeMemberComponent = tribesman.getServerComponent(ServerComponentType.tribeMember);

      tribeType = tribeComponent.tribeType;
      warPaintType = tribeMemberComponent.warPaintType;
   } else {
      const tribeComponentData = componentDataRecord[ServerComponentType.tribe]!;
      const tribeMemberComponentData = componentDataRecord[ServerComponentType.tribeMember]!;
   
      tribeType = getTribeType(tribeComponentData.tribeID);
      warPaintType = tribeMemberComponentData.warPaintType;
   }

   const radius = tribesman.type === EntityType.player || tribesman.type === EntityType.tribeWarrior ? 32 : 28;

   // 
   // Body render part
   // 
   
   const bodyRenderPart = new RenderPart(
      tribesman,
      getTextureArrayIndex(getBodyTextureSource(tribesman, tribeType)),
      2,
      0
   );
   bodyRenderPart.addTag("tribeMemberComponent:body");
   tribesman.attachRenderPart(bodyRenderPart);

   if (tribeType === TribeType.goblins) {
      let textureSource: string;
      if (tribesman.type === EntityType.tribeWarrior) {
         textureSource = `entities/goblins/warrior-warpaint-${warPaintType}.png`;
      } else {
         textureSource = `entities/goblins/goblin-warpaint-${warPaintType}.png`;
      }
      
      // Goblin warpaint
      tribesman.attachRenderPart(
         new RenderPart(
            tribesman,
            getTextureArrayIndex(textureSource),
            4,
            0
         )
      );

      // Left ear
      const leftEarRenderPart = new RenderPart(
         tribesman,
         getTextureArrayIndex("entities/goblins/goblin-ear.png"),
         3,
         Math.PI/2 - GOBLIN_EAR_ANGLE,
      );
      leftEarRenderPart.offset.x = (radius + GOBLIN_EAR_OFFSET) * Math.sin(-GOBLIN_EAR_ANGLE);
      leftEarRenderPart.offset.y = (radius + GOBLIN_EAR_OFFSET) * Math.cos(-GOBLIN_EAR_ANGLE);
      leftEarRenderPart.flipX = true;
      tribesman.attachRenderPart(leftEarRenderPart);

      // Right ear
      const rightEarRenderPart = new RenderPart(
         tribesman,
         getTextureArrayIndex("entities/goblins/goblin-ear.png"),
         3,
         -Math.PI/2 + GOBLIN_EAR_ANGLE,
      );
      rightEarRenderPart.offset.x = (radius + GOBLIN_EAR_OFFSET) * Math.sin(GOBLIN_EAR_ANGLE);
      rightEarRenderPart.offset.y = (radius + GOBLIN_EAR_OFFSET) * Math.cos(GOBLIN_EAR_ANGLE);
      tribesman.attachRenderPart(rightEarRenderPart);
   }

   // Hands
   for (let i = 0; i < 2; i++) {
      const handRenderPart = new RenderPart(
         tribesman,
         getTextureArrayIndex(getFistTextureSource(tribesman, tribeType)),
         1,
         0
      );
      handRenderPart.addTag("tribeMemberComponent:hand")
      handRenderPart.addTag("inventoryUseComponent:hand");
      tribesman.attachRenderPart(handRenderPart);
   }
}

const switchTribeMemberRenderParts = (tribesman: Entity): void => {
   // Remove all previous render parts
   while (tribesman.allRenderParts.length > 0) {
      const renderPart = tribesman.allRenderParts[0];
      tribesman.removeRenderPart(renderPart);
   }

   addTribeMemberRenderParts(tribesman, {});
}

abstract class TribeMember extends Entity {
   private static readonly BLOOD_FOUNTAIN_INTERVAL = 0.1;

   // @Cleanup: Move to TribeMember client component
   private lowHealthMarker: RenderPart | null = null;
   
   protected onHit(hitData: HitData): void {
      // Blood pool particle
      createBloodPoolParticle(this.position.x, this.position.y, 20);
      
      // Blood particles
      for (let i = 0; i < 10; i++) {
         let offsetDirection = angle(hitData.hitPosition[0] - this.position.x, hitData.hitPosition[1] - this.position.y);
         offsetDirection += 0.2 * Math.PI * (Math.random() - 0.5);

         const spawnPositionX = this.position.x + 32 * Math.sin(offsetDirection);
         const spawnPositionY = this.position.y + 32 * Math.cos(offsetDirection);
         createBloodParticle(Math.random() < 0.6 ? BloodParticleSize.small : BloodParticleSize.large, spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(150, 250), true);
      }

      const tribeComponent = this.getServerComponent(ServerComponentType.tribe);
      switch (tribeComponent.tribeType) {
         case TribeType.goblins: {
            playSound(randItem(GOBLIN_HURT_SOUNDS), 0.4, 1, this.position.x, this.position.y);
            break;
         }
         case TribeType.plainspeople: {
            playSound(("plainsperson-hurt-" + randInt(1, 3) + ".mp3") as AudioFilePath, 0.4, 1, this.position.x, this.position.y);
            break;
         }
         case TribeType.barbarians: {
            playSound(("barbarian-hurt-" + randInt(1, 3) + ".mp3") as AudioFilePath, 0.4, 1, this.position.x, this.position.y);
            break;
         }
      }

      // If the tribesman is wearing a leaf suit, create leaf particles
      const inventoryComponent = this.getServerComponent(ServerComponentType.inventory);
      const armourInventory = inventoryComponent.getInventory(InventoryName.armourSlot);
      const armour = armourInventory.itemSlots[1];
      if (typeof armour !== "undefined" && armour.type === ItemType.leaf_suit) {
         for (let i = 0; i < 3; i++) {
            const moveDirection = 2 * Math.PI * Math.random();
   
            const radius = getTribesmanRadius(this);
            const spawnPositionX = this.position.x + radius * Math.sin(moveDirection);
            const spawnPositionY = this.position.y + radius * Math.cos(moveDirection);
   
            createLeafParticle(spawnPositionX, spawnPositionY, moveDirection + randFloat(-1, 1), Math.random() < 0.5 ? LeafParticleSize.large : LeafParticleSize.small);
         }
      }
   }

   public onDie(): void {
      createBloodPoolParticle(this.position.x, this.position.y, 20);
      createBloodParticleFountain(this, TribeMember.BLOOD_FOUNTAIN_INTERVAL, 1);

      const tribeComponent = this.getServerComponent(ServerComponentType.tribe);
      switch (tribeComponent.tribeType) {
         case TribeType.goblins: {
            playSound(randItem(GOBLIN_DIE_SOUNDS), 0.4, 1, this.position.x, this.position.y);
            break;
         }
         case TribeType.plainspeople: {
            playSound("plainsperson-die-1.mp3", 0.4, 1, this.position.x, this.position.y);
            break;
         }
         case TribeType.barbarians: {
            playSound("barbarian-die-1.mp3", 0.4, 1, this.position.x, this.position.y);
            break;
         }
      }
   }

   public overrideTileMoveSpeedMultiplier(): number | null {
      const inventoryComponent = this.getServerComponent(ServerComponentType.inventory);
      const armourSlotInventory = inventoryComponent.getInventory(InventoryName.armourSlot);

      const armour = armourSlotInventory.itemSlots[1];
      if (typeof armour !== "undefined") {
         // If snow armour is equipped, move at normal speed on snow tiles
         if ((armour.type === ItemType.frost_armour || armour.type === ItemType.deepfrost_armour) && this.tile.type === TileType.snow) {
            return 1;
         }
         // If fishlord suit is equipped, move at normal speed on snow tiles
         if (armour.type === ItemType.fishlord_suit && this.tile.type === TileType.water) {
            return 1;
         }
      }
      return null;
   }

   private updateLowHealthMarker(shouldShow: boolean): void {
      if (shouldShow) {
         if (this.lowHealthMarker === null) {
            this.lowHealthMarker = new RenderPart(
               this,
               getTextureArrayIndex("entities/low-health-marker.png"),
               9,
               0
            );
            this.lowHealthMarker.inheritParentRotation = false;
            this.lowHealthMarker.offset.x = 20;
            this.lowHealthMarker.offset.y = 20;
            this.attachRenderPart(this.lowHealthMarker);
         }

         let opacity = Math.sin(this.ageTicks / Settings.TPS * 5) * 0.5 + 0.5;
         this.lowHealthMarker.opacity = lerp(0.3, 0.8, opacity);
      } else {
         if (this.lowHealthMarker !== null) {
            this.removeRenderPart(this.lowHealthMarker);
            this.lowHealthMarker = null;
         }
      }
   }

   // @Cleanup: remove. just do in components
   public updateFromData(data: EntityData<EntityType>): void {
      const tribeComponent = this.getServerComponent(ServerComponentType.tribe);
      const tribeTypeBeforeUpdate = tribeComponent.tribeType;

      super.updateFromData(data);

      // Show low health marker for friendly tribe members
      if (tribeComponent.tribeID === Game.tribe.id) {
         const healthComponent = this.getServerComponent(ServerComponentType.health);
         this.updateLowHealthMarker(healthComponent.health <= healthComponent.maxHealth / 2);
      }

      // If tribe type is changed, update render parts
      if (tribeComponent.tribeType !== tribeTypeBeforeUpdate) {
         switchTribeMemberRenderParts(this);
      }
   }
}

export default TribeMember;