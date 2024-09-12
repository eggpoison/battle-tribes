import { clamp, distance, lerp } from "battletribes-shared/utils";
import { ServerComponentType } from "battletribes-shared/components";
import { useEffect, useState } from "react";
import Entity from "../../Entity"
import Camera from "../../Camera";
import Board from "../../Board";
import { getHoveredEntityID } from "../../entity-selection";
import Game from "../../Game";
import Player from "../../entities/Player";
import { latencyGameState } from "../../game-state/game-states";
import { BuildMenu_isOpen } from "./BuildMenu";

const Y_OFFSET = -50;

let InspectHealthBar_setEntity: (entity: Entity | null) => void = () => {};
let InspectHealthBar_setPos: (x: number, y: number) => void;
let InspectHealthBar_setHealth: (health: number) => void;
let InspectHealthBar_setOpacity: (opacity: number) => void;

const InspectHealthBar = () => {
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

   // @Temporary
   if (entity === null) {
      return null;
   }
   
   const healthComponent = entity.getServerComponent(ServerComponentType.health);
   
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
   
   const hoveredEntityID = getHoveredEntityID();
   if (hoveredEntityID === Player.instance.id) {
      InspectHealthBar_setEntity(null);
      return;
   }

   const hoveredEntity = Board.entityRecord[hoveredEntityID];
   if (typeof hoveredEntity === "undefined") {
      InspectHealthBar_setEntity(null);
      return;
   }

   if (!hoveredEntity.hasServerComponent(ServerComponentType.health)) {
      InspectHealthBar_setEntity(null);
      return;
   }

   // Only show health for friendly tribe buildings/tribesman
   if (!hoveredEntity.hasServerComponent(ServerComponentType.tribe) || hoveredEntity.getServerComponent(ServerComponentType.tribe).tribeID !== Game.tribe.id) {
      InspectHealthBar_setEntity(null);
      return;
   }

   InspectHealthBar_setEntity(hoveredEntity);

   const healthComponent = hoveredEntity.getServerComponent(ServerComponentType.health);
   InspectHealthBar_setHealth(healthComponent.health);

   const barX = hoveredEntity.renderPosition.x;
   const barY = hoveredEntity.renderPosition.y + Y_OFFSET;
   InspectHealthBar_setPos(Camera.calculateXScreenPos(barX), Camera.calculateYScreenPos(barY));

   const transformComponent = Player.instance.getServerComponent(ServerComponentType.transform);
   
   const dist = distance(barX, barY, transformComponent.position.x, transformComponent.position.y);
   const opacity = lerp(0.4, 1, clamp((dist - 80) / 80, 0, 1));
   InspectHealthBar_setOpacity(opacity);
}