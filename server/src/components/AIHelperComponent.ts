import { Bytes } from "../../../shared/dist/constants.js";
import Chunk from "../Chunk.js";
import { ComponentArray } from "./ComponentArray.js";
import { TransformComponent, TransformComponentArray } from "./TransformComponent.js";
import { getEntityLayer, getEntityType } from "../world.js";
import WanderAI from "../ai/WanderAI.js";
import GuardianAI from "../ai/GuardianAI.js";
import GuardianCrystalSlamAI from "../ai/GuardianCrystalSlamAI.js";
import GuardianCrystalBurstAI from "../ai/GuardianCrystalBurstAI.js";
import GuardianSpikyBallSummonAI from "../ai/GuardianSpikyBallSummonAI.js";
import { Hitbox, hitboxIsPartOfParent } from "../hitboxes.js";
import { FollowAI } from "../ai/FollowAI.js";
import { PatrolAI } from "../ai/PatrolAI.js";
import { EscapeAI } from "../ai/EscapeAI.js";
import { DustfleaHibernateAI } from "../ai/DustfleaHibernateAI.js";
import { SandBallingAI } from "../ai/SandBallingAI.js";
import { VegetationConsumeAI } from "../ai/VegetationConsumeAI.js";
import { KrumblidCombatAI } from "../ai/KrumblidCombatAI.js";
import { KrumblidHibernateAI } from "../ai/KrumblidHibernateAI.js";
import { OkrenCombatAI } from "../ai/OkrenCombatAI.js";
import { Box, boxIsCircular } from "../../../shared/dist/boxes.js";
import { getCircleCircleCollisionResult, getCircleRectangleCollisionResult } from "../../../shared/dist/collision.js";
import { ServerComponentType } from "../../../shared/dist/components.js";
import { Entity, EntityType } from "../../../shared/dist/entities.js";
import { Packet } from "../../../shared/dist/packets.js";
import { Settings } from "../../../shared/dist/settings.js";

// @CLEANUP @ROBUSTNESS: whole 'ai class' system is ass and weird. idk why i made this in the first place

export const enum AIType {
   wander,
   follow,
   patrol,
   escape,
   guardian,
   guardianCrystalSlam,
   guardianCrystalBurst,
   guardianSpikyBallSummon,
   dustfleaHibernate,
   sandBalling,
   vegetationConsume,
   krumblidCombat,
   krumblidHibernate,
   okrenCombat
}

const _AIClasses = {
   [AIType.wander]: (): WanderAI => 0 as any,
   [AIType.follow]: (): FollowAI => 0 as any,
   [AIType.patrol]: (): PatrolAI => 0 as any,
   [AIType.escape]: (): EscapeAI => 0 as any,
   [AIType.guardian]: (): GuardianAI => 0 as any,
   [AIType.guardianCrystalSlam]: (): GuardianCrystalSlamAI => 0 as any,
   [AIType.guardianCrystalBurst]: (): GuardianCrystalBurstAI => 0 as any,
   [AIType.guardianSpikyBallSummon]: (): GuardianSpikyBallSummonAI => 0 as any,
   [AIType.dustfleaHibernate]: (): DustfleaHibernateAI => 0 as any,
   [AIType.sandBalling]: (): SandBallingAI => 0 as any,
   [AIType.vegetationConsume]: (): VegetationConsumeAI => 0 as any,
   [AIType.krumblidCombat]: (): KrumblidCombatAI => 0 as any,
   [AIType.krumblidHibernate]: (): KrumblidHibernateAI => 0 as any,
   [AIType.okrenCombat]: (): OkrenCombatAI => 0 as any,
} satisfies Record<AIType, object>;
type AIClasses = typeof _AIClasses;
type AIClass<T extends AIType> = ReturnType<AIClasses[T]>;

type AIRecord = Partial<{
   [T in AIType]: AIClass<T>;
}>;

type MoveEntityFunction = (entity: Entity, x: number, y: number, acceleration: number) => void;
type TurnEntityFunction = (entity: Entity, x: number, y: number, turnSpeed: number, turnDamping: number) => void;

export class AIHelperComponent {
   public readonly seeingHitbox: Hitbox;
   
   public visibleChunkBounds = [999, 999, 999, 999];
   public visibleChunks: Array<Chunk> = [];

   public readonly potentialVisibleEntities: Array<Entity> = [];
   /** The number of times each potential visible game object appears in the mob's visible chunks */
   public readonly potentialVisibleEntityAppearances: Array<number> = [];

   public readonly ignoreDecorativeEntities = true;
   public visionRange: number;
   public visibleEntities: Array<Entity> = [];

   public readonly ais: AIRecord = {};

   public currentAIType: AIType | null = null;

   // @Cleanup: This abstract shit is bad cuz i can't f12 to go to the refernce of the move function.
   public readonly moveFunc: MoveEntityFunction;
   public readonly turnFunc: TurnEntityFunction;

   constructor(seeingHitbox: Hitbox, visionRange: number, moveFunc: MoveEntityFunction, turnFunc: TurnEntityFunction) {
      this.seeingHitbox = seeingHitbox;
      this.visionRange = visionRange;
      this.moveFunc = moveFunc;
      this.turnFunc = turnFunc;
   }

   // @Cleanup: this is shite.

   public getWanderAI(): WanderAI {
      return this.ais[AIType.wander]!;
   }

   public getFollowAI(): FollowAI {
      return this.ais[AIType.follow]!;
   }

   public getEscapeAI(): EscapeAI {
      return this.ais[AIType.escape]!;
   }

   public getPatrolAI(): PatrolAI {
      return this.ais[AIType.patrol]!;
   }

   public getGuardianAI(): GuardianAI {
      return this.ais[AIType.guardian]!;
   }

   public getGuardianCrystalSlamAI(): GuardianCrystalSlamAI {
      return this.ais[AIType.guardianCrystalSlam]!;
   }

   public getGuardianCrystalBurstAI(): GuardianCrystalBurstAI {
      return this.ais[AIType.guardianCrystalBurst]!;
   }

   public getSpikyBallSummonAI(): GuardianSpikyBallSummonAI {
      return this.ais[AIType.guardianSpikyBallSummon]!;
   }

   public getDustfleaHibernateAI(): DustfleaHibernateAI {
      return this.ais[AIType.dustfleaHibernate]!;
   }

   public getSandBallingAI(): SandBallingAI {
      return this.ais[AIType.sandBalling]!;
   }

   public getVegetationConsumeAI(): VegetationConsumeAI {
      return this.ais[AIType.vegetationConsume]!;
   }

   public getKrumblidCombatAI(): KrumblidCombatAI {
      return this.ais[AIType.krumblidCombat]!;
   }

   public getKrumblidHibernateAI(): KrumblidHibernateAI {
      return this.ais[AIType.krumblidHibernate]!;
   }

   public getOkrenCombatAI(): OkrenCombatAI {
      return this.ais[AIType.okrenCombat]!;
   }
}

export const AIHelperComponentArray = new ComponentArray<AIHelperComponent>(ServerComponentType.aiHelper, true, getDataLength, addDataToPacket);
AIHelperComponentArray.onTick = {
   tickInterval: 3,
   func: onTick,
};
AIHelperComponentArray.onRemove = onRemove;

function onRemove(entity: Entity): void {
   const aiHelperComponent = AIHelperComponentArray.getComponent(entity);
   for (let i = 0; i < aiHelperComponent.visibleChunks.length; i++) {
      const chunk = aiHelperComponent.visibleChunks[i];
      chunk.viewingEntities.splice(chunk.viewingEntities.indexOf(entity), 1);
   }
}

const boxIsVisible = (seeingHitbox: Hitbox, box: Box, visionRange: number): boolean => {
   if (boxIsCircular(box)) {
      // Circular hitbox
      return getCircleCircleCollisionResult(seeingHitbox.box.posX, seeingHitbox.box.posY, visionRange, box.posX, box.posY, box.radius).isColliding;
   } else {
      // Rectangular hitbox
      return getCircleRectangleCollisionResult(seeingHitbox.box.posX, seeingHitbox.box.posY, visionRange, box.posX, box.posY, box.width, box.height, box.relativeAngle).isColliding;
   }
}

const hitboxWithChildrenIsVisible = (seeingHitbox: Hitbox, hitbox: Hitbox, visionRange: number): boolean => {
   // @Hack? There surely must be some cases in which we do want an entity to see the entities in its attach heirarchy
   if (hitbox.rootEntity === seeingHitbox.rootEntity) {
      return false;
   }
   
   if (boxIsVisible(seeingHitbox, hitbox.box, visionRange)) {
      return true;
   }
   
   for (const childHitbox of hitbox.children) {
      if (hitboxIsPartOfParent(childHitbox) && hitboxWithChildrenIsVisible(seeingHitbox, childHitbox, visionRange)) {
         return true;
      }
   }

   return false;
}

const entityIsVisible = (seeingHitbox: Hitbox, checkEntity: Entity, checkEntityTransformComponent: TransformComponent, visionRange: number): boolean => {
   for (const rootHitbox of checkEntityTransformComponent.rootHitboxes) {
      if (hitboxWithChildrenIsVisible(seeingHitbox, rootHitbox, visionRange)) {
         return true;
      }
   }
   return false;
}

// @Speed: I'd say a good 70% of the entities here are ice spikes and decorations - unnecessary
const calculateVisibleEntities = (aiHelperComponent: AIHelperComponent): Array<Entity> => {
   const visibleEntities: Array<Entity> = [];

   const potentialVisibleEntities = aiHelperComponent.potentialVisibleEntities;
   const visionRange = aiHelperComponent.visionRange;

   for (let i = 0; i < potentialVisibleEntities.length; i++) {
      const currentEntity = potentialVisibleEntities[i];
      const currentEntityTransformComponent = TransformComponentArray.getComponent(currentEntity);

      if (entityIsVisible(aiHelperComponent.seeingHitbox, currentEntity, currentEntityTransformComponent, visionRange)) {
         visibleEntities.push(currentEntity);
      }
   }

   return visibleEntities;
}

const entityIsDecorative = (entity: Entity): boolean => {
   const entityType = getEntityType(entity);
   return entityType === EntityType.grassStrand || entityType === EntityType.reed;
}

export function entityIsNoticedByAI(aiHelperComponent: AIHelperComponent, entity: Entity): boolean {
   return !aiHelperComponent.ignoreDecorativeEntities || !entityIsDecorative(entity);
}

function onTick(entity: Entity): void {
   // @Speed: Not all entities with this component need this always.
   // Slimewisp: can pass with once per second
   
   const aiHelperComponent = AIHelperComponentArray.getComponent(entity);
   
   const minChunkX = Math.max(Math.floor((aiHelperComponent.seeingHitbox.box.posX - aiHelperComponent.visionRange) / Settings.CHUNK_UNITS), 0);
   const maxChunkX = Math.min(Math.floor((aiHelperComponent.seeingHitbox.box.posX + aiHelperComponent.visionRange) / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1);
   const minChunkY = Math.max(Math.floor((aiHelperComponent.seeingHitbox.box.posY - aiHelperComponent.visionRange) / Settings.CHUNK_UNITS), 0);
   const maxChunkY = Math.min(Math.floor((aiHelperComponent.seeingHitbox.box.posY + aiHelperComponent.visionRange) / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1);
   
   // If the entity hasn't changed visible chunk bounds, then the potential visible entities will be the same
   // and only the visible entities need to updated
   if (minChunkX === aiHelperComponent.visibleChunkBounds[0] && maxChunkX === aiHelperComponent.visibleChunkBounds[1] && minChunkY === aiHelperComponent.visibleChunkBounds[2] && maxChunkY === aiHelperComponent.visibleChunkBounds[3]) {
      aiHelperComponent.visibleEntities = calculateVisibleEntities(aiHelperComponent);
      return;
   }

   aiHelperComponent.visibleChunkBounds[0] = minChunkX;
   aiHelperComponent.visibleChunkBounds[1] = maxChunkX;
   aiHelperComponent.visibleChunkBounds[2] = minChunkY;
   aiHelperComponent.visibleChunkBounds[3] = maxChunkY;

   const layer = getEntityLayer(entity);

   const newVisibleChunks: Array<Chunk> = [];
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = layer.getChunk(chunkX, chunkY);
         newVisibleChunks.push(chunk);
      }
   }

   // Find all chunks which aren't present in the new chunks and remove them
   for (const chunk of aiHelperComponent.visibleChunks) {
      if (newVisibleChunks.indexOf(chunk) === -1) {
         // Remove previously visible chunk
         chunk.viewingEntities.splice(chunk.viewingEntities.indexOf(entity), 1);
         aiHelperComponent.visibleChunks.splice(aiHelperComponent.visibleChunks.indexOf(chunk), 1);

         // Remove entities in the chunk from the potentially visible list
         for (let i = 0; i < chunk.entities.length; i++) {
            const entity = chunk.entities[i];

            const idx = aiHelperComponent.potentialVisibleEntities.indexOf(entity);
            // We do this check as decorative entities might not be in the potential visible array
            if (idx !== -1) {
               aiHelperComponent.potentialVisibleEntityAppearances[idx]--;
               if (aiHelperComponent.potentialVisibleEntityAppearances[idx] === 0) {
                  aiHelperComponent.potentialVisibleEntities.splice(idx, 1);
                  aiHelperComponent.potentialVisibleEntityAppearances.splice(idx, 1);
               }
            }
         }
      }
   }

   // Add all new chunks
   for (const chunk of newVisibleChunks) {
      if (aiHelperComponent.visibleChunks.indexOf(chunk) === -1) {
         // Add new visible chunk
         chunk.viewingEntities.push(entity);
         aiHelperComponent.visibleChunks.push(chunk);

         // Add existing game objects to the potentially visible list
         const numEntities = chunk.entities.length;
         for (let i = 0; i < numEntities; i++) {
            const currentEntity = chunk.entities[i];

            if (entityIsNoticedByAI(aiHelperComponent, currentEntity)) {
               const idx = aiHelperComponent.potentialVisibleEntities.indexOf(currentEntity);
               if (idx === -1 && currentEntity !== entity) {
                  aiHelperComponent.potentialVisibleEntities.push(currentEntity);
                  aiHelperComponent.potentialVisibleEntityAppearances.push(1);
               } else {
                  aiHelperComponent.potentialVisibleEntityAppearances[idx]++;
               }
            }
         }
      }
   }

   aiHelperComponent.visibleEntities = calculateVisibleEntities(aiHelperComponent);
}

function getDataLength(): number {
   return Bytes.Float32;
}

function addDataToPacket(packet: Packet, entityID: number): void {
   const aiHelperComponent = AIHelperComponentArray.getComponent(entityID);
   
   packet.writeNumber(aiHelperComponent.visionRange);
}