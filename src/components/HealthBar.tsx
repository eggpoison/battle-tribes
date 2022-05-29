import { useEffect, useRef, useState } from "react";
import Chief from "../entities/tribe-members/Chief";

let setHealthBarMaxHealth: (maxHealth: number) => void;
let setHealthBarHealth: (health: number) => void;

export abstract class HealthBarManager {
   public static setMaxHealth(maxHealth: number): void {
      setHealthBarMaxHealth(maxHealth);
   }

   public static setHealth(health: number): void {
      setHealthBarHealth(health);
   }
}

const HealthBar = () => {
   const healthBarRef = useRef<HTMLDivElement | null>(null);

   const [maxHealth, setMaxHealth] = useState(Chief.HEALTH);
   const [health, setHealth] = useState(Chief.HEALTH);

   useEffect(() => {
      setHealthBarMaxHealth = (maxHealth: number): void => {
         setMaxHealth(maxHealth);
      }
      setHealthBarHealth = (health: number): void => {
         setHealth(health);
      }
   }, []);

   useEffect(() => {
      if (healthBarRef.current !== null) {
         healthBarRef.current.style.setProperty("--max-health", maxHealth.toString());
      }
   }, [maxHealth]);

   useEffect(() => {
      if (healthBarRef.current !== null) {
         healthBarRef.current.style.setProperty("--health", health.toString());
      }
   }, [health]);

   return (
      <div id="health-bar" ref={healthBarRef}>
         <div className="health"></div>
      </div>
   );
}

export default HealthBar;