import { TRIBE_INFO_RECORD } from "battletribes-shared/tribes";
import { useEffect, useRef, useState } from "react";
import HealthIcon from "../../images/miscellaneous/health.png";
import { playerTribe } from "../../game/tribes";
import { HealthComponentArray } from "../../game/entity-components/server-components/HealthComponent";
import { playerInstance } from "../../game/player";

export let updateHealthBar: (newHealth: number) => void = () => {};

interface HealthBarProps {
   readonly isDead: boolean;
}

const HealthBar = (props: HealthBarProps) => {
   const healthBarRef = useRef<HTMLDivElement | null>(null);
   const [health, setHealth] = useState(!props.isDead ? TRIBE_INFO_RECORD[playerTribe.tribeType].maxHealthPlayer : 0);

   useEffect(() => {
      if (healthBarRef.current !== null) {
         const maxHealth = !props.isDead ? TRIBE_INFO_RECORD[playerTribe.tribeType].maxHealthPlayer : 0;

         healthBarRef.current.style.setProperty("--max-health", maxHealth.toString());
         healthBarRef.current.style.setProperty("--current-health", maxHealth.toString());
         healthBarRef.current.style.setProperty("--previous-health", maxHealth.toString());
      }
   }, []);
   
   useEffect(() => {
      updateHealthBar = (newHealth: number) => {
         if (healthBarRef.current !== null && newHealth !== health) {
            // Stop health from being negative
            const clampedNewHealth = Math.max(newHealth, 0);
            
            const previousHealth = health;
            setHealth(clampedNewHealth);
      
            const healthBar = healthBarRef.current!;
            healthBar.style.setProperty("--current-health", clampedNewHealth.toString());
            healthBar.style.setProperty("--previous-health", previousHealth.toString());
      
            healthBar.classList.remove("animated");
            // Trigger reflow
            void(healthBar.offsetHeight);
            healthBar.classList.add("animated");
         }
      }
   }, [health]);

   if (playerInstance === null || !HealthComponentArray.hasComponent(playerInstance)) {
      return null;
   }

   const displayHealth = Math.round((health + Number.EPSILON) * 100) / 100;

   return <div id="health-bar" className="animated" ref={healthBarRef}>
      <div className="health-icon">
         <img src={HealthIcon} alt="" />
         <div className="health-counter">{displayHealth}</div>
      </div>
      <div className="health-slider"></div>
      <div className="health-flash"></div>
      <div className="health-bar-notches"></div>
      <div className="health-mask"></div>
   </div>;
}

export default HealthBar;