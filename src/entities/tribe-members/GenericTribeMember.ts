import Component from "../../Component";
import Entity from "../Entity";
import Tribe from "../../Tribe";
import HealthComponent from "../../entity-components/HealthComponent";
import HitboxComponent from "../../entity-components/HitboxComponent";
import RenderComponent, { EllipseRenderPart } from "../../entity-components/RenderComponent";
import TransformComponent from "../../entity-components/TransformComponent";
import { Colour, randFloat, randInt, Vector, Vector3 } from "../../utils";
import LivingEntity from "../LivingEntity";
import SelectedSlotComponent from "../../entity-components/SelectedSlotComponent";
import Timer from "../../Timer";
import Board from "../../Board";
import TRIBE_INFO from "../../tribe-info";
import Particle from "../../particles/Particle";

abstract class GenericTribeMember extends Entity {
   public static readonly RESPAWN_TIME = 3;

   private static readonly SIZE = 1;
   private static readonly HAND_SIZE = 0.45;
   private static readonly HAND_ANGLES = 40 / 180 * Math.PI;

   public sightRange!: number;

   public readonly tribe: Tribe;

   constructor(tribe: Tribe, components?: ReadonlyArray<Component>) {
      super([
         new TransformComponent(tribe.getMemberSpawnPosition()),
         new RenderComponent(),
         new HitboxComponent(),
         new HealthComponent(),
         new SelectedSlotComponent(),
         ...(components || [])
      ]);

      this.tribe = tribe;

      this.createRenderParts();

      this.createEvent("killEntity", ([entity]: [Entity]) => {
         if (entity instanceof LivingEntity) {
            const expDrop = entity.entityInfo.exp;
            
            this.addExp(expDrop);
         }
      });

      // Create gore particles when hit
      this.createEvent("deathByEntity", ([attackingEntity]: [Entity]) => {
         const particleAmount = randInt(3, 5);

         const initialPosition = this.getComponent(TransformComponent)!.position.convertTo3D();

         // Calculate the push vector
         const angle = this.getComponent(TransformComponent)!.position.angleBetween(attackingEntity.getComponent(TransformComponent)!.position);
         const pushVector = new Vector3(1, Math.PI/2, angle + Math.PI);

         for (let i = 0; i < particleAmount; i++) {
            const inclination = randFloat(Math.PI / 4, Math.PI / 3);
            const azimuth = randFloat(0, Math.PI * 2);
            let velocity = new Vector3(3, inclination, azimuth);

            // Randomize the strength of the push vector
            pushVector.radius = randFloat(1, 1.5);

            velocity = velocity.add(pushVector);

            const width = randFloat(5, 12.5);
            const height = randFloat(5, 12.5);

            const colour = new Colour(TRIBE_INFO[this.tribe.type].bloodColour).getRGB();

            const lifespan = randFloat(0.5, 1);
            
            new Particle(initialPosition, {
               type: "rectangle",
               size: {
                  width: width,
                  height: height
               },
               initialVelocity: velocity,
               angularVelocity: 0,
               colour: colour,
               lifespan: lifespan,
               friction: 1
            });
         }
      });

      // Respawn when killed
      this.createEvent("die", () => this.startRespawn());
   }

   public onLoad(): void {
      if (this.tribe.type === "humans") {
         const coordinates = this.getComponent(TransformComponent)!.getTileCoordinates();
         Board.revealFog(coordinates, this.sightRange, true);
      }
   }

   public tick(): void {
      super.tick();

      // Reveal any fog of war the tribe member is standing on
      if (this.tribe.type === "humans") {
         const coordinates = this.getComponent(TransformComponent)!.getTileCoordinates();
         Board.revealFog(coordinates, this.sightRange, false);
      }
   }

   protected setSightRange(sightRange: number): void {
      this.sightRange = sightRange;
   }

   public addExp(amount: number): void {
      this.tribe.addExp(amount);
   }

   protected startRespawn(): void {
      new Timer({
         duration: GenericTribeMember.RESPAWN_TIME,
         onEnd: () => this.respawn(),
         onTick: this.respawnTick
      });
   }

   protected respawn(): void {
      this.tribe.respawnEntity(this);
   }

   protected respawnTick?(duration: number): void;

   private createRenderParts(): void {
      const BORDER_COLOUR = "#000";

      const colour = TRIBE_INFO[this.tribe.type].colour;

      // Create player body
      this.getComponent(RenderComponent)!.addPart(
         new EllipseRenderPart({
            type: "ellipse",
            fillColour: colour,
            size: {
               radius: GenericTribeMember.SIZE / 2
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
         const offsetPoint = new Vector(GenericTribeMember.SIZE / 2, GenericTribeMember.HAND_ANGLES * multiplier).convertToPoint();

         this.getComponent(RenderComponent)!.addPart(
            new EllipseRenderPart({
               type: "ellipse",
               fillColour: colour,
               size: {
                  radius: GenericTribeMember.HAND_SIZE / 2
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