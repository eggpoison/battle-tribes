import { Entity, ServerComponentType, Settings } from "webgl-test-shared";
import { playSoundOnHitbox } from "../../sound";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";
import { tickIntervalHasPassed } from "../../game";

export interface BattleaxeProjectileComponentData {}

export interface BattleaxeProjectileComponent {}

export const BattleaxeProjectileComponentArray = new ServerComponentArray<BattleaxeProjectileComponent, BattleaxeProjectileComponentData, never>(ServerComponentType.battleaxeProjectile, true, createComponent, getMaxRenderParts, decodeData);
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

const playWhoosh = (entity: Entity): void => {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   playSoundOnHitbox("air-whoosh.mp3", 0.25, 1, entity, hitbox, true);
}

function onLoad(entity: Entity): void {
   playWhoosh(entity);
}

function onTick(entity: Entity): void {
   if (tickIntervalHasPassed(0.25 * Settings.TICK_RATE)) {
      playWhoosh(entity);
   }
}