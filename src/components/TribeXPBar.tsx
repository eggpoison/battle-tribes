import { useEffect, useRef, useState } from "react";
import { TRIBE_XP_REQUIREMENTS } from "../Tribe";

export let setTribeEXPBarAmount: (xp: number) => void;

const TribeXPBar = () => {
   const [exp, setEXP] = useState(0);
   const expPoolRef = useRef<HTMLDivElement | null>(null);

   // Calculate the EXP requirements
   let previousEXPRequirement!: number;
   let currentEXPRequirement!: number;
   for (let idx = 0; idx < TRIBE_XP_REQUIREMENTS.length; idx++) {
      const currentRequirement = TRIBE_XP_REQUIREMENTS[idx];

      if (exp < currentRequirement) {
         previousEXPRequirement = TRIBE_XP_REQUIREMENTS[idx - 1];
         currentEXPRequirement = currentRequirement;
         break;
      }
   }
   // If the first EXP requirement hasn't been reached
   if (typeof previousEXPRequirement === "undefined") previousEXPRequirement = 0;

   useEffect(() => {
      setTribeEXPBarAmount = (xp: number): void => {
         setEXP(xp);
      }
   }, []);

   useEffect(() => {
      if (expPoolRef.current !== null) {
         expPoolRef.current.style.setProperty("--xp", (exp - previousEXPRequirement).toString());
         expPoolRef.current.style.setProperty("--next-xp", (currentEXPRequirement - previousEXPRequirement).toString());
      }
   }, [exp, previousEXPRequirement, currentEXPRequirement]);

   return (
      <div id="xp-bar">
         <div className="amount-label">Experience: {exp}/{currentEXPRequirement}</div>
         <div className="xp-pool" ref={expPoolRef}></div>
      </div>
   );
}

export default TribeXPBar;