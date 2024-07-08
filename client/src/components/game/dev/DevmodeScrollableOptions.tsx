import { useState } from "react";

interface OptionProps {
   readonly text: string;
   readonly isSelected: boolean;
   onClick(): void;
}

interface DevmodeScrollableOptionsProps {
   readonly options: ReadonlyArray<string>;
   onOptionSelect(optionIdx: number): void;
}

const Option = (props: OptionProps) => {
   let className = "option";
   if (props.isSelected) {
      className += " selected";
   }
   
   return <li className={className} onClick={props.onClick}>
      {props.text}
      {props.isSelected ? (
         <div className="selection-marker"></div>
      ) : null}
   </li>;
}

const DevmodeScrollableOptions = (props: DevmodeScrollableOptionsProps) => {
   const [selectedOptionIdx, setSelectedOptionIdx] = useState(0);
   
   const elems = new Array<JSX.Element>();
   for (let i = 0; i < props.options.length; i++) {
      if (i > 0) {
         const isBright = i === selectedOptionIdx || i === selectedOptionIdx + 1;
         elems.push(
            <div key={elems.length} className={`separator${isBright ? " bright" : ""}`}></div>
         );
      }

      const text = props.options[i];
      elems.push(
         <Option key={elems.length} text={text} isSelected={i === selectedOptionIdx} onClick={() => { setSelectedOptionIdx(i); props.onOptionSelect(i) }} />
      );
   }

   return <div className="devmode-scrollable-options devmode-menu-section flex-container">
      <ul>
         {elems}
      </ul>
   </div>;
}

export default DevmodeScrollableOptions;