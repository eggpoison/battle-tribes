<script lang="ts">
   import { type Entity, clamp, distance, lerp, type Point } from "webgl-test-shared";
   import { HealthComponentArray } from "../../game/entity-components/server-components/HealthComponent";
   import { TribeComponentArray } from "../../game/entity-components/server-components/TribeComponent";
   import { TransformComponentArray } from "../../game/entity-components/server-components/TransformComponent";
   import { playerTribe } from "../../game/tribes";
   import { playerInstance } from "../../game/player";
   import { worldToScreenPos } from "../../game/camera";

   const Y_OFFSET = -50;

   let InspectHealthBar_setEntity: (entity: Entity | null) => void = () => {};
   let InspectHealthBar_setPos: (x: number, y: number) => void;
   let InspectHealthBar_setHealth: (health: number) => void;
   let InspectHealthBar_setOpacity: (opacity: number) => void;

   const [entity, setEntity] = useState<Entity | null>(null);
   const [x, setX] = useState(0);
   const [y, setY] = useState(0);
   const [health, setHealth] = useState(0);
   const [opacity, setOpacity] = useState(1);
   
   useEffect(() => {
      InspectHealthBar_setEntity = (entity: Entity | null): void => {
         setEntity(entity);
      }
      InspectHealthBar_setPos = (x: number, y: number): void => {
         setX(x);
         setY(y);
      }
      InspectHealthBar_setHealth = (health: number): void => {
         setHealth(health);
      }
      InspectHealthBar_setOpacity = (opacity: number): void => {
         setOpacity(opacity);
      }
   }, []);

   const dist = distance(barX, barY, hitbox.box.position.x, hitbox.box.position.y);
   const opacity = lerp(0.4, 1, clamp((dist - 80) / 80, 0, 1));
   InspectHealthBar_setOpacity(opacity);

   const healthComponent = HealthComponentArray.getComponent(entity)!;
</script>

<div id="health-inspector" style={{left: x + "px", bottom: y + "px", opacity: opacity}}>
   <!-- <div className="health-slider" style={{width: (health / healthComponent.maxHealth) * 100 + "%"}}></div> -->
   <div class="bg"></div>
   <div class="fill" style={{"--fullness": (health / healthComponent.maxHealth) * 100 + "%"} as React.CSSProperties}></div>
   <span class="health-counter">{health}</span>
</div>