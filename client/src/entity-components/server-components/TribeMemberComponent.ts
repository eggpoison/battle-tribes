import { EntityID, EntityType, EntityTypeString } from "battletribes-shared/entities";
import { ServerComponentType } from "battletribes-shared/components";
import { Settings } from "battletribes-shared/settings";
import { TitleGenerationInfo, TribesmanTitle } from "battletribes-shared/titles";
import { Point, lerp, randFloat, veryBadHash } from "battletribes-shared/utils";
import { Light, addLight, attachLightToEntity, removeLightsAttachedToEntity } from "../../lights";
import Board from "../../Board";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { createSprintParticle, createTitleObtainParticle } from "../../particles";
import { createRenderPartOverlayGroup } from "../../rendering/webgl/overlay-rendering";
import { RenderPart } from "../../render-parts/render-parts";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { PacketReader } from "battletribes-shared/packets";
import { TitlesTab_setTitles } from "../../components/game/dev/tabs/TitlesTab";
import { getEntityRenderInfo, getEntityType } from "../../world";
import { InventoryUseComponentArray } from "../server-components/InventoryUseComponent";
import { TransformComponentArray } from "./TransformComponent";
import { PhysicsComponentArray } from "../server-components/PhysicsComponent";
import ServerComponentArray from "../ServerComponentArray";
import Player from "../../entities/Player";

export function getTribesmanRadius(tribesman: EntityID): number {
   const entityType = getEntityType(tribesman);
   switch (entityType) {
      case EntityType.player:
      case EntityType.tribeWarrior: {
         return 32;
      }
      case EntityType.tribeWorker: {
         return 28;
      }
      default: {
         throw new Error("Unknown radius for entity type " + EntityTypeString[entityType]);
      }
   }
}

const getSecondsSinceLastAttack = (entity: EntityID): number => {
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(entity);

   let maxLastTicks = 0;
   for (let i = 0; i < inventoryUseComponent.limbInfos.length; i++) {
      const limbInfo = inventoryUseComponent.limbInfos[i];

      if (limbInfo.lastAttackTicks > maxLastTicks) {
         maxLastTicks = limbInfo.lastAttackTicks;
      }
   }

   const ticksSinceLastAttack = Board.serverTicks - maxLastTicks;
   return ticksSinceLastAttack / Settings.TPS;
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

class TribeMemberComponent {
   public bodyRenderPart!: RenderPart;
   public handRenderParts!: ReadonlyArray<RenderPart>;
   
   public warPaintType: number | null = null;
   
   public titles: ReadonlyArray<TitleGenerationInfo> = [];

   public deathbringerEyeLights = new Array<Light>();

   public getTitles(): Array<TribesmanTitle> {
      const titles = new Array<TribesmanTitle>();
      for (let i = 0; i < this.titles.length; i++) {
         const titleGenerationInfo = this.titles[i];
         titles.push(titleGenerationInfo.title);
      }
      return titles;
   }

   public hasTitle(title: TribesmanTitle): boolean {
      for (let i = 0; i < this.titles.length; i++) {
         const generationInfo = this.titles[i];
         if (generationInfo.title === title) {
            return true;
         }
      }

      return false;
   }
}

export default TribeMemberComponent;

export const TribeMemberComponentArray = new ServerComponentArray<TribeMemberComponent>(ServerComponentType.tribeMember, true, {
   onLoad: onLoad,
   onTick: onTick,
   padData: padData,
   updateFromData: updateFromData,
   updatePlayerFromData: updatePlayerFromData
});

const regenerateTitleEffects = (tribeMemberComponent: TribeMemberComponent, entity: EntityID): void => {
   // Remove previous effects
   const renderInfo = getEntityRenderInfo(entity);
   const previousRenderParts = renderInfo.getRenderThings("tribeMemberComponent:fromTitle") as Array<RenderPart>;
   for (let i = 0; i < previousRenderParts.length; i++) {
      const renderPart = previousRenderParts[i];
      renderInfo.removeRenderPart(renderPart);
   }
   for (let i = renderInfo.renderPartOverlayGroups.length - 1; i >= 0; i--) {
      const overlayGroup = renderInfo.renderPartOverlayGroups[i];
      renderInfo.removeOverlayGroup(overlayGroup);
   }
   // @Hack @Incomplete: only remove lights added by titles
   removeLightsAttachedToEntity(entity);
   
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
               
               const light: Light = {
                  offset: new Point(offsetX, offsetY),
                  intensity: 0.4,
                  strength: 0.4,
                  radius: 0,
                  r: 1.75,
                  g: 0,
                  b: 0
               };
               tribeMemberComponent.deathbringerEyeLights.push(light);
               const lightID = addLight(light);
               attachLightToEntity(lightID, entity);
            }
            
            break;
         }
         // Create an eye scar
         case TribesmanTitle.bloodaxe: {
            const hash = veryBadHash(entity.toString());
            const isFlipped = hash % 2 === 0;

            const offsetX = (20 - 5 * 4 / 2) * (isFlipped ? 1 : -1);
            const offsetY = 24 - 6 * 4 / 2;

            const renderPart = new TexturedRenderPart(
               null,
               2.2,
               0,
               getTextureArrayIndex("entities/miscellaneous/eye-scar.png")
            );
            renderPart.addTag("tribeMemberComponent:fromTitle");
            renderPart.setFlipX(true);

            renderPart.offset.x = offsetX;
            renderPart.offset.y = offsetY;

            renderInfo.attachRenderThing(renderPart);
            break;
         }
         // Create shrewd eyes
         case TribesmanTitle.shrewd: {
            for (let i = 0; i < 2; i++) {
               const renderPart = new TexturedRenderPart(
                  null,
                  2.1,
                  0,
                  // @Incomplete
                  getTextureArrayIndex("entities/plainspeople/shrewd-eye.png")
               );
               renderPart.addTag("tribeMemberComponent:fromTitle");

               if (i === 1) {
                  renderPart.setFlipX(true);
               }

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
               
               renderPart.offset.x = (xo - 5 * 4 / 2) * (i === 1 ? 1 : -1);
               renderPart.offset.y = yo - 5 * 4 / 2;

               renderInfo.attachRenderThing(renderPart);
            }
            
            break;
         }
         // Create 3/5 (berrymuncher/gardener title) leaves on back
         case TribesmanTitle.berrymuncher:
         case TribesmanTitle.gardener: {
            const numLeaves = title === TribesmanTitle.berrymuncher ? 3 : 5;
            for (let i = 0; i < numLeaves; i++) {
               const angle = ((i - (numLeaves - 1) / 2) * Math.PI * 0.2) + Math.PI;
               
               const renderPart = new TexturedRenderPart(
                  null,
                  0,
                  angle + Math.PI/2 + randFloat(-0.5, 0.5),
                  getTextureArrayIndex("entities/miscellaneous/tribesman-leaf.png")
               );
               renderPart.addTag("tribeMemberComponent:fromTitle");

               const radiusAdd = lerp(-3, -6, Math.abs(i - (numLeaves - 1) / 2) / ((numLeaves - 1) / 2));

               const radius = getTribesmanRadius(entity);
               renderPart.offset.x = (radius + radiusAdd) * Math.sin(angle);
               renderPart.offset.y = (radius + radiusAdd) * Math.cos(angle);

               renderInfo.attachRenderThing(renderPart);
            }
            break;
         }
         case TribesmanTitle.yetisbane: {
            const renderPart = new TexturedRenderPart(
               null,
               0,
               0,
               getTextureArrayIndex("entities/miscellaneous/tribesman-fangs.png")
            );
            renderPart.addTag("tribeMemberComponent:fromTitle");

            const radius = getTribesmanRadius(entity);
            renderPart.offset.y = radius - 2;

            renderInfo.attachRenderThing(renderPart);
            break;
         }
         case TribesmanTitle.builder: {
            // 
            // Create a dirty shine on body render parts
            // 
            
            const bodyRenderPart = renderInfo.getRenderThing("tribeMemberComponent:body") as RenderPart;
            const bodyOverlayGroup = createRenderPartOverlayGroup(entity, "overlays/dirt.png", [bodyRenderPart]);
            renderInfo.renderPartOverlayGroups.push(bodyOverlayGroup);

            const handRenderParts = renderInfo.getRenderThings("tribeMemberComponent:hand", 2) as Array<RenderPart>;
            for (let i = 0; i < handRenderParts.length; i++) {
               const renderPart = handRenderParts[i];
               const handOverlayGroup = createRenderPartOverlayGroup(entity, "overlays/dirt.png", [renderPart]);
               renderInfo.renderPartOverlayGroups.push(handOverlayGroup);
            }

            break;
         }
         case TribesmanTitle.wellful: {
            const renderPart = new TexturedRenderPart(
               null,
               2.1,
               0,
               getTextureArrayIndex("entities/miscellaneous/tribesman-health-patch.png")
            );
            renderPart.addTag("tribeMemberComponent:fromTitle");
            renderInfo.attachRenderThing(renderPart);
            break;
         }
      }
   }
}

const updateTitles = (tribeMemberComponent: TribeMemberComponent, entity: EntityID, newTitles: ReadonlyArray<TitleGenerationInfo>): void => {
   if (titlesAreDifferent(tribeMemberComponent.titles, newTitles)) {
      // If at least 1 title is added, do particle effects
      if (titlesArrayHasExtra(newTitles, tribeMemberComponent.titles)) {
         const transformComponent = TransformComponentArray.getComponent(entity);
         for (let i = 0; i < 25; i++) {
            const offsetMagnitude = randFloat(12, 34);
            const offsetDirection = 2 * Math.PI * Math.random();
            const spawnPositionX = transformComponent.position.x + offsetMagnitude * Math.sin(offsetDirection);
            const spawnPositionY = transformComponent.position.y + offsetMagnitude * Math.cos(offsetDirection);

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

function onLoad(tribeMemberComponent: TribeMemberComponent, entity: EntityID): void {
   const renderInfo = getEntityRenderInfo(entity);
   tribeMemberComponent.bodyRenderPart = renderInfo.getRenderThing("tribeMemberComponent:body") as RenderPart;
   tribeMemberComponent.handRenderParts = renderInfo.getRenderThings("tribeMemberComponent:hand", 2) as Array<RenderPart>;
}

function onTick(tribeMemberComponent: TribeMemberComponent, entity: EntityID): void {
   if (tribeMemberComponent.deathbringerEyeLights.length > 0) {
      const eyeFlashProgress = Math.min(getSecondsSinceLastAttack(entity) / 0.5, 1)
      const intensity = lerp(0.6, 0.5, eyeFlashProgress);
      const r = lerp(2, 1.75, eyeFlashProgress);
      for (let i = 0; i < tribeMemberComponent.deathbringerEyeLights.length; i++) {
         const light = tribeMemberComponent.deathbringerEyeLights[i];
         light.intensity = intensity;
         light.r = r;
      }
   }

   const transformComponent = TransformComponentArray.getComponent(entity);
   const physicsComponent = PhysicsComponentArray.getComponent(entity);

   // Sprinter particles
   if (tribeMemberComponent.hasTitle(TribesmanTitle.sprinter) && physicsComponent.selfVelocity.length() > 100) {
      const sprintParticleSpawnRate = Math.sqrt(physicsComponent.selfVelocity.length() * 0.8);
      if (Math.random() < sprintParticleSpawnRate / Settings.TPS) {
         const offsetMagnitude = 32 * Math.random();
         const offsetDirection = 2 * Math.PI * Math.random();
         const x = transformComponent.position.x + offsetMagnitude * Math.sin(offsetDirection);
         const y = transformComponent.position.y + offsetMagnitude * Math.cos(offsetDirection);
         
         const velocityMagnitude = 32 * Math.random();
         const velocityDirection = 2 * Math.PI * Math.random();
         const vx = velocityMagnitude * Math.sin(velocityDirection);
         const vy = velocityMagnitude * Math.cos(offsetDirection);
         createSprintParticle(x, y, vx, vy);
      }
   }

   // Winterswrath particles
   if (tribeMemberComponent.hasTitle(TribesmanTitle.winterswrath) && Math.random() < 18 * Settings.I_TPS) {
      const offsetMagnitude = randFloat(36, 50);
      const offsetDirection = 2 * Math.PI * Math.random();
      const x = transformComponent.position.x + offsetMagnitude * Math.sin(offsetDirection);
      const y = transformComponent.position.y + offsetMagnitude * Math.cos(offsetDirection);
      
      const velocityMagnitude = randFloat(45, 75);
      const velocityDirection = offsetDirection + Math.PI * 0.5;
      const vx = physicsComponent.selfVelocity.x + velocityMagnitude * Math.sin(velocityDirection);
      const vy = physicsComponent.selfVelocity.y + velocityMagnitude * Math.cos(velocityDirection);
      
      createSprintParticle(x, y, vx, vy);
   }
}

function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);

   const numTitles = reader.readNumber();
   reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT * numTitles);
}

function updateFromData(reader: PacketReader, entity: EntityID): void {
   const tribeMemberComponent = TribeMemberComponentArray.getComponent(entity);

   tribeMemberComponent.warPaintType = readWarpaint(reader);

   // @Temporary @Garbage
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
   
   updateTitles(tribeMemberComponent, entity, titles);
}

function updatePlayerFromData(reader: PacketReader): void {
   updateFromData(reader, Player.instance!.id);
   
   const tribeMemberComponent = TribeMemberComponentArray.getComponent(Player.instance!.id);
   TitlesTab_setTitles(tribeMemberComponent.getTitles());
}