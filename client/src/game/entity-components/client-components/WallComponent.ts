import { EntityType, ServerComponentType, Entity, Point } from "webgl-test-shared";
import { EntityRenderObject } from "../../EntityRenderObject";
import { Hitbox } from "../../hitboxes";
import { createLightWoodSpeckParticle, createWoodShardParticle } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSoundOnHitbox } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData, getEntityRenderObject, getEntityType } from "../../world";
import { ClientComponentType } from "../client-component-types";
import _ClientComponentArray from "../ClientComponentArray";
import { WALL_TEXTURE_SOURCES } from "../server-components/BuildingMaterialComponent";
import { HealthComponentArray } from "../server-components/HealthComponent";
import { TransformComponentArray } from "../server-components/TransformComponent";
import { getServerComponentData, getTransformComponentData } from "../component-types";
import { getEntityServerComponentTypes } from "../component-types";
import { addRenderPartTag } from "../../render-parts/render-part-tags";
import { registerClientComponentArray } from "../component-registry";

// @Speed: Could make damage render part an overlay instead of a whole render part

export interface WallComponentData {}

export interface WallComponent {
   damageRenderPart: TexturedRenderPart | null;
}

const NUM_DAMAGE_STAGES = 6;

declare module "../component-registry" {
   interface ClientComponentRegistry extends RegisterClientComponent<ClientComponentType.wall, _WallComponentArray> {}
}

class _WallComponentArray extends _ClientComponentArray<WallComponent, WallComponentData> {
   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponentData.hitboxes[0];
      
      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const buildingMaterialComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.buildingMaterial);
      
      const renderPart = new TexturedRenderPart(
         hitbox,
         0,
         0,
         0, 0,
         getTextureArrayIndex(WALL_TEXTURE_SOURCES[buildingMaterialComponentData.material])
      );
      addRenderPartTag(renderPart, "buildingMaterialComponent:material");

      renderObject.attachRenderPart(renderPart);
   }

   public createComponent(): WallComponent {
      return {
         damageRenderPart: null
      };
   }

   public getMaxRenderParts(): number {
      // wall material and damage render part
      return 2;
   }
}

export const WallComponentArray = registerClientComponentArray(ClientComponentType.wall, _WallComponentArray, true);

export function createWallComponentData(): WallComponentData {
   return {};
}

const updateDamageRenderPart = (entity: Entity, health: number, maxHealth: number): void => {
   const wallComponent = WallComponentArray.getComponent(entity);
   
   // Max health can be 0 if it is an entity ghost
   let damageStage = maxHealth > 0 ? Math.ceil((1 - health / maxHealth) * NUM_DAMAGE_STAGES) : 0;
   if (damageStage === 0) {
      if (wallComponent.damageRenderPart !== null) {
         const renderObject = getEntityRenderObject(entity);
         renderObject.removeRenderPart(wallComponent.damageRenderPart);
         wallComponent.damageRenderPart = null;
      }
      return;
   }
   // @Temporary: this is only here due to a bug which lets health go negative when attacking 25 health wooden wall with deepfrost axe (8 damage). remove when that bug is fixed
   if (damageStage > NUM_DAMAGE_STAGES) {
      damageStage = NUM_DAMAGE_STAGES;
   }
   
   const textureSource = "entities/wall/wooden-wall-damage-" + damageStage + ".png";
   if (wallComponent.damageRenderPart === null) {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.hitboxes[0];
      
      wallComponent.damageRenderPart = new TexturedRenderPart(
         hitbox,
         1,
         0,
         0, 0,
         getTextureArrayIndex(textureSource)
      );
      const renderObject = getEntityRenderObject(entity);
      renderObject.attachRenderPart(wallComponent.damageRenderPart);
   } else {
      wallComponent.damageRenderPart.switchTextureSource(textureSource);
   }
}

function onTick(entity: Entity): void {
   const healthComponent = HealthComponentArray.getComponent(entity);
   updateDamageRenderPart(entity, healthComponent.health, healthComponent.maxHealth);
}

function onHit(entity: Entity, hitbox: Hitbox, hitPosition: Point): void {
   playSoundOnHitbox("wooden-wall-hit.mp3", 0.3, 1, entity, hitbox, false);

   for (let i = 0; i < 6; i++) {
      createLightWoodSpeckParticle(hitbox.box.position.x, hitbox.box.position.y, 32);
   }

   for (let i = 0; i < 10; i++) {
      let offsetDirection = hitbox.box.position.angleTo(hitPosition);
      offsetDirection += 0.2 * Math.PI * (Math.random() - 0.5);

      const spawnPositionX = hitbox.box.position.x + 32 * Math.sin(offsetDirection);
      const spawnPositionY = hitbox.box.position.y + 32 * Math.cos(offsetDirection);
      createLightWoodSpeckParticle(spawnPositionX, spawnPositionY, 5);
   }
}

// @Incomplete: doesn't play when removed by deconstruction
function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];

   // @Speed @Hack
   // Don't play death effects if the wall was replaced by a blueprint
   for (const chunk of transformComponent.chunks) {
      for (const entity of chunk.entities) {
         if (getEntityType(entity) !== EntityType.blueprintEntity) {
            continue;
         }

         const entityTransformComponent = TransformComponentArray.getComponent(entity);
         const entityHitbox = entityTransformComponent.hitboxes[0];

         const dist = hitbox.box.position.distanceTo(entityHitbox.box.position);
         if (dist < 1) {
            return;
         }
      }
   }

   playSoundOnHitbox("wooden-wall-break.mp3", 0.4, 1, entity, hitbox, false);

   for (let i = 0; i < 16; i++) {
      createLightWoodSpeckParticle(hitbox.box.position.x, hitbox.box.position.y, 32 * Math.random());
   }

   for (let i = 0; i < 8; i++) {
      createWoodShardParticle(hitbox.box.position.x, hitbox.box.position.y, 32);
   }
}