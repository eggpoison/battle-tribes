<script lang="ts">
   import { type Entity, clamp, distance, lerp } from "webgl-test-shared";
   import { HealthComponentArray } from "../../game/entity-components/server-components/HealthComponent";
   
   const Y_OFFSET = -50;

   let InspectHealthBar_setOpacity: (opacity: number) => void;

   const [entity, setEntity] = useState<Entity | null>(null);
   const [x, setX] = useState(0);
   const [y, setY] = useState(0);
   const [health, setHealth] = useState(0);
   
   const dist = distance(barX, barY, hitbox.box.position.x, hitbox.box.position.y);
   const opacity = lerp(0.4, 1, clamp((dist - 80) / 80, 0, 1));
   InspectHealthBar_setOpacity(opacity);

   const healthComponent = HealthComponentArray.getComponent(entity)!;
</script>

<div id="health-inspector" style:left="{x}px" style:bottom="{y}px" style:opacity={opacity}>
   <!-- <div className="health-slider" style={{width: (health / healthComponent.maxHealth) * 100 + "%"}}></div> -->
   <div class="bg"></div>
   <div class="fill" style:--fullness="{health / healthComponent.maxHealth * 100}%"></div>
   <span class="health-counter">{health}</span>
</div>