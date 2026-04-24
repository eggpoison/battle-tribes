import { randItem, Entity, ServerComponentType } from "webgl-test-shared";
import _ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { BALLISTA_AMMO_BOX_OFFSET_X, BALLISTA_AMMO_BOX_OFFSET_Y, BALLISTA_GEAR_X, BALLISTA_GEAR_Y } from "../../utils";
import { ROCK_HIT_SOUNDS, ROCK_DESTROY_SOUNDS, playSoundOnHitbox } from "../../sound";
import { RenderPart } from "../../render-parts/render-parts";
import { TransformComponentArray } from "./TransformComponent";
import { EntityComponentData } from "../../world";
import { Hitbox } from "../../hitboxes";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getTransformComponentData } from "../component-types";
import { addRenderPartTag } from "../../render-parts/render-part-tags";
import { registerServerComponentArray } from "../component-registry";

export interface BallistaComponentData {}

export interface BallistaComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.ballista, _BallistaComponentArray> {}
}

class _BallistaComponentArray extends _ServerComponentArray<BallistaComponent, BallistaComponentData> {
   public decodeData(): BallistaComponentData {
      return {};
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponentData.hitboxes[0];
      
      // Base
      renderObject.attachRenderPart(
         new TexturedRenderPart(
            hitbox,
            0,
            0,
            0, 0,
            getTextureArrayIndex("entities/ballista/base.png")
         )
      );

      // Ammo box
      const ammoBoxRenderPart = new TexturedRenderPart(
         hitbox,
         1,
         Math.PI / 2,
         BALLISTA_AMMO_BOX_OFFSET_X, BALLISTA_AMMO_BOX_OFFSET_Y,
         getTextureArrayIndex("entities/ballista/ammo-box.png")
      );
      renderObject.attachRenderPart(ammoBoxRenderPart);

      // Plate
      const plateRenderPart = new TexturedRenderPart(
         hitbox,
         2,
         0,
         0, 0,
         getTextureArrayIndex("entities/ballista/plate.png")
      );
      addRenderPartTag(plateRenderPart, "turretComponent:pivoting");
      renderObject.attachRenderPart(plateRenderPart);

      // Shaft
      const shaftRenderPart = new TexturedRenderPart(
         plateRenderPart,
         3,
         0,
         0, 0,
         getTextureArrayIndex("entities/ballista/shaft.png")
      );
      renderObject.attachRenderPart(shaftRenderPart);

      // Gears
      const gearRenderParts: Array<RenderPart> = [];
      for (let i = 0; i < 2; i++) {
         const renderPart = new TexturedRenderPart(
            shaftRenderPart,
            2.5 + i * 0.1,
            0,
            i === 0 ? BALLISTA_GEAR_X : -BALLISTA_GEAR_X, BALLISTA_GEAR_Y,
            getTextureArrayIndex("entities/ballista/gear.png")
         );
         addRenderPartTag(renderPart, "turretComponent:gear");
         renderObject.attachRenderPart(renderPart);
         gearRenderParts.push(renderPart);
      }

      // Crossbow
      const crossbowRenderPart = new TexturedRenderPart(
         shaftRenderPart,
         5,
         0,
         0, 0,
         getTextureArrayIndex("entities/ballista/crossbow-1.png")
      );
      addRenderPartTag(crossbowRenderPart, "turretComponent:aiming");
      renderObject.attachRenderPart(crossbowRenderPart);
   }

   public createComponent(): BallistaComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 7;
   }

   public onHit(entity: Entity, hitbox: Hitbox): void {
      // @Temporary
      playSoundOnHitbox(randItem(ROCK_HIT_SOUNDS), 0.3, 1, entity, hitbox, false);
   }

   public onDie(entity: Entity): void {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.hitboxes[0];
      // @Temporary
      playSoundOnHitbox(randItem(ROCK_DESTROY_SOUNDS), 0.4, 1, entity, hitbox, false);
   }
}

export const BallistaComponentArray = registerServerComponentArray(ServerComponentType.ballista, _BallistaComponentArray, true);

export function createBallistaComponentData(): BallistaComponentData {
   return {};
}