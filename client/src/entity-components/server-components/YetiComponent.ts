import { lerp, randFloat, randItem } from "battletribes-shared/utils";
import { RenderPart } from "../../render-parts/render-parts";
import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import { createSnowParticle, createWhiteSmokeParticle } from "../../particles";
import { playSound } from "../../sound";
import { RandomSoundComponentArray } from "../client-components/RandomSoundComponent";
import { Settings } from "../../../../shared/src/settings";
import { TransformComponentArray } from "./TransformComponent";
import { EntityID } from "../../../../shared/src/entities";
import { getEntityRenderInfo } from "../../world";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import ServerComponentArray from "../ServerComponentArray";

const enum Vars {
   SNOW_THROW_OFFSET = 64
}

export const YETI_SIZE = 128;

const YETI_PAW_START_ANGLE = Math.PI/3;
const YETI_PAW_END_ANGLE = Math.PI/6;

const AMBIENT_SOUNDS: ReadonlyArray<string> = ["yeti-ambient-1.mp3", "yeti-ambient-2.mp3", "yeti-ambient-3.mp3", "yeti-ambient-4.mp3", "yeti-ambient-5.mp3", "yeti-ambient-6.mp3"];
const ANGRY_SOUNDS: ReadonlyArray<string> = ["yeti-angry-1.mp3", "yeti-angry-2.mp3", "yeti-angry-3.mp3", "yeti-angry-4.mp3", "yeti-angry-5.mp3"];
const HURT_SOUNDS: ReadonlyArray<string> = ["yeti-hurt-1.mp3", "yeti-hurt-2.mp3", "yeti-hurt-3.mp3", "yeti-hurt-4.mp3", "yeti-hurt-5.mp3"];
const DEATH_SOUNDS: ReadonlyArray<string> = ["yeti-death-1.mp3", "yeti-death-2.mp3"];

class YetiComponent {
   public pawRenderParts!: ReadonlyArray<RenderPart>;
   
   public lastAttackProgress = 0;
   public attackProgress = 0;

   constructor(entity: EntityID) {
      const renderInfo = getEntityRenderInfo(entity);
      
      renderInfo.attachRenderThing(
         new TexturedRenderPart(
            null,
            1,
            0,
            getTextureArrayIndex("entities/yeti/yeti.png")
         )
      );

      for (let i = 0; i < 2; i++) {
         const paw = new TexturedRenderPart(
            null,
            0,
            0,
            getTextureArrayIndex("entities/yeti/yeti-paw.png")
         );
         paw.addTag("yetiComponent:paw");
         renderInfo.attachRenderThing(paw);
      }

      this.pawRenderParts = renderInfo.getRenderThings("yetiComponent:paw", 2) as Array<RenderPart>;
   }
}

export default YetiComponent;

export const YetiComponentArray = new ServerComponentArray<YetiComponent>(ServerComponentType.yeti, true, {
   onTick: onTick,
   onHit: onHit,
   onDie: onDie,
   padData: padData,
   updateFromData: updateFromData
});

function onTick(yetiComponent: YetiComponent, entity: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   // Create snow impact particles when the Yeti does a throw attack
   if (yetiComponent.attackProgress === 0 && yetiComponent.lastAttackProgress !== 0) {
      const offsetMagnitude = Vars.SNOW_THROW_OFFSET + 20;
      const impactPositionX = transformComponent.position.x + offsetMagnitude * Math.sin(transformComponent.rotation);
      const impactPositionY = transformComponent.position.y + offsetMagnitude * Math.cos(transformComponent.rotation);
      
      for (let i = 0; i < 30; i++) {
         const offsetMagnitude = randFloat(0, 20);
         const offsetDirection = 2 * Math.PI * Math.random();
         const positionX = impactPositionX + offsetMagnitude * Math.sin(offsetDirection);
         const positionY = impactPositionY + offsetMagnitude * Math.cos(offsetDirection);
         
         createSnowParticle(positionX, positionY, randFloat(40, 100));
      }

      // White smoke particles
      for (let i = 0; i < 10; i++) {
         const spawnPositionX = impactPositionX;
         const spawnPositionY = impactPositionY;
         createWhiteSmokeParticle(spawnPositionX, spawnPositionY, 1);
      }
   }
   yetiComponent.lastAttackProgress = yetiComponent.attackProgress;
}

function onHit(entity: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   playSound(randItem(HURT_SOUNDS), 0.7, 1, transformComponent.position.copy());
}

function onDie(entity: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   playSound(randItem(DEATH_SOUNDS), 0.7, 1, transformComponent.position.copy());
}

function padData(reader: PacketReader): void {
   reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);
}

const updatePaws = (yetiComponent: YetiComponent): void => {
   let attackProgress = yetiComponent.attackProgress;
   attackProgress = Math.pow(attackProgress, 0.75);
   
   for (let i = 0; i < 2; i++) {
      const paw = yetiComponent.pawRenderParts[i];

      const angle = lerp(YETI_PAW_END_ANGLE, YETI_PAW_START_ANGLE, attackProgress) * (i === 0 ? 1 : -1);
      paw.offset.x = YETI_SIZE/2 * Math.sin(angle);
      paw.offset.y = YETI_SIZE/2 * Math.cos(angle);
   }
}

function updateFromData(reader: PacketReader, entity: EntityID): void {
   const yetiComponent = YetiComponentArray.getComponent(entity);
   
   const isAttacking = reader.readBoolean();
   reader.padOffset(3);
   yetiComponent.attackProgress = reader.readNumber();
   updatePaws(yetiComponent);

   const randomSoundComponent = RandomSoundComponentArray.getComponent(entity);
   if (isAttacking) {
      randomSoundComponent.updateSounds(3.5 * Settings.TPS, 5.5 * Settings.TPS, ANGRY_SOUNDS, 0.7);
   } else {
      randomSoundComponent.updateSounds(7 * Settings.TPS, 11 * Settings.TPS, AMBIENT_SOUNDS, 0.7);
   }
}