import { TechID, getTechByID } from "webgl-test-shared/dist/techs";
import { useEffect, useState } from "react";
import Game from "../../Game";

export let TechInfocard_setSelectedTech: (techID: TechID | null) => void = () => {};

const TechInfocard = () => {
   const [selectedTech, setSelectedTech] = useState<TechID | null>(null);
   const [studyProgress, setStudyProgress] = useState(0);
   // @Incomplete doesn't refresh on study progress increase

   useEffect(() => {
      TechInfocard_setSelectedTech = (techID: TechID | null): void => {
         setSelectedTech(techID);

         if (techID !== null) {
            setStudyProgress(Game.tribe.techTreeUnlockProgress[techID]?.studyProgress || 0);
         }
      }
   }, []);

   if (selectedTech === null) {
      return null;
   }

   const techInfo = getTechByID(selectedTech);

   return <div id="tech-infocard" className="infocard">
      <img src={require("../../images/tech-tree/" + techInfo.iconSrc)} alt="" />
      {studyProgress < techInfo.researchStudyRequirements ? <>
         <h2>{techInfo.name}</h2>
         <p>{studyProgress}/{techInfo.researchStudyRequirements}</p>
      </> : <>
         <h2>Research Complete!</h2>
         <p>{techInfo.name}</p>
      </>}
   </div>;
}

export default TechInfocard;