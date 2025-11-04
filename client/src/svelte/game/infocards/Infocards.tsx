import { TribesmanTitle } from "battletribes-shared/titles";
import { useState, useEffect } from "react";
import TribesmanTitleInfocard from "./TribesmanTitleInfocard";

export let Infocards_setTitleOffer: (titleOffer: TribesmanTitle | null) => void = () => {};

const Infocards = () => {
   const [titleOffer, setTitleOffer] = useState<TribesmanTitle | null>(null);

   useEffect(() => {
      Infocards_setTitleOffer = (titleOffer: TribesmanTitle | null): void => {
         setTitleOffer(titleOffer);
      }
   }, [])
   
   return <div id="infocards">
      {titleOffer !== null ? (
         <TribesmanTitleInfocard titleOffer={titleOffer} />
      ) : undefined}
   </div>;
}

export default Infocards;