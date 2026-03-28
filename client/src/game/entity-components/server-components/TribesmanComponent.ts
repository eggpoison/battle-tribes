import { TileType, InventoryName, ItemType, CircularBox, TribeType, PacketReader, Point, assert, lerp, randAngle, randFloat, randInt, randItem, veryBadHash, TitleGenerationInfo, TribesmanTitle, Settings, ServerComponentType, Entity, EntityType } from "webgl-test-shared";
import { Light } from "../../lights";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { BloodParticleSize, createBloodParticle, createBloodParticleFountain, createBloodPoolParticle, createLeafParticle, createSprintParticle, createTitleObtainParticle, LeafParticleSize } from "../../particles";
import { createRenderPartOverlayGroup } from "../../rendering/webgl/overlay-rendering";
import { VisualRenderPart } from "../../render-parts/render-parts";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { EntityComponentData, getEntityRenderObject, getEntityType } from "../../world";
import { InventoryUseComponentArray } from "./InventoryUseComponent";
import { resetIgnoredTileSpeedMultipliers, TransformComponentArray } from "./TransformComponent";
import ServerComponentArray from "../ServerComponentArray";
import RenderAttachPoint from "../../render-parts/RenderAttachPoint";
import { playSoundOnHitbox } from "../../sound";
import { InventoryComponentArray, getInventory } from "./InventoryComponent";
import { TribeComponentArray } from "./TribeComponent";
import { playerInstance } from "../../player";
import { getHitboxTile, getHitboxVelocity, Hitbox } from "../../hitboxes";
import { EntityRenderObject } from "../../EntityRenderObject";
import { currentSnapshot } from "../../game";
import { tabSelectorState } from "../../../ui-state/tab-selector-state";
import { getServerComponentData, getTransformComponentData } from "../../entity-component-types";
import { getEntityServerComponentTypes } from "../../entity-component-types";
import { addRenderPartTag, getRenderThingByTag, getRenderThingsByTag } from "../../render-parts/render-part-tags";

export interface TribesmanComponentData {
   readonly warpaintType: number | null;
   readonly titles: ReadonlyArray<TitleGenerationInfo>;
}

interface IntermediateInfo {
   readonly bodyRenderPart: VisualRenderPart;
   readonly limbRenderParts: ReadonlyArray<VisualRenderPart>;
}

export interface TribesmanComponent {
   readonly bodyRenderPart: VisualRenderPart;
   readonly handRenderParts: ReadonlyArray<VisualRenderPart>;
   
   warpaintType: number | null;
   
   // @Polymorphism: Make readonly
   titles: ReadonlyArray<TitleGenerationInfo>;

   readonly deathbringerEyeLights: Array<Light>;
}

// @Memory
const GOBLIN_HURT_SOUNDS: ReadonlyArray<string> = ["goblin-hurt-1.mp3", "goblin-hurt-2.mp3", "goblin-hurt-3.mp3", "goblin-hurt-4.mp3", "goblin-hurt-5.mp3"];
const GOBLIN_DIE_SOUNDS: ReadonlyArray<string> = ["goblin-die-1.mp3", "goblin-die-2.mp3", "goblin-die-3.mp3", "goblin-die-4.mp3"];

const GOBLIN_EAR_OFFSET = 4;
const GOBLIN_EAR_ANGLE = Math.PI / 3;

const TUNDRA_IGNORED_TILE_MOVE_SPEEDS = [TileType.snow];
const FISH_SUIT_IGNORED_TILE_MOVE_SPEEDS = [TileType.water];



// @Incomplete?


// const switchTribeMemberRenderParts = (tribesman: Entity): void => {
//    // @Robustness: don't do this. instead remove all and add them back
   
//    const entityType = getEntityType(tribesman.id);
   
//    const tribeComponent = tribesman.getServerComponentA(ServerComponentType.tribe);
//    const tribeType = tribeComponent.tribeType;
   
//    // Switch hand texture sources
//    const handTextureSource = getFistTextureSource(entityType, tribeType);
//    const handRenderParts = tribesman.getRenderThings("tribeMemberComponent:hand", 2) as Array<TexturedRenderPart>;
//    for (let i = 0; i < handRenderParts.length; i++) {
//       const renderPart = handRenderParts[i];
//       renderPart.switchTextureSource(handTextureSource);
//    }

//    // Switch body texture source
//    const bodyTextureSource = getBodyTextureSource(entityType, tribeType);
//    const handRenderPart = tribesman.getRenderThing("tribeMemberComponent:body") as TexturedRenderPart;
//    handRenderPart.switchTextureSource(bodyTextureSource);

//    // Remove any goblin ears
//    const goblinEars = tribesman.getRenderThings("tribeMemberComponent:ear") as Array<RenderPart>;
//    for (let i = 0; i < goblinEars.length; i++) {
//       const renderPart = goblinEars[i];
//       tribesman.removeRenderPart(renderPart);
//    }

//    if (tribeType === TribeType.goblins) {
//       // Add warpaint
//       // @Incomplete
//    } else {
//       // Remove warpaint (if any)
//       const warpaints = tribesman.getRenderThings("tribeMemberComponent:warpaint") as Array<RenderPart>;
//       for (let i = 0; i < warpaints.length; i++) {
//          const renderPart = warpaints[i];
//          tribesman.removeRenderPart(renderPart);
//       }
//    }
// }






// @Incomplete?
// private updateLowHealthMarker(shouldShow: boolean): void {
//    if (shouldShow) {
//       if (this.lowHealthMarker === null) {
//          this.lowHealthMarker = new TexturedRenderPart(
//             null,
//             9,
//             0,
//             getTextureArrayIndex("entities/low-health-marker.png")
//          );
//          this.lowHealthMarker.inheritParentRotation = false;
//          this.lowHealthMarker.offset.x = 20;
//          this.lowHealthMarker.offset.y = 20;

//          const renderObject = getEntityRenderObject(this.id);
//          renderObject.attachRenderThing(this.lowHealthMarker);
//       }

//       let opacity = Math.sin(getEntityAgeTicks(this.id) * Settings.DT_S * 5) * 0.5 + 0.5;
//       this.lowHealthMarker.opacity = lerp(0.3, 0.8, opacity);
//    } else {
//       if (this.lowHealthMarker !== null) {
//          const renderObject = getEntityRenderObject(this.id);
//          renderObject.removeRenderPart(this.lowHealthMarker);
//          this.lowHealthMarker = null;
//       }
//    }
// }

// @Cleanup: remove. just do in components
// public updateFromData(data: EntiaaatyData): void {
//    const tribeComponent = this.getServerComponentA(ServerComponentType.tribe);
//    const tribeTypeBeforeUpdate = tribeComponent.tribeType;

//    super.updateFromData(data);

//    // Show low health marker for friendly tribe members
//    if (tribeComponent.tribeID === Game.tribe.id) {
//       const healthComponent = this.getServerComponentA(ServerComponentType.health);
//       this.updateLowHealthMarker(healthComponent.health <= healthComponent.maxHealth / 2);
//    }

//    // If tribe type is changed, update render parts
//    if (tribeComponent.tribeType !== tribeTypeBeforeUpdate) {
//       switchTribeMemberRenderParts(this);
//    }
// }



/** Gets the radius of a humanoid creature with just the one circular hitbox */
export function getHumanoidRadius(tribesman: Entity): number {
   const transformComponent = TransformComponentArray.getComponent(tribesman);
   return ((transformComponent.hitboxes[0]).box as CircularBox).radius;
}

const getSecondsSinceLastAttack = (entity: Entity): number => {
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(entity);

   let maxLastTicks = 0;
   for (let i = 0; i < inventoryUseComponent.limbInfos.length; i++) {
      const limbInfo = inventoryUseComponent.limbInfos[i];

      if (limbInfo.lastAttackTicks > maxLastTicks) {
         maxLastTicks = limbInfo.lastAttackTicks;
      }
   }

   const ticksSinceLastAttack = currentSnapshot.tick - maxLastTicks;
   return ticksSinceLastAttack * Settings.DT_S;
}

const titlesArrayHasExtra = (extraCheckArray: ReadonlyArray<TitleGenerationInfo>, sourceArray: ReadonlyArray<TitleGenerationInfo>): boolean => {
   // Check for extra in titles1
   for (let i = 0; i < extraCheckArray.length; i++) {
      const titleGenerationInfo1 = extraCheckArray[i];

      let hasFound = false;
      for (let j = 0; j < sourceArray.length; j++) {
         const titleGenerationInfo2 = sourceArray[j];

         if (titleGenerationInfo2.title === titleGenerationInfo1.title) {
            hasFound = true;
            break;
         }
      }

      if (!hasFound) {
         return true;
      }
   }

   return false;
}

const titlesAreDifferent = (titles1: ReadonlyArray<TitleGenerationInfo>, titles2: ReadonlyArray<TitleGenerationInfo>): boolean => {
   return titlesArrayHasExtra(titles1, titles2) || titlesArrayHasExtra(titles2, titles1);
}

const readWarpaint = (reader: PacketReader): number | null => {
   const rawWarpaintType = reader.readNumber();
   const warpaintType = rawWarpaintType !== -1 ? rawWarpaintType : null;
   return warpaintType;
}

export function tribesmanHasTitle(tribesmanComponent: TribesmanComponent, title: TribesmanTitle): boolean {
   for (let i = 0; i < tribesmanComponent.titles.length; i++) {
      const generationInfo = tribesmanComponent.titles[i];
      if (generationInfo.title === title) {
         return true;
      }
   }

   return false;
}

export const TribesmanComponentArray = new ServerComponentArray<TribesmanComponent, TribesmanComponentData, IntermediateInfo>(ServerComponentType.tribesman, true, createComponent, getMaxRenderParts, decodeData);
TribesmanComponentArray.populateIntermediateInfo = populateIntermediateInfo;
TribesmanComponentArray.onTick = onTick;
TribesmanComponentArray.updateFromData = updateFromData;
TribesmanComponentArray.updatePlayerFromData = updatePlayerFromData;
TribesmanComponentArray.onHit = onHit;
TribesmanComponentArray.onDie = onDie;

function decodeData(reader: PacketReader): TribesmanComponentData {
   const warpaintType = readWarpaint(reader);
   
   const titles = new Array<TitleGenerationInfo>();
   const numTitles = reader.readNumber();
   for (let i = 0; i < numTitles; i++) {
      const title = reader.readNumber() as TribesmanTitle;
      const displayOption = reader.readNumber();
      
      titles.push({
         title: title,
         displayOption: displayOption
      });
   }

   return {
      warpaintType: warpaintType,
      titles: titles
   };
}

const getFistTextureSource = (entityType: EntityType, tribeType: TribeType): string => {
   switch (entityType) {
      // @Robustness
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
            case TribeType.dwarves: {
               return "entities/dwarves/fist.png";
            }
            default: {
               const unreachable: never = tribeType;
               return unreachable;
            }
         }
      }
      case EntityType.scrappy: return "entities/scrappy/hand.png";
      default: throw new Error();
   }
}

const getBodyTextureSource = (entityType: EntityType, tribeType: TribeType): string => {
   if (entityType === EntityType.scrappy) {
      return "entities/scrappy/body.png";
   }
   
   switch (tribeType) {
      case TribeType.plainspeople: {
         if (entityType === EntityType.tribeWarrior) {
            return "entities/plainspeople/warrior.png";
         } else if (entityType === EntityType.player) {
            return "entities/plainspeople/player.png";
         } else {
            return "entities/plainspeople/worker.png";
         }
      }
      case TribeType.goblins: {
         if (entityType === EntityType.tribeWarrior) {
            return "entities/goblins/warrior.png";
         } else if (entityType === EntityType.player) {
            return "entities/goblins/player.png";
         } else {
            return "entities/goblins/worker.png";
         }
      }
      case TribeType.frostlings: {
         if (entityType === EntityType.tribeWarrior) {
            return "entities/frostlings/warrior.png";
         } else if (entityType === EntityType.player) {
            return "entities/frostlings/player.png";
         } else {
            return "entities/frostlings/worker.png";
         }
      }
      case TribeType.barbarians: {
         if (entityType === EntityType.tribeWarrior) {
            return "entities/barbarians/warrior.png";
         } else if (entityType === EntityType.player) {
            return "entities/barbarians/player.png";
         } else {
            return "entities/barbarians/worker.png";
         }
      }
      case TribeType.dwarves: {
         if (entityType === EntityType.tribeWarrior) {
            return "entities/dwarves/warrior.png";
         } else if (entityType === EntityType.player) {
            return "entities/dwarves/player.png";
         } else {
            return "entities/dwarves/worker.png";
         }
      }
   }
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
   const tribeComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.tribe);
   
   // @Temporary @Hack
   // const radius = tribesman.type === EntityType.player || tribesman.type === EntityType.tribeWarrior ? 32 : 28;
   const radius = 32;

   // 
   // Body render part
   // 
   
   const bodyRenderPart = new TexturedRenderPart(
      transformComponentData.hitboxes[0],
      2,
      0,
      0, 0,
      getTextureArrayIndex(getBodyTextureSource(entityComponentData.entityType, tribeComponentData.tribeType))
   );
   renderObject.attachRenderPart(bodyRenderPart);

   if (tribeComponentData.tribeType === TribeType.goblins) {
      const tribesmanComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.tribesman);
      const warPaintType = tribesmanComponentData.warpaintType;
      assert(warPaintType !== null);
      
      let textureSource: string;
      if (entityComponentData.entityType === EntityType.tribeWarrior) {
         textureSource = `entities/goblins/warrior-warpaint-${warPaintType}.png`;
      } else {
         textureSource = `entities/goblins/goblin-warpaint-${warPaintType}.png`;
      }
      
      // Goblin warpaint
      const warpaintRenderPart = new TexturedRenderPart(
         bodyRenderPart,
         4,
         0,
         0, 0,
         getTextureArrayIndex(textureSource)
      );
      addRenderPartTag(warpaintRenderPart, "tribeMemberComponent:warpaint");
      renderObject.attachRenderPart(warpaintRenderPart);

      // Left ear
      const leftEarRenderPart = new TexturedRenderPart(
         bodyRenderPart,
         3,
         -Math.PI/2 + GOBLIN_EAR_ANGLE,
         (radius + GOBLIN_EAR_OFFSET) * Math.sin(GOBLIN_EAR_ANGLE), (radius + GOBLIN_EAR_OFFSET) * Math.cos(GOBLIN_EAR_ANGLE),
         getTextureArrayIndex("entities/goblins/goblin-ear.png")
      );
      addRenderPartTag(leftEarRenderPart, "tribeMemberComponent:ear");
      leftEarRenderPart.setFlipX(true);
      renderObject.attachRenderPart(leftEarRenderPart);

      // Right ear
      const rightEarRenderPart = new TexturedRenderPart(
         bodyRenderPart,
         3,
         -Math.PI/2 + GOBLIN_EAR_ANGLE,
         (radius + GOBLIN_EAR_OFFSET) * Math.sin(GOBLIN_EAR_ANGLE), (radius + GOBLIN_EAR_OFFSET) * Math.cos(GOBLIN_EAR_ANGLE),
         getTextureArrayIndex("entities/goblins/goblin-ear.png")
      );
      addRenderPartTag(rightEarRenderPart, "tribeMemberComponent:ear");
      renderObject.attachRenderPart(rightEarRenderPart);
   }

   // Hands
   const limbRenderParts = new Array<VisualRenderPart>();
   for (let i = 0; i < 2; i++) {
      const attachPoint = new RenderAttachPoint(
         bodyRenderPart,
         1,
         0,
         0, 0
      );
      if (i === 1) {
         attachPoint.setFlipX(true);
      }
      addRenderPartTag(attachPoint, "inventoryUseComponent:attachPoint");
      renderObject.attachRenderPart(attachPoint);
      
      const handRenderPart = new TexturedRenderPart(
         attachPoint,
         1.2,
         0,
         0, 0,
         getTextureArrayIndex(getFistTextureSource(entityComponentData.entityType, tribeComponentData.tribeType))
      );
      limbRenderParts.push(handRenderPart);
      addRenderPartTag(handRenderPart, "inventoryUseComponent:hand");
      renderObject.attachRenderPart(handRenderPart);
   }

   return {
      bodyRenderPart: bodyRenderPart,
      limbRenderParts: limbRenderParts
   };
}

function createComponent(entityComponentData: EntityComponentData, intermediateInfo: IntermediateInfo): TribesmanComponent {
   const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
   const tribesmanComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.tribesman);
   
   return {
      bodyRenderPart: intermediateInfo.bodyRenderPart,
      handRenderParts: intermediateInfo.limbRenderParts,
      warpaintType: tribesmanComponentData.warpaintType,
      titles: tribesmanComponentData.titles,
      deathbringerEyeLights: []
   };
}

function getMaxRenderParts(entityComponentData: EntityComponentData): number {
   const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
   const tribeComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.tribe);

   let maxRenderParts = 0;

   // Body
   maxRenderParts++;

   if (tribeComponentData.tribeType === TribeType.goblins) {
      maxRenderParts += 3;
   }

   // @Speed: 2 of these are attach points... can they be removed?
   maxRenderParts += 4;

   return maxRenderParts;
}

const regenerateTitleEffects = (tribeMemberComponent: TribesmanComponent, entity: Entity): void => {
   // Remove previous effects
   const renderObject = getEntityRenderObject(entity);
   const previousRenderParts = getRenderThingsByTag(renderObject, "tribeMemberComponent:fromTitle") as Array<VisualRenderPart>;
   for (let i = 0; i < previousRenderParts.length; i++) {
      const renderPart = previousRenderParts[i];
      renderObject.removeRenderPart(renderPart);
   }
   for (let i = renderObject.renderPartOverlayGroups.length - 1; i >= 0; i--) {
      const overlayGroup = renderObject.renderPartOverlayGroups[i];
      renderObject.removeOverlayGroup(overlayGroup);
   }
   // @Hack @Incomplete: only remove lights added by titles
   // removeAllAttachedLights(renderObject);
   
   // Add for all titles
   for (let i = 0; i < tribeMemberComponent.titles.length; i++) {
      const titleGenerationInfo = tribeMemberComponent.titles[i];
      const title = titleGenerationInfo.title;

      switch (title) {
         // Create 2 glowing red eyes
         case TribesmanTitle.deathbringer: {
            for (let i = 0; i < 2; i++) {
               const offsetX = 16 * (i === 0 ? -1 : 1);
               const offsetY = 20;
               
               // @INCOMPLETE
               
               // const light = createLight(
               //    new Point(offsetX, offsetY),
               //    0.4,
               //    0.4,
               //    0,
               //    1.75,
               //    0,
               //    0
               // );
               // tribeMemberComponent.deathbringerEyeLights.push(light);

               // // @Hack
               // const renderObject = getEntityRenderObject(entity);
               // attachLightToRenderPart(light, renderObject.renderPartsByZIndex[0], entity);
            }
            
            break;
         }
         // Create an eye scar
         case TribesmanTitle.bloodaxe: {
            const hash = veryBadHash(entity.toString());
            const isFlipped = hash % 2 === 0;

            const offsetX = (20 - 5 * 4 / 2) * (isFlipped ? 1 : -1);
            const offsetY = 24 - 6 * 4 / 2;

            const transformComponent = TransformComponentArray.getComponent(entity);
            const hitbox = transformComponent.hitboxes[0];

            const renderPart = new TexturedRenderPart(
               hitbox,
               2.2,
               0,
               offsetX, offsetY,
               getTextureArrayIndex("entities/miscellaneous/eye-scar.png")
            );
            addRenderPartTag(renderPart, "tribeMemberComponent:fromTitle");
            renderPart.setFlipX(true);

            renderObject.attachRenderPart(renderPart);
            break;
         }
         // Create shrewd eyes
         case TribesmanTitle.shrewd: {
            for (let i = 0; i < 2; i++) {
               const transformComponent = TransformComponentArray.getComponent(entity);
               const hitbox = transformComponent.hitboxes[0];

               // @Hack
               let xo: number;
               let yo: number;
               if (getEntityType(entity) === EntityType.tribeWorker) {
                  xo = 28;
                  yo = 24;
               } else {
                  xo = 28;
                  yo = 28;
               }

               const renderPart = new TexturedRenderPart(
                  hitbox,
                  2.1,
                  0,
                  (xo - 5 * 4 / 2) * (i === 1 ? 1 : -1), yo - 5 * 4 / 2,
                  // @Incomplete
                  getTextureArrayIndex("entities/plainspeople/shrewd-eye.png")
               );
               addRenderPartTag(renderPart, "tribeMemberComponent:fromTitle");

               if (i === 1) {
                  renderPart.setFlipX(true);
               }

               renderObject.attachRenderPart(renderPart);
            }
            
            break;
         }
         // Create 3/5 (berrymuncher/gardener title) leaves on back
         case TribesmanTitle.berrymuncher:
         case TribesmanTitle.gardener: {
            const numLeaves = title === TribesmanTitle.berrymuncher ? 3 : 5;
            for (let i = 0; i < numLeaves; i++) {
               const angle = ((i - (numLeaves - 1) / 2) * Math.PI * 0.2) + Math.PI;

               const transformComponent = TransformComponentArray.getComponent(entity);
               const hitbox = transformComponent.hitboxes[0];
               
               const radius = getHumanoidRadius(entity);
               const radiusAdd = lerp(-3, -6, Math.abs(i - (numLeaves - 1) / 2) / ((numLeaves - 1) / 2));

               const renderPart = new TexturedRenderPart(
                  hitbox,
                  0,
                  angle + Math.PI/2 + randFloat(-0.5, 0.5),
                  (radius + radiusAdd) * Math.sin(angle), (radius + radiusAdd) * Math.cos(angle),
                  getTextureArrayIndex("entities/miscellaneous/tribesman-leaf.png")
               );
               addRenderPartTag(renderPart, "tribeMemberComponent:fromTitle");

               renderObject.attachRenderPart(renderPart);
            }
            break;
         }
         case TribesmanTitle.yetisbane: {
            const transformComponent = TransformComponentArray.getComponent(entity);
            const hitbox = transformComponent.hitboxes[0];

            const radius = getHumanoidRadius(entity);

            const renderPart = new TexturedRenderPart(
               hitbox,
               0,
               0,
               0, radius - 2,
               getTextureArrayIndex("entities/miscellaneous/tribesman-fangs.png")
            );
            addRenderPartTag(renderPart, "tribeMemberComponent:fromTitle");

            renderObject.attachRenderPart(renderPart);
            break;
         }
         case TribesmanTitle.builder: {
            // 
            // Create a dirty shine on body render parts
            // 
            
            const bodyRenderPart = getRenderThingByTag(renderObject, "tribeMemberComponent:body") as VisualRenderPart;
            const bodyOverlayGroup = createRenderPartOverlayGroup(entity, "overlays/dirt.png", [bodyRenderPart]);
            renderObject.renderPartOverlayGroups.push(bodyOverlayGroup);

            const handRenderParts = getRenderThingsByTag(renderObject, "tribeMemberComponent:hand", 2) as Array<VisualRenderPart>;
            for (let i = 0; i < handRenderParts.length; i++) {
               const renderPart = handRenderParts[i];
               const handOverlayGroup = createRenderPartOverlayGroup(entity, "overlays/dirt.png", [renderPart]);
               renderObject.renderPartOverlayGroups.push(handOverlayGroup);
            }

            break;
         }
         case TribesmanTitle.wellful: {
            const transformComponent = TransformComponentArray.getComponent(entity)!;
            const hitbox = transformComponent.hitboxes[0];

            const renderPart = new TexturedRenderPart(
               hitbox,
               2.1,
               0,
               0, 0,
               getTextureArrayIndex("entities/miscellaneous/tribesman-health-patch.png")
            );
            addRenderPartTag(renderPart, "tribeMemberComponent:fromTitle");
            renderObject.attachRenderPart(renderPart);
            break;
         }
      }
   }
}

const updateTitles = (tribeMemberComponent: TribesmanComponent, entity: Entity, newTitles: ReadonlyArray<TitleGenerationInfo>): void => {
   if (titlesAreDifferent(tribeMemberComponent.titles, newTitles)) {
      // If at least 1 title is added, do particle effects
      if (titlesArrayHasExtra(newTitles, tribeMemberComponent.titles)) {
         const transformComponent = TransformComponentArray.getComponent(entity);
         const hitbox = transformComponent.hitboxes[0];
         for (let i = 0; i < 25; i++) {
            const offsetMagnitude = randFloat(12, 34);
            const offsetDirection = randAngle();
            const spawnPositionX = hitbox.box.position.x + offsetMagnitude * Math.sin(offsetDirection);
            const spawnPositionY = hitbox.box.position.y + offsetMagnitude * Math.cos(offsetDirection);

            const velocityMagnitude = randFloat(80, 120);
            const vx = velocityMagnitude * Math.sin(offsetDirection);
            const vy = velocityMagnitude * Math.cos(offsetDirection);
            
            createTitleObtainParticle(spawnPositionX, spawnPositionY, vx, vy, offsetDirection + Math.PI*3/4)
         }
      }

      tribeMemberComponent.titles = newTitles;
      regenerateTitleEffects(tribeMemberComponent, entity);
   }
}

function onTick(entity: Entity): void {
   const tribesmanComponent = TribesmanComponentArray.getComponent(entity);
   if (tribesmanComponent.deathbringerEyeLights.length > 0) {
      const eyeFlashProgress = Math.min(getSecondsSinceLastAttack(entity) / 0.5, 1)
      const intensity = lerp(0.6, 0.5, eyeFlashProgress);
      const r = lerp(2, 1.75, eyeFlashProgress);
      for (let i = 0; i < tribesmanComponent.deathbringerEyeLights.length; i++) {
         const light = tribesmanComponent.deathbringerEyeLights[i];
         light.intensity = intensity;
         light.r = r;
      }
   }

   const transformComponent = TransformComponentArray.getComponent(entity);
   const entityHitbox = transformComponent.hitboxes[0];
   
   const inventoryComponent = InventoryComponentArray.getComponent(entity);
   const armourSlotInventory = getInventory(inventoryComponent, InventoryName.armourSlot)!;
   
   // Move speeds
   const armour = armourSlotInventory.itemSlots[1];
   resetIgnoredTileSpeedMultipliers(transformComponent);
   if (armour !== undefined) {
      const tile = getHitboxTile(entityHitbox);

      // If frost armour is equipped, move at normal speed on snow tiles
      if ((armour.type === ItemType.frostArmour || armour.type === ItemType.winterskinArmour) && tile.type === TileType.snow) {
         transformComponent.ignoredTileSpeedMultipliers = TUNDRA_IGNORED_TILE_MOVE_SPEEDS;
      // If fishlord suit is equipped, move at normal speed on snow tiles
      } else if (armour.type === ItemType.fishlord_suit && tile.type === TileType.water) {
         transformComponent.ignoredTileSpeedMultipliers = FISH_SUIT_IGNORED_TILE_MOVE_SPEEDS;
      }
   }

   // Sprinter particles
   const velocity = getHitboxVelocity(entityHitbox);
   if (tribesmanHasTitle(tribesmanComponent, TribesmanTitle.sprinter) && velocity.magnitude() > 100) {
      const sprintParticleSpawnRate = Math.sqrt(velocity.magnitude() * 0.8);
      if (Math.random() < sprintParticleSpawnRate * Settings.DT_S) {
         const offsetMagnitude = 32 * Math.random();
         const offsetDirection = randAngle();
         const x = entityHitbox.box.position.x + offsetMagnitude * Math.sin(offsetDirection);
         const y = entityHitbox.box.position.y + offsetMagnitude * Math.cos(offsetDirection);
         
         const velocityMagnitude = 32 * Math.random();
         const velocityDirection = randAngle();
         const vx = velocityMagnitude * Math.sin(velocityDirection);
         const vy = velocityMagnitude * Math.cos(offsetDirection);
         createSprintParticle(x, y, vx, vy);
      }
   }

   // Winterswrath particles
   if (tribesmanHasTitle(tribesmanComponent, TribesmanTitle.winterswrath) && Math.random() < 18 * Settings.DT_S) {
      const offsetMagnitude = randFloat(36, 50);
      const offsetDirection = randAngle();
      const x = entityHitbox.box.position.x + offsetMagnitude * Math.sin(offsetDirection);
      const y = entityHitbox.box.position.y + offsetMagnitude * Math.cos(offsetDirection);
      
      const velocityMagnitude = randFloat(45, 75);
      const velocityDirection = offsetDirection + Math.PI * 0.5;
      const vx = velocity.x + velocityMagnitude * Math.sin(velocityDirection);
      const vy = velocity.y + velocityMagnitude * Math.cos(velocityDirection);
      
      createSprintParticle(x, y, vx, vy);
   }
}

function updateFromData(data: TribesmanComponentData, entity: Entity): void {
   const tribesmanComponent = TribesmanComponentArray.getComponent(entity);

   tribesmanComponent.warpaintType = data.warpaintType;

   // @Temporary @Garbage
   const titles = new Array<TitleGenerationInfo>();
   for (const title of data.titles) {
      titles.push(title);
   }
   
   updateTitles(tribesmanComponent, entity, titles);
}

function updatePlayerFromData(data: TribesmanComponentData): void {
   updateFromData(data, playerInstance!);

   const tribesmanComponent = TribesmanComponentArray.getComponent(playerInstance!);

   // @Garbage
   const titles = new Array<TribesmanTitle>();
   for (let i = 0; i < titles.length; i++) {
      const titleGenerationInfo = tribesmanComponent.titles[i];
      titles.push(titleGenerationInfo.title);
   }
   
   tabSelectorState.setTitles(titles);
}
   
function onHit(entity: Entity, hitbox: Hitbox, hitPosition: Point): void {
   // Blood pool particle
   createBloodPoolParticle(hitbox.box.position.x, hitbox.box.position.y, 20);
   
   // Blood particles
   for (let i = 0; i < 10; i++) {
      let offsetDirection = hitbox.box.position.angleTo(hitPosition);
      offsetDirection += 0.2 * Math.PI * (Math.random() - 0.5);

      const spawnPositionX = hitbox.box.position.x + 32 * Math.sin(offsetDirection);
      const spawnPositionY = hitbox.box.position.y + 32 * Math.cos(offsetDirection);
      createBloodParticle(Math.random() < 0.6 ? BloodParticleSize.small : BloodParticleSize.large, spawnPositionX, spawnPositionY, randAngle(), randFloat(150, 250), true);
   }

   const tribeComponent = TribeComponentArray.getComponent(entity);
   switch (tribeComponent.tribeType) {
      case TribeType.goblins: {
         playSoundOnHitbox(randItem(GOBLIN_HURT_SOUNDS), 0.4, 1, entity, hitbox, true);
         break;
      }
      case TribeType.plainspeople: {
         playSoundOnHitbox("plainsperson-hurt-" + randInt(1, 3) + ".mp3", 0.4, 1, entity, hitbox, true);
         break;
      }
      case TribeType.barbarians: {
         playSoundOnHitbox("barbarian-hurt-" + randInt(1, 3) + ".mp3", 0.4, 1, entity, hitbox, true);
         break;
      }
      case TribeType.frostlings: {
         playSoundOnHitbox("frostling-hurt-" + randInt(1, 4) + ".mp3", 0.4, 1, entity, hitbox, true);
         break;
      }
   }

   // If the tribesman is wearing a leaf suit, create leaf particles
   const inventoryComponent = InventoryComponentArray.getComponent(entity);
   const armourInventory = getInventory(inventoryComponent, InventoryName.armourSlot)!;
   const armour = armourInventory.itemSlots[1];
   if (armour !== undefined && armour.type === ItemType.leaf_suit) {
      for (let i = 0; i < 3; i++) {
         const moveDirection = randAngle();

         const radius = getHumanoidRadius(entity);
         const spawnPositionX = hitbox.box.position.x + radius * Math.sin(moveDirection);
         const spawnPositionY = hitbox.box.position.y + radius * Math.cos(moveDirection);

         createLeafParticle(spawnPositionX, spawnPositionY, moveDirection + randFloat(-1, 1), Math.random() < 0.5 ? LeafParticleSize.large : LeafParticleSize.small);
      }
   }
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];

   createBloodPoolParticle(hitbox.box.position.x, hitbox.box.position.y, 20);
   createBloodParticleFountain(entity, 0.1, 1);

   const tribeComponent = TribeComponentArray.getComponent(entity);
   switch (tribeComponent.tribeType) {
      case TribeType.goblins: {
         playSoundOnHitbox(randItem(GOBLIN_DIE_SOUNDS), 0.4, 1, entity, hitbox, false);
         break;
      }
      case TribeType.plainspeople: {
         playSoundOnHitbox("plainsperson-die-1.mp3", 0.4, 1, entity, hitbox, false);
         break;
      }
      case TribeType.barbarians: {
         playSoundOnHitbox("barbarian-die-1.mp3", 0.4, 1, entity, hitbox, false);
         break;
      }
      case TribeType.frostlings: {
         playSoundOnHitbox("frostling-die.mp3", 0.4, 1, entity, hitbox, false);
         break;
      }
   }
}