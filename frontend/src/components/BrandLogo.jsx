import { Hexagon } from "lucide-react";
import React from "react";

const BrandLogo = ({
  textSize = "text-lg",
  withHoverSpin = false,
  className = "",
  onClick,
}) => {
  const groupClass = withHoverSpin ? "group" : "";

  return (
    <div
      className={`flex items-center gap-[0.5em] origin-left ${textSize} ${groupClass} ${className} cursor-pointer transition-all duration-300 hover:opacity-90`}
      onClick={onClick}
    >
      <div className="relative">
        <Hexagon
          size="1.8em"
          className={`text-cyan ${withHoverSpin ? "transition-transform duration-500 ease-in-out group-hover:rotate-180" : ""}`}
          strokeWidth={1.5}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-[0.35em] h-[0.35em] rounded-full bg-cyan shadow-[0_0_8px_rgba(0,242,255,0.8)]" />
        </div>
      </div>
      
      <span
        className="font-heading font-bold tracking-tight text-white text-[1.5em]"
      >
        Neural<span className="text-cyan">Net</span>
      </span>
    </div>
  );
};

export default BrandLogo;
