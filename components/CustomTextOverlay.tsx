export type TextPosition = 
  | "top-left" | "top-center" | "top-right" 
  | "center" 
  | "bottom-left" | "bottom-center" | "bottom-right";

type CustomTextOverlayProps = {
  isVisible: boolean;
  text: string;
  position: TextPosition;
  fontSize: number;
};

export function CustomTextOverlay({ isVisible, text, position, fontSize }: CustomTextOverlayProps) {
  if (!text) return null;

  return (
    <div 
      className={`customTextOverlay ${isVisible ? "show" : ""} pos-${position}`} 
      aria-hidden={!isVisible}
    >
      <pre 
        className="customText" 
        style={{ fontSize: `${fontSize}px` }}
      >
        {text}
      </pre>
    </div>
  );
}
