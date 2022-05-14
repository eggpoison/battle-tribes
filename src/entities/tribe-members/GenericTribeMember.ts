import Component from "../../Component";
import Entity, { EventType } from "../Entity";
import Tribe from "../../Tribe";
import HealthComponent from "../../entity-components/HealthComponent";
import HitboxComponent from "../../entity-components/HitboxComponent";
import RenderComponent, { EllipseRenderPart } from "../../entity-components/RenderComponent";
import TransformComponent from "../../entity-components/TransformComponent";
import TribeMemberComponent from "../../entity-components/TribeMemberComponent";
import Mob from "../mobs/Mob";
import { Vector } from "../../utils";

abstract class GenericTribeMember extends Entity {
   public selectedSlot: number = 0;

   constructor(tribe: Tribe, components?: ReadonlyArray<Component>) {
      super([
         new TransformComponent(tribe.getMemberSpawnPosition()),
         new RenderComponent(),
         new HitboxComponent(),
         new HealthComponent(),
         new TribeMemberComponent(tribe),
         ...(components || [])
      ]);

      super.createEvent(EventType.killEntity, (entity: Entity) => {
         if (entity instanceof Mob) {
            const expDrop = entity.entityInfo.exp;
            
            this.getComponent(TribeMemberComponent)!.addExp(expDrop);
         }
      });
   }

   protected createRenderParts(bodySize: number, handSize: number, bodyColour: string, handColour: string, handAngles: number): void {
      const BORDER_COLOUR = "#000";

      // Create player body
      this.getComponent(RenderComponent)!.addPart(
         new EllipseRenderPart({
            type: "ellipse",
            fillColour: bodyColour,
            size: {
               radius: bodySize / 2
            },
            border: {
               width: 5,
               colour: BORDER_COLOUR
            },
            zIndex: 1
         })
      );

      // Create player hands
      for (let i = 0; i < 2; i++) {
         const multiplier = i === 0 ? -1 : 1;
         const offsetPoint = new Vector(bodySize / 2, handAngles * multiplier).convertToPoint();

         this.getComponent(RenderComponent)!.addPart(
            new EllipseRenderPart({
               type: "ellipse",
               fillColour: handColour,
               size: {
                  radius: handSize / 2
               },
               border: {
                  width: 3,
                  colour: BORDER_COLOUR
               },
               offset: [offsetPoint.x, offsetPoint.y],
               zIndex: 0
            })
         );
      }
   }
}

export default GenericTribeMember;