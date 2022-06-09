import Component from "../Component";
import STATUS_EFFECT_RECORD, { StatusEffectType } from "../data/status-effects";
import HealthComponent from "../entity-components/HealthComponent";
import TransformComponent from "../entity-components/TransformComponent";
import ParticleSource, { ParticleSourceInfo } from "../particles/ParticleSource";
import SETTINGS from "../settings";
import { Point } from "../utils";

type StatusEffect = {
   readonly type: StatusEffectType;
   remainingDuration: number;
   age: number;
   readonly particleSource?: ParticleSource;
}

class StatusEffectComponent extends Component {
   private readonly statusEffects: Partial<Record<StatusEffectType, StatusEffect>> = {};

   public onLoad(): void {
      // Clear status effects on death
      this.getEntity().createEvent("die", () => {
         for (const statusEffect of Object.values(this.statusEffects)) {
            if (typeof statusEffect.particleSource !== "undefined") {
               statusEffect.particleSource.destroy();
            }
         }

         // Remove all status effects
         // This has to be done as otherwise entities which respawn can have status effects carry over between lives because garbage collection doesn't stab them
         const keys = Object.keys(this.statusEffects) as Array<StatusEffectType>;
         for (const key of keys) {
            delete this.statusEffects[key];
         }
      });
   }

   public tick(): void {
      // Update status effects
      const entries = Object.entries(this.statusEffects) as Array<[StatusEffectType, StatusEffect]>;
      for (const [type, statusEffect] of entries) {
         statusEffect.remainingDuration -= 1 / SETTINGS.tps;
         statusEffect.age += 1 / SETTINGS.tps;

         // Remove the status effect if it has expired
         if (statusEffect.remainingDuration <= 0) {
            // If the status effect had a particle source, remove it
            if (typeof statusEffect.particleSource !== "undefined") {
               statusEffect.particleSource.destroy();
            }
            
            delete this.statusEffects[type];

            continue;
         }

         const info = STATUS_EFFECT_RECORD[statusEffect.type];
         // Damage over time
         if (typeof info.effects.damageOverTime !== "undefined") {
            // Only damage the entity once every second
            const previousAge = statusEffect.age - 1 / SETTINGS.tps;
            if (Math.floor(previousAge) !== Math.floor(statusEffect.age)) {
               // Hurt the entity
               const healthComponent = this.getEntity().getComponent(HealthComponent);
               if (healthComponent !== null) {
                  healthComponent.hurt(info.effects.damageOverTime, null)
               }
            }
         }
      }
   }

   public hasStatusEffect(type: StatusEffectType): boolean {
      return this.statusEffects.hasOwnProperty(type);
   }

   public applyStatusEffect(type: StatusEffectType, duration: number): void {
      // Don't apply the status effect to dead entities
      if (!this.getEntity().getComponent(HealthComponent)!.isAlive()) return;

      // Don't apply the status effect if it already exists
      if (this.hasStatusEffect(type)) {
         const statusEffect = this.statusEffects[type]!;

         // Refresh its duration
         if (duration > statusEffect.remainingDuration) statusEffect.remainingDuration = duration;

         return;
      }

      const info = STATUS_EFFECT_RECORD[type];

      let particleSource: ParticleSource | undefined = undefined;
      const transformComponent = this.getEntity().getComponent(TransformComponent)!;
      if (transformComponent !== null) {
         // Create the particle source
         if (typeof info.particleSource !== "undefined") {
            const getPosition = (): Point => {
               return transformComponent.position.copy();
            }

            const particleSourceInfo: ParticleSourceInfo = { position: getPosition, ...info.particleSource };
            particleSource = new ParticleSource(particleSourceInfo);
         }
      }

      this.statusEffects[type] = {
         type: type,
         remainingDuration: duration,
         age: 0,
         particleSource: particleSource
      };
   }
}

export default StatusEffectComponent;