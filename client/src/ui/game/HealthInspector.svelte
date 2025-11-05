<script lang="ts">
   import { clamp, distance, lerp, Point } from "webgl-test-shared/src/utils";
   import { getHoveredEntityID } from "../../game/entity-selection";
   import { HealthComponentArray } from "../../game/entity-components/server-components/HealthComponent";
   import { TribeComponentArray } from "../../game/entity-components/server-components/TribeComponent";
   import { TransformComponentArray } from "../../game/entity-components/server-components/TransformComponent";
   import { Entity } from "../../../../shared/src/entities";
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


   export function updateInspectHealthBar(): void {
      if (playerInstance === null || playerIsPlacingEntity() || hasOpenMenu()) {
         InspectHealthBar_setEntity(null);
         return;
      }
      
      const hoveredEntity = getHoveredEntityID();
      if (hoveredEntity === playerInstance) {
         InspectHealthBar_setEntity(null);
         return;
      }

      if (!HealthComponentArray.hasComponent(hoveredEntity)) {
         InspectHealthBar_setEntity(null);
         return;
      }

      // Only show health for friendly tribe buildings/tribesman
      const tribeComponent = TribeComponentArray.getComponent(hoveredEntity);
      if (tribeComponent === null || tribeComponent.tribeID !== playerTribe.id) {
         InspectHealthBar_setEntity(null);
         return;
      }

      const transformComponent = TransformComponentArray.getComponent(hoveredEntity);
      if (transformComponent === null) {
         InspectHealthBar_setEntity(null);
         return;
      }
      
      const healthComponent = HealthComponentArray.getComponent(hoveredEntity);
      if (healthComponent === null) {
         InspectHealthBar_setEntity(null);
         return;
      }

      InspectHealthBar_setEntity(hoveredEntity);
      
      InspectHealthBar_setHealth(healthComponent.health);
      const hitbox = transformComponent.hitboxes[0];

      // @INCOMPLETE @Bug: do render position !
      const barX = hitbox.box.position.x;
      const barY = hitbox.box.position.y + Y_OFFSET;
      const screenPos = worldToScreenPos(new Point(barX, barY));
      InspectHealthBar_setPos(screenPos.x, screenPos.y);


      const dist = distance(barX, barY, hitbox.box.position.x, hitbox.box.position.y);
      const opacity = lerp(0.4, 1, clamp((dist - 80) / 80, 0, 1));
      InspectHealthBar_setOpacity(opacity);
   }

   const healthComponent = HealthComponentArray.getComponent(entity)!;
</script>

<div id="health-inspector" style={{left: x + "px", bottom: y + "px", opacity: opacity}}>
   <!-- <div className="health-slider" style={{width: (health / healthComponent.maxHealth) * 100 + "%"}}></div> -->
   <div class="bg"></div>
   <div class="fill" style={{"--fullness": (health / healthComponent.maxHealth) * 100 + "%"} as React.CSSProperties}></div>
   <span class="health-counter">{health}</span>
</div>