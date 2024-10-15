import { clamp, distance, lerp } from "battletribes-shared/utils";
import { useEffect, useState } from "react";
import Camera from "../../Camera";
import { getHoveredEntityID } from "../../entity-selection";
import Game from "../../Game";
import Player from "../../entities/Player";
import { latencyGameState } from "../../game-state/game-states";
import { BuildMenu_isOpen } from "./BuildMenu";
import { getEntityRenderInfo } from "../../world";
import { HealthComponentArray } from "../../entity-components/server-components/HealthComponent";
import { TribeComponentArray } from "../../entity-components/server-components/TribeComponent";
import { TransformComponentArray } from "../../entity-components/server-components/TransformComponent";
import { EntityID } from "../../../../shared/src/entities";

const Y_OFFSET = -50;

let InspectHealthBar_setEntity: (entity: EntityID | null) => void = () => {};
let InspectHealthBar_setPos: (x: number, y: number) => void;
let InspectHealthBar_setHealth: (health: number) => void;
let InspectHealthBar_setOpacity: (opacity: number) => void;

const InspectHealthBar = () => {
   const [entity, setEntity] = useState<EntityID | null>(null);
   const [x, setX] = useState(0);
   const [y, setY] = useState(0);
   const [health, setHealth] = useState(0);
   const [opacity, setOpacity] = useState(1);
   
   useEffect(() => {
      InspectHealthBar_setEntity = (entity: EntityID | null): void => {
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

   // @Temporary
   if (entity === null) {
      return null;
   }
   
   const healthComponent = HealthComponentArray.getComponent(entity);
   
   return <div id="inspect-health-bar" style={{left: x + "px", bottom: y + "px", opacity: opacity}}>
      <div className="health-slider" style={{width: (health / healthComponent.maxHealth) * 100 + "%"}}></div>
      <div className="health-counter-container">
         <span>{healthComponent.health}</span>
      </div>
   </div>;
}

export default InspectHealthBar;

export function updateInspectHealthBar(): void {
   if (Player.instance === null || latencyGameState.playerIsPlacingEntity || BuildMenu_isOpen()) {
      InspectHealthBar_setEntity(null);
      return;
   }
   
   const hoveredEntity = getHoveredEntityID();
   if (hoveredEntity === Player.instance.id) {
      InspectHealthBar_setEntity(null);
      return;
   }

   if (!HealthComponentArray.hasComponent(hoveredEntity)) {
      InspectHealthBar_setEntity(null);
      return;
   }

   // Only show health for friendly tribe buildings/tribesman
   if (!TribeComponentArray.hasComponent(hoveredEntity) || TribeComponentArray.getComponent(hoveredEntity).tribeID !== Game.tribe.id) {
      InspectHealthBar_setEntity(null);
      return;
   }

   InspectHealthBar_setEntity(hoveredEntity);

   const healthComponent = HealthComponentArray.getComponent(hoveredEntity);
   InspectHealthBar_setHealth(healthComponent.health);

   const renderInfo = getEntityRenderInfo(hoveredEntity);
   const barX = renderInfo.renderPosition.x;
   const barY = renderInfo.renderPosition.y + Y_OFFSET;
   InspectHealthBar_setPos(Camera.calculateXScreenPos(barX), Camera.calculateYScreenPos(barY));

   const transformComponent = TransformComponentArray.getComponent(Player.instance.id);
   
   const dist = distance(barX, barY, transformComponent.position.x, transformComponent.position.y);
   const opacity = lerp(0.4, 1, clamp((dist - 80) / 80, 0, 1));
   InspectHealthBar_setOpacity(opacity);
}