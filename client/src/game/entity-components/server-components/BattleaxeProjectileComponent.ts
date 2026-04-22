import { Entity, ServerComponentType, Settings } from "webgl-test-shared";
import { playSoundOnHitbox } from "../../sound";
import _ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";
import { tickIntervalHasPassed } from "../../networking/snapshots";
import { registerServerComponentArray } from "../component-registry";

export interface BattleaxeProjectileComponentData {}

export interface BattleaxeProjectileComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.battleaxeProjectile, _BattleaxeProjectileComponentArray, BattleaxeProjectileComponentData> {}
}

class _BattleaxeProjectileComponentArray extends _ServerComponentArray<BattleaxeProjectileComponent, BattleaxeProjectileComponentData, never> {
   public decodeData(): BattleaxeProjectileComponentData {
      return {};
   }

   public createComponent(): BattleaxeProjectileComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 0;
   }

   public onLoad(entity: Entity): void {
      playWhoosh(entity);
   }

   public onTick(entity: Entity): void {
      if (tickIntervalHasPassed(0.25 * Settings.TICK_RATE)) {
         playWhoosh(entity);
      }
   }
}

export const BattleaxeProjectileComponentArray = registerServerComponentArray(ServerComponentType.battleaxeProjectile, _BattleaxeProjectileComponentArray, true);

const playWhoosh = (entity: Entity): void => {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   playSoundOnHitbox("air-whoosh.mp3", 0.25, 1, entity, hitbox, true);
}