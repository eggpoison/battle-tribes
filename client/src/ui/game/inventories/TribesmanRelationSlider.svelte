interface RelationSliderProps {
   readonly relation: number;
}

const RelationSlider = (props: RelationSliderProps) => {
   const sliderProgress = (props.relation + 100) / 200;

   let markerColour = "#eee";
   if (props.relation <= -30) {
      markerColour = "#e68383";
   } else if (props.relation >= 50) {
      markerColour = "#83e69d";
   }
   
   return <div className="relation-slider-container">
      <div className="enemy-region"></div>
      <div className="friendly-region"></div>
      <div className="slider-marker" style={{"left": (sliderProgress * 100) + "%", "backgroundColor": markerColour}}></div>
      <div className="inner-shadow"></div>
   </div>;
}