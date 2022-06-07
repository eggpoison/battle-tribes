import React from "react";

interface InventoryWrapperProps {
   readonly id?: string;
   readonly children: JSX.Element | Array<JSX.Element>;
}

const InventoryWrapper = React.forwardRef<HTMLDivElement, InventoryWrapperProps>(({ id, children }, ref) => {
   return (
      <div ref={ref} id={id} className="inventory-wrapper">
         {children}
      </div>
   );
})

export default InventoryWrapper;