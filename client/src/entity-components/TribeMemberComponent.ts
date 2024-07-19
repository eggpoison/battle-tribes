import { EntityType, EntityTypeString } from "webgl-test-shared/dist/entities";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { Settings } from "webgl-test-shared/dist/settings";
import { TitleGenerationInfo, TribesmanTitle } from "webgl-test-shared/dist/titles";
import { Point, lerp, randFloat, veryBadHash } from "webgl-test-shared/dist/utils";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { Light, addLight, attachLightToEntity, removeLightsAttachedToEntity } from "../lights";
import Board from "../Board";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { createSprintParticle, createTitleObtainParticle } from "../particles";
import { createRenderPartOverlayGroup } from "../rendering/webgl/overlay-rendering";
import { RenderPart } from "../render-parts/render-parts";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { PacketReader } from "webgl-test-shared/dist/packets";
import { TitlesTab_setTitles } from "../components/game/dev/tabs/TitlesTab";

export function getTribesmanRadius(tribesman: Entity): number {
   switch (tribesman.type) {
      case EntityType.player:
      case EntityType.tribeWarrior: {
         return 32;
      }
      case EntityType.tribeWorker: {
         return 28;
      }
      default: {
         throw new Error("Unknown radius for entity type " + EntityTypeString[tribesman.type]);
      }
   }
}

const getSecondsSinceLastAttack = (entity: Entity): number => {
   const inventoryUseComponent = entity.getServerComponent(ServerComponentType.inventoryUse);

   let maxLastTicks = 0;
   for (let i = 0; i < inventoryUseComponent.useInfos.length; i++) {
      const limbInfo = inventoryUseComponent.useInfos[i];

      if (limbInfo.lastAttackTicks > maxLastTicks) {
         maxLastTicks = limbInfo.lastAttackTicks;
      }
   }

   const ticksSinceLastAttack = Board.ticks - maxLastTicks;
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

class TribeMemberComponent extends ServerComponent {
   public bodyRenderPart!: RenderPart;
   public handRenderParts!: ReadonlyArray<RenderPart>;
   
   public warPaintType: number | null;
   
   public titles: ReadonlyArray<TitleGenerationInfo> = [];

   private deathbringerEyeLights = new Array<Light>();
   
   constructor(entity: Entity, reader: PacketReader) {
      super(entity);

      this.warPaintType = this.readWarpaint(reader);

      // @Temporary
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

      this.updateTitles(titles);
   }

   private readWarpaint(reader: PacketReader): number | null {
      const rawWarpaintType = reader.readNumber();
      const warpaintType = rawWarpaintType !== -1 ? rawWarpaintType : null;
      return warpaintType;
   }

   public onLoad(): void {
      this.bodyRenderPart = this.entity.getRenderPart("tribeMemberComponent:body");
      this.handRenderParts = this.entity.getRenderParts("tribeMemberComponent:hand", 2);
   }

   public getTitles(): Array<TribesmanTitle> {
      const titles = new Array<TribesmanTitle>();
      for (let i = 0; i < this.titles.length; i++) {
         const titleGenerationInfo = this.titles[i];
         titles.push(titleGenerationInfo.title);
      }
      return titles;
   }

   private regenerateTitleEffects(): void {
      // Remove previous effects
      const previousRenderParts = this.entity.getRenderParts("tribeMemberComponent:fromTitle");
      for (let i = 0; i < previousRenderParts.length; i++) {
         const renderPart = previousRenderParts[i];
         this.entity.removeRenderPart(renderPart);
      }
      for (let i = this.entity.renderPartOverlayGroups.length - 1; i >= 0; i--) {
         const overlayGroup = this.entity.renderPartOverlayGroups[i];
         this.entity.removeOverlayGroup(overlayGroup);
      }
      // @Hack @Incomplete: only remove lights added by titles
      removeLightsAttachedToEntity(this.entity.id);
      
      // Add for all titles
      for (let i = 0; i < this.titles.length; i++) {
         const titleGenerationInfo = this.titles[i];
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
                  this.deathbringerEyeLights.push(light);
                  const lightID = addLight(light);
                  attachLightToEntity(lightID, this.entity.id);
               }
               
               break;
            }
            // Create an eye scar
            case TribesmanTitle.bloodaxe: {
               const hash = veryBadHash(this.entity.id.toString());
               const isFlipped = hash % 2 === 0;

               const offsetX = (20 - 5 * 4 / 2) * (isFlipped ? 1 : -1);
               const offsetY = 24 - 6 * 4 / 2;

               const renderPart = new TexturedRenderPart(
                  this.entity,
                  2.2,
                  0,
                  getTextureArrayIndex("entities/miscellaneous/eye-scar.png")
               );
               renderPart.addTag("tribeMemberComponent:fromTitle");
               renderPart.flipX = isFlipped;

               renderPart.offset.x = offsetX;
               renderPart.offset.y = offsetY;

               this.entity.attachRenderPart(renderPart);
               break;
            }
            // Create shrewd eyes
            case TribesmanTitle.shrewd: {
               for (let i = 0; i < 2; i++) {
                  const renderPart = new TexturedRenderPart(
                     this.entity,
                     2.1,
                     0,
                     // @Incomplete
                     getTextureArrayIndex("entities/plainspeople/shrewd-eye.png")
                  );
                  renderPart.addTag("tribeMemberComponent:fromTitle");

                  if (i === 1) {
                     renderPart.flipX = true;
                  }

                  // @Hack
                  let xo: number;
                  let yo: number;
                  if (this.entity.type === EntityType.tribeWorker) {
                     xo = 28;
                     yo = 24;
                  } else {
                     xo = 28;
                     yo = 28;
                  }
                  
                  renderPart.offset.x = (xo - 5 * 4 / 2) * (i === 1 ? 1 : -1);
                  renderPart.offset.y = yo - 5 * 4 / 2;

                  this.entity.attachRenderPart(renderPart);
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
                     this.entity,
                     0,
                     angle + Math.PI/2 + randFloat(-0.5, 0.5),
                     getTextureArrayIndex("entities/miscellaneous/tribesman-leaf.png")
                  );
                  renderPart.addTag("tribeMemberComponent:fromTitle");

                  const radiusAdd = lerp(-3, -6, Math.abs(i - (numLeaves - 1) / 2) / ((numLeaves - 1) / 2));

                  const radius = getTribesmanRadius(this.entity);
                  renderPart.offset.x = (radius + radiusAdd) * Math.sin(angle);
                  renderPart.offset.y = (radius + radiusAdd) * Math.cos(angle);

                  this.entity.attachRenderPart(renderPart);
               }
               break;
            }
            case TribesmanTitle.yetisbane: {
               const renderPart = new TexturedRenderPart(
                  this.entity,
                  0,
                  0,
                  getTextureArrayIndex("entities/miscellaneous/tribesman-fangs.png")
               );
               renderPart.addTag("tribeMemberComponent:fromTitle");

               const radius = getTribesmanRadius(this.entity);
               renderPart.offset.y = radius - 2;

               this.entity.attachRenderPart(renderPart);
               break;
            }
            case TribesmanTitle.builder: {
               // 
               // Create a dirty shine on body render parts
               // 
               
               const bodyRenderPart = this.entity.getRenderPart("tribeMemberComponent:body");
               const bodyOverlayGroup = createRenderPartOverlayGroup(this.entity, "overlays/dirt.png", [bodyRenderPart]);
               this.entity.renderPartOverlayGroups.push(bodyOverlayGroup);

               const handRenderParts = this.entity.getRenderParts("tribeMemberComponent:hand", 2);
               for (let i = 0; i < handRenderParts.length; i++) {
                  const renderPart = handRenderParts[i];
                  const handOverlayGroup = createRenderPartOverlayGroup(this.entity, "overlays/dirt.png", [renderPart]);
                  this.entity.renderPartOverlayGroups.push(handOverlayGroup);
               }

               break;
            }
            case TribesmanTitle.wellful: {
               const renderPart = new TexturedRenderPart(
                  this.entity,
                  2.1,
                  0,
                  getTextureArrayIndex("entities/miscellaneous/tribesman-health-patch.png")
               );
               renderPart.addTag("tribeMemberComponent:fromTitle");
               this.entity.attachRenderPart(renderPart);
            }
         }
      }
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

   private updateTitles(newTitles: ReadonlyArray<TitleGenerationInfo>): void {
      if (titlesAreDifferent(this.titles, newTitles)) {
         // If at least 1 title is added, do particle effects
         if (titlesArrayHasExtra(newTitles, this.titles)) {
            const transformComponent = this.entity.getServerComponent(ServerComponentType.transform);
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

         this.titles = newTitles;
         this.regenerateTitleEffects();
      }
   }

   public tick(): void {
      if (this.deathbringerEyeLights.length > 0) {
         const eyeFlashProgress = Math.min(getSecondsSinceLastAttack(this.entity) / 0.5, 1)
         const intensity = lerp(0.6, 0.5, eyeFlashProgress);
         const r = lerp(2, 1.75, eyeFlashProgress);
         for (let i = 0; i < this.deathbringerEyeLights.length; i++) {
            const light = this.deathbringerEyeLights[i];
            light.intensity = intensity;
            light.r = r;
         }
      }

      const transformComponent = this.entity.getServerComponent(ServerComponentType.transform);
      const physicsComponent = this.entity.getServerComponent(ServerComponentType.physics);

      // Sprinter particles
      if (this.hasTitle(TribesmanTitle.sprinter) && physicsComponent.velocity.length() > 100) {
         const sprintParticleSpawnRate = Math.sqrt(physicsComponent.velocity.length() * 0.8);
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
      if (this.hasTitle(TribesmanTitle.winterswrath) && Math.random() < 18 * Settings.I_TPS) {
         const offsetMagnitude = randFloat(36, 50);
         const offsetDirection = 2 * Math.PI * Math.random();
         const x = transformComponent.position.x + offsetMagnitude * Math.sin(offsetDirection);
         const y = transformComponent.position.y + offsetMagnitude * Math.cos(offsetDirection);
         
         const velocityMagnitude = randFloat(45, 75);
         const velocityDirection = offsetDirection + Math.PI * 0.5;
         const vx = physicsComponent.velocity.x + velocityMagnitude * Math.sin(velocityDirection);
         const vy = physicsComponent.velocity.y + velocityMagnitude * Math.cos(velocityDirection);
         
         createSprintParticle(x, y, vx, vy);
      }
   }

   public padData(reader: PacketReader): void {
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT);

      const numTitles = reader.readNumber();
      reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT * numTitles);
   }

   public updateFromData(reader: PacketReader): void {
      this.warPaintType = this.readWarpaint(reader);

      // @Temporary
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
      
      this.updateTitles(titles);
   }

   public updatePlayerFromData(reader: PacketReader): void {
      this.updateFromData(reader);

      TitlesTab_setTitles(this.getTitles());
   }
}

export default TribeMemberComponent;