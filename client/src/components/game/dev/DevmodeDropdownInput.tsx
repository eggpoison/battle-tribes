import { useRef } from "react";

interface DevmodeDropdownInputProps {
   readonly text: string;
   readonly options: ReadonlyArray<string>;
   onChange?(optionIdx: number): void;
}

const DevmodeDropdownInput = (props: DevmodeDropdownInputProps) => {
   const dropdownRef = useRef<HTMLSelectElement | null>(null);
   
   const onChange = (): void => {
      if (dropdownRef.current === null || typeof props.onChange === "undefined") {
         return;
      }

      const optionIdx = props.options.indexOf(dropdownRef.current.value);
      props.onChange(optionIdx);
   };
   
   return <div className="devmode-input">
      <span>{props.text}</span>
      <select ref={dropdownRef} onChange={onChange}>
         {props.options.map((option, i) => {
            return <option value={option} key={i}>{option}</option>
         })}
      </select>
   </div>;
}

export default DevmodeDropdownInput;