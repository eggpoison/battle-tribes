import { Settings } from "battletribes-shared/settings";
import { ServerComponentType } from "battletribes-shared/components";
import { TribeType } from "battletribes-shared/tribes";
import { EntityType } from "battletribes-shared/entities";
import { HitData } from "battletribes-shared/client-server-types";
import { angle, lerp, randFloat, randInt, randItem } from "battletribes-shared/utils";
import { TileType } from "battletribes-shared/tiles";
import Entity from "../Entity";
import { BloodParticleSize, LeafParticleSize, createBloodParticle, createBloodParticleFountain, createBloodPoolParticle, createLeafParticle } from "../particles";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { AudioFilePath, playSound } from "../sound";
import { getTribesmanRadius, TribeMemberComponentArray } from "../entity-components/TribeMemberComponent";
import { getTribeType, TribeComponentArray } from "../entity-components/TribeComponent";
import { InventoryName, ItemType } from "battletribes-shared/items/items";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { RenderPart } from "../render-parts/render-parts";
import RenderAttachPoint from "../render-parts/RenderAttachPoint";

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
export function addTribeMemberRenderParts(tribesman: Entity): void {
   let warPaintType: number | null;
   let tribeType: TribeType;
   
   const tribeComponentData = TribeComponentArray.getComponent(tribesman.id);
   const tribeMemberComponentData = TribeMemberComponentArray.getComponent(tribesman.id);

   tribeType = getTribeType(tribeComponentData.tribeID);
   warPaintType = tribeMemberComponentData.warPaintType;

   // @Temporary
   // const radius = tribesman.type === EntityType.player || tribesman.type === EntityType.tribeWarrior ? 32 : 28;
   const radius = 32;

   // 
   // Body render part
   // 
   
   const bodyRenderPart = new TexturedRenderPart(
      null,
      2,
      0,
      getTextureArrayIndex(getBodyTextureSource(tribesman, tribeType))
   );
   bodyRenderPart.addTag("tribeMemberComponent:body");
   tribesman.attachRenderThing(bodyRenderPart);

   if (tribeType === TribeType.goblins) {
      if (warPaintType !== null) {
         let textureSource: string;
         if (tribesman.type === EntityType.tribeWarrior) {
            textureSource = `entities/goblins/warrior-warpaint-${warPaintType}.png`;
         } else {
            textureSource = `entities/goblins/goblin-warpaint-${warPaintType}.png`;
         }
         
         // Goblin warpaint
         const warpaintRenderPart = new TexturedRenderPart(
            null,
            4,
            0,
            getTextureArrayIndex(textureSource)
         );
         warpaintRenderPart.addTag("tribeMemberComponent:warpaint");
         tribesman.attachRenderThing(warpaintRenderPart);
      } else {
         console.warn("bad");
      }

      // Left ear
      const leftEarRenderPart = new TexturedRenderPart(
         null,
         3,
         Math.PI/2 - GOBLIN_EAR_ANGLE,
         getTextureArrayIndex("entities/goblins/goblin-ear.png")
      );
      leftEarRenderPart.addTag("tribeMemberComponent:ear");
      leftEarRenderPart.offset.x = (radius + GOBLIN_EAR_OFFSET) * Math.sin(-GOBLIN_EAR_ANGLE);
      leftEarRenderPart.offset.y = (radius + GOBLIN_EAR_OFFSET) * Math.cos(-GOBLIN_EAR_ANGLE);
      leftEarRenderPart.setFlipX(true);
      tribesman.attachRenderThing(leftEarRenderPart);

      // Right ear
      const rightEarRenderPart = new TexturedRenderPart(
         null,
         3,
         -Math.PI/2 + GOBLIN_EAR_ANGLE,
         getTextureArrayIndex("entities/goblins/goblin-ear.png")
      );
      rightEarRenderPart.addTag("tribeMemberComponent:ear");
      rightEarRenderPart.offset.x = (radius + GOBLIN_EAR_OFFSET) * Math.sin(GOBLIN_EAR_ANGLE);
      rightEarRenderPart.offset.y = (radius + GOBLIN_EAR_OFFSET) * Math.cos(GOBLIN_EAR_ANGLE);
      tribesman.attachRenderThing(rightEarRenderPart);
   }

   // Hands
   for (let i = 0; i < 2; i++) {
      const attachPoint = new RenderAttachPoint(
         null,
         1,
         0
      );
      if (i === 1) {
         attachPoint.setFlipX(true);
      }
      attachPoint.addTag("inventoryUseComponent:attachPoint");
      tribesman.attachRenderThing(attachPoint);
      
      const handRenderPart = new TexturedRenderPart(
         attachPoint,
         1.2,
         0,
         getTextureArrayIndex(getFistTextureSource(tribesman, tribeType))
      );
      handRenderPart.addTag("tribeMemberComponent:hand")
      handRenderPart.addTag("inventoryUseComponent:hand");
      tribesman.attachRenderThing(handRenderPart);
   }
}

const switchTribeMemberRenderParts = (tribesman: Entity): void => {
   // @Robustness: don't do this. instead remove all and add them back
   
   const tribeComponent = tribesman.getServerComponent(ServerComponentType.tribe);
   const tribeType = tribeComponent.tribeType;
   
   // Switch hand texture sources
   const handTextureSource = getFistTextureSource(tribesman, tribeType);
   const handRenderParts = tribesman.getRenderThings("tribeMemberComponent:hand", 2) as Array<TexturedRenderPart>;
   for (let i = 0; i < handRenderParts.length; i++) {
      const renderPart = handRenderParts[i];
      renderPart.switchTextureSource(handTextureSource);
   }

   // Switch body texture source
   const bodyTextureSource = getBodyTextureSource(tribesman, tribeType);
   const handRenderPart = tribesman.getRenderThing("tribeMemberComponent:body") as TexturedRenderPart;
   handRenderPart.switchTextureSource(bodyTextureSource);

   // Remove any goblin ears
   const goblinEars = tribesman.getRenderThings("tribeMemberComponent:ear") as Array<RenderPart>;
   for (let i = 0; i < goblinEars.length; i++) {
      const renderPart = goblinEars[i];
      tribesman.removeRenderPart(renderPart);
   }

   if (tribeType === TribeType.goblins) {
      // Add warpaint
      // @Incomplete
   } else {
      // Remove warpaint (if any)
      const warpaints = tribesman.getRenderThings("tribeMemberComponent:warpaint") as Array<RenderPart>;
      for (let i = 0; i < warpaints.length; i++) {
         const renderPart = warpaints[i];
         tribesman.removeRenderPart(renderPart);
      }
   }
}

abstract class TribeMember extends Entity {
   private static readonly BLOOD_FOUNTAIN_INTERVAL = 0.1;

   // @Cleanup: Move to TribeMember client component
   private lowHealthMarker: RenderPart | null = null;
   
   // @Cleanup: Move to TribeMember component
   protected onHit(hitData: HitData): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);

      // Blood pool particle
      createBloodPoolParticle(transformComponent.position.x, transformComponent.position.y, 20);
      
      // Blood particles
      for (let i = 0; i < 10; i++) {
         let offsetDirection = angle(hitData.hitPosition[0] - transformComponent.position.x, hitData.hitPosition[1] - transformComponent.position.y);
         offsetDirection += 0.2 * Math.PI * (Math.random() - 0.5);

         const spawnPositionX = transformComponent.position.x + 32 * Math.sin(offsetDirection);
         const spawnPositionY = transformComponent.position.y + 32 * Math.cos(offsetDirection);
         createBloodParticle(Math.random() < 0.6 ? BloodParticleSize.small : BloodParticleSize.large, spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(150, 250), true);
      }

      const tribeComponent = this.getServerComponent(ServerComponentType.tribe);
      switch (tribeComponent.tribeType) {
         case TribeType.goblins: {
            playSound(randItem(GOBLIN_HURT_SOUNDS), 0.4, 1, transformComponent.position);
            break;
         }
         case TribeType.plainspeople: {
            playSound(("plainsperson-hurt-" + randInt(1, 3) + ".mp3") as AudioFilePath, 0.4, 1, transformComponent.position);
            break;
         }
         case TribeType.barbarians: {
            playSound(("barbarian-hurt-" + randInt(1, 3) + ".mp3") as AudioFilePath, 0.4, 1, transformComponent.position);
            break;
         }
         case TribeType.frostlings: {
            playSound(("frostling-hurt-" + randInt(1, 4) + ".mp3") as AudioFilePath, 0.4, 1, transformComponent.position);
            break;
         }
      }

      // If the tribesman is wearing a leaf suit, create leaf particles
      const inventoryComponent = this.getServerComponent(ServerComponentType.inventory);
      const armourInventory = inventoryComponent.getInventory(InventoryName.armourSlot)!;
      const armour = armourInventory.itemSlots[1];
      if (typeof armour !== "undefined" && armour.type === ItemType.leaf_suit) {
         for (let i = 0; i < 3; i++) {
            const moveDirection = 2 * Math.PI * Math.random();
   
            const radius = getTribesmanRadius(this);
            const spawnPositionX = transformComponent.position.x + radius * Math.sin(moveDirection);
            const spawnPositionY = transformComponent.position.y + radius * Math.cos(moveDirection);
   
            createLeafParticle(spawnPositionX, spawnPositionY, moveDirection + randFloat(-1, 1), Math.random() < 0.5 ? LeafParticleSize.large : LeafParticleSize.small);
         }
      }
   }

   public onDie(): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);

      createBloodPoolParticle(transformComponent.position.x, transformComponent.position.y, 20);
      createBloodParticleFountain(this, TribeMember.BLOOD_FOUNTAIN_INTERVAL, 1);

      const tribeComponent = this.getServerComponent(ServerComponentType.tribe);
      switch (tribeComponent.tribeType) {
         case TribeType.goblins: {
            playSound(randItem(GOBLIN_DIE_SOUNDS), 0.4, 1, transformComponent.position);
            break;
         }
         case TribeType.plainspeople: {
            playSound("plainsperson-die-1.mp3", 0.4, 1, transformComponent.position);
            break;
         }
         case TribeType.barbarians: {
            playSound("barbarian-die-1.mp3", 0.4, 1, transformComponent.position);
            break;
         }
         case TribeType.frostlings: {
            playSound("frostling-die.mp3", 0.4, 1, transformComponent.position);
            break;
         }
      }
   }

   public overrideTileMoveSpeedMultiplier(): number | null {
      const inventoryComponent = this.getServerComponent(ServerComponentType.inventory);
      const armourSlotInventory = inventoryComponent.getInventory(InventoryName.armourSlot)!;

      const armour = armourSlotInventory.itemSlots[1];
      if (typeof armour !== "undefined") {
         const transformComponent = this.getServerComponent(ServerComponentType.transform);

         // If snow armour is equipped, move at normal speed on snow tiles
         if ((armour.type === ItemType.frost_armour || armour.type === ItemType.deepfrost_armour) && transformComponent.tile.type === TileType.snow) {
            return 1;
         }
         // If fishlord suit is equipped, move at normal speed on snow tiles
         if (armour.type === ItemType.fishlord_suit && transformComponent.tile.type === TileType.water) {
            return 1;
         }
      }
      return null;
   }

   // @Incomplete?
   private updateLowHealthMarker(shouldShow: boolean): void {
      if (shouldShow) {
         if (this.lowHealthMarker === null) {
            this.lowHealthMarker = new TexturedRenderPart(
               null,
               9,
               0,
               getTextureArrayIndex("entities/low-health-marker.png")
            );
            this.lowHealthMarker.inheritParentRotation = false;
            this.lowHealthMarker.offset.x = 20;
            this.lowHealthMarker.offset.y = 20;
            this.attachRenderThing(this.lowHealthMarker);
         }

         const transformComponent = this.getServerComponent(ServerComponentType.transform);

         let opacity = Math.sin(transformComponent.ageTicks / Settings.TPS * 5) * 0.5 + 0.5;
         this.lowHealthMarker.opacity = lerp(0.3, 0.8, opacity);
      } else {
         if (this.lowHealthMarker !== null) {
            this.removeRenderPart(this.lowHealthMarker);
            this.lowHealthMarker = null;
         }
      }
   }

   // @Cleanup: remove. just do in components
   // public updateFromData(data: EntityData): void {
   //    const tribeComponent = this.getServerComponent(ServerComponentType.tribe);
   //    const tribeTypeBeforeUpdate = tribeComponent.tribeType;

   //    super.updateFromData(data);

   //    // Show low health marker for friendly tribe members
   //    if (tribeComponent.tribeID === Game.tribe.id) {
   //       const healthComponent = this.getServerComponent(ServerComponentType.health);
   //       this.updateLowHealthMarker(healthComponent.health <= healthComponent.maxHealth / 2);
   //    }

   //    // If tribe type is changed, update render parts
   //    if (tribeComponent.tribeType !== tribeTypeBeforeUpdate) {
   //       switchTribeMemberRenderParts(this);
   //    }
   // }
}

export default TribeMember;