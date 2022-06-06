import Component from "../Component";
import HealthComponent from "../entity-components/HealthComponent";
import HitboxComponent from "../entity-components/HitboxComponent";
import RenderComponent from "../entity-components/RenderComponent";
import TransformComponent from "../entity-components/TransformComponent";
import { EntityInfo } from "../data/entity-info";
import { Point } from "../utils";
import Entity from "./Entity";

abstract class LivingEntity<I extends EntityInfo> extends Entity {
   public entityInfo!: I;

   constructor(position: Point, components?: ReadonlyArray<Component>) {
      super([
         new TransformComponent(position),
         new RenderComponent(),
         new HitboxComponent(),
         new HealthComponent(),
         ...(components || [])
      ]);
   }

   public setInfo(info: I): void {
      this.entityInfo = info;
   }

   public onLoad(): void {
      this.createRenderParts(this.getComponent(RenderComponent)!);
      this.setHitbox(this.getComponent(HitboxComponent)!);
   }

   public spawn?(): void;

   protected abstract createRenderParts(renderComponent: RenderComponent): void;
   protected abstract setHitbox(hitboxComponent: HitboxComponent): void;
}

export default LivingEntity;