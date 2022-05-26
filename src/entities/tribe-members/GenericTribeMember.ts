import Component from "../../Component";
import Entity from "../Entity";
import Tribe from "../../Tribe";
import HealthComponent from "../../entity-components/HealthComponent";
import HitboxComponent from "../../entity-components/HitboxComponent";
import RenderComponent, { EllipseRenderPart } from "../../entity-components/RenderComponent";
import TransformComponent from "../../entity-components/TransformComponent";
import TribeMemberComponent from "../../entity-components/TribeMemberComponent";
import { Vector } from "../../utils";
import LivingEntity from "../LivingEntity";
import SelectedSlotComponent from "../../entity-components/SelectedSlotComponent";
import Timer from "../../Timer";
import Board from "../../Board";

abstract class GenericTribeMember extends Entity {
   public static readonly RESPAWN_TIME = 3;

   public sightRange!: number;

   constructor(tribe: Tribe, components?: ReadonlyArray<Component>) {
      super([
         new TransformComponent(tribe.getMemberSpawnPosition()),
         new RenderComponent(),
         new HitboxComponent(),
         new HealthComponent(),
         new TribeMemberComponent(tribe),
         new SelectedSlotComponent(),
         ...(components || [])
      ]);

      super.createEvent("killEntity", (entity: Entity) => {
         if (entity instanceof LivingEntity) {
            const expDrop = entity.entityInfo.exp;
            
            this.getComponent(TribeMemberComponent)!.addExp(expDrop);
         }
      });

      // Respawn when killed
      this.createEvent("die", () => this.startRespawn());
   }

   public onLoad(): void {
      const coordinates = this.getComponent(TransformComponent)!.getTileCoordinates();
      Board.revealFog(coordinates, this.sightRange, true);
   }

   public tick(): void {
      super.tick();

      // Reveal any fog of war the tribe member is standing on
      const coordinates = this.getComponent(TransformComponent)!.getTileCoordinates();
      Board.revealFog(coordinates, this.sightRange, false);
   }

   protected setSightRange(sightRange: number): void {
      this.sightRange = sightRange;
   }

   protected startRespawn(): void {
      new Timer({
         duration: GenericTribeMember.RESPAWN_TIME,
         onEnd: () => this.respawn(),
         onTick: this.respawnTick
      });
   }

   protected respawn(): void {
      this.getComponent(TribeMemberComponent)!.tribe.respawnEntity(this);
   }

   protected respawnTick?(duration: number): void;

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