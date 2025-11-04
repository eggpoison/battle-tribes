import { useReducer, useEffect } from "react";
import { playerInstance } from "../../game/player";
import { TransformComponentArray } from "../../game/entity-components/server-components/TransformComponent";
import { CowComponentArray } from "../../game/entity-components/server-components/CowComponent";

const MAX_STAMINA = 15;

export let CowStaminaBar_forceUpdate: () => void = () => {}

const CowStaminaBar = () => {
   const [_, forceUpdate] = useReducer(x => x + 1, 0);
   
   useEffect(() => {
      CowStaminaBar_forceUpdate = forceUpdate;
   }, []);

   if (playerInstance === null) {
      return;
   }

   const playerTransformComponent = TransformComponentArray.getComponent(playerInstance);
   if (playerTransformComponent === null) {
      return;
   }

   const playerHitbox = playerTransformComponent.hitboxes[0];
   const rootEntity = playerHitbox.rootEntity;
   if (rootEntity === playerInstance) {
      return;
   }

   const cowComponent = CowComponentArray.getComponent(rootEntity);
   if (cowComponent === null) {
      return;
   }

   const stamina = cowComponent.stamina;
   
   return <div id="cow-stamina-bar">
      <img className="energy-blob" src={require("../../images/miscellaneous/energy-blob.png")} />
      <div className="stamina-slider" style={{width: stamina / MAX_STAMINA * 100 + "%"}}></div>
   </div>;
}

export default CowStaminaBar;