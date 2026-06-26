import { ServerComponentType } from "../../../../../shared/src/components";
import { Entity } from "../../../../../shared/src/entities";
import { Settings } from "../../../../../shared/src/settings";
import { playSoundOnHitbox } from "../../sound";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";
import { tickIntervalHasPassed } from "../../networking/snapshots";
import { registerServerComponentArray } from "../component-registry";

export interface BattleaxeProjectileComponentData {}

export interface BattleaxeProjectileComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.battleaxeProjectile, typeof BattleaxeProjectileComponentArray> {}
}

export const BattleaxeProjectileComponentArray = registerServerComponentArray(
   ServerComponentType.battleaxeProjectile,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);
BattleaxeProjectileComponentArray.onLoad = onLoad;
BattleaxeProjectileComponentArray.onTick = onTick;

function decodeData(): BattleaxeProjectileComponentData {
   return {};
}

function createComponent(): BattleaxeProjectileComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 0;
}

function onLoad(entity: Entity): void {
   playWhoosh(entity);
}

function onTick(entity: Entity): void {
   if (tickIntervalHasPassed(0.25 * Settings.TICK_RATE)) {
      playWhoosh(entity);
   }
}

const playWhoosh = (entity: Entity): void => {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   playSoundOnHitbox("air-whoosh.mp3", 0.25, 1, entity, hitbox, true);
}