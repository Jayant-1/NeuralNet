import { Hexagon } from "lucide-react";
import React from "react";

const BrandLogo = ({
  textSize = "text-lg",
  iconSize = 32,
  dotSize = "w-2 h-2",
  withHoverSpin = false,
  className = "",
  onClick,
}) => {
  const groupClass = withHoverSpin ? "group" : "";

  return (
    <div
      className={`flex items-center gap-2 origin-left scale-[1.06] ${onClick ? "cursor-pointer transition-transform duration-200 hover:scale-110" : ""} ${groupClass} ${className}`}
      onClick={onClick}
    >
      <div className="relative">
        <Hexagon
          size={iconSize}
          className={`text-cyan ${withHoverSpin ? "transition-all duration-300 group-hover:rotate-90" : ""}`}
          strokeWidth={1.5}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`${dotSize} rounded-full bg-cyan`} />
        </div>
      </div>
      <span
        className={`font-heading font-bold tracking-tight text-white text-[1.35em] ${textSize}`}
      >
        Neural<span className="text-cyan">Net</span>
      </span>
    </div>
  );
};

export default BrandLogo;
