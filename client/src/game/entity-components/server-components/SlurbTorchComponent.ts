import { ServerComponentType } from "../../../../../shared/src/components";
import { Entity } from "../../../../../shared/src/entities";
import { Settings } from "../../../../../shared/src/settings";
import { randFloat, randAngle } from "../../../../../shared/src/utils";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { TransformComponentArray } from "./TransformComponent";
import { createSlurbParticle } from "../../particles";
import { EntityComponentData } from "../../world";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getTransformComponentData } from "../component-types";
import { registerServerComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";

const enum Var {
   MIN_PARTICLE_CREATION_INTERVAL_SECONDS = 0.45,
   MAX_PARTICLE_CREATION_INTERVAL_SECONDS = 1.55
}

export interface SlurbTorchComponentData {}

export interface SlurbTorchComponent {
   particleCreationTimer: number;
}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.slurbTorch, typeof SlurbTorchComponentArray> {}
}

export const SlurbTorchComponentArray = registerServerComponentArray(
   ServerComponentType.slurbTorch,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);
SlurbTorchComponentArray.populateIntermediateInfo = populateIntermediateInfo;
SlurbTorchComponentArray.onTick = onTick;

function decodeData(): SlurbTorchComponentData {
   return {};
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      0, 0,
      TextureIndex.entities_slurbTorch_slurbTorch
   );
   renderObject.attachRenderPart(renderPart);
}

function createComponent(): SlurbTorchComponent {
   return {
      particleCreationTimer: randFloat(Var.MIN_PARTICLE_CREATION_INTERVAL_SECONDS, Var.MAX_PARTICLE_CREATION_INTERVAL_SECONDS)
   };
}

function getMaxRenderParts(): number {
   return 1;
}

function onTick(entity: Entity): void {
   // @Copynpaste: all of these effects from InventoryUseComponent
   
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   
   // Slurb particles
   const slurbTorchComponent = SlurbTorchComponentArray.getComponent(entity);
   slurbTorchComponent.particleCreationTimer -= Settings.DT_S;
   if (slurbTorchComponent.particleCreationTimer <= 0) {
      slurbTorchComponent.particleCreationTimer += randFloat(Var.MIN_PARTICLE_CREATION_INTERVAL_SECONDS, Var.MAX_PARTICLE_CREATION_INTERVAL_SECONDS);

      let spawnPositionX = hitbox.box.posX;
      let spawnPositionY = hitbox.box.posY;

      const spawnOffsetMagnitude = 7 * Math.random();
      const spawnOffsetDirection = randAngle();
      spawnPositionX += spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
      spawnPositionY += spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

      createSlurbParticle(spawnPositionX, spawnPositionY, randAngle(), randFloat(80, 120), 0, 0);
   }
}

export function createSlurbTorchComponentData(): SlurbTorchComponentData {
   return {};
}