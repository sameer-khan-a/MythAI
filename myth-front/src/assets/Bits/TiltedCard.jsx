// src/assets/Bits/TiltedCard.jsx
import React, { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";
import "./TiltedCard.css";

/**
 * Responsive TiltedCard
 *
 * - Default sizing is fluid (width: 100% of parent) with sensible max-heights across breakpoints.
 * - On touch devices / small screens the tilt effect is disabled (static image).
 * - Tooltip/caption is repositioned below the image on small screens for readability.
 * - Exposes overlayContent via displayOverlayContent prop (keeps same API).
 */

const springValues = {
  damping: 30,
  stiffness: 100,
  mass: 2,
};

export default function TiltedCard({
  imageSrc,
  altText = "Tilted card image",
  captionText = "",
  // keep these props but use responsive defaults (containerWidth default -> 100%)
  containerHeight = "auto", // can be '480px' if you want fixed desktop height; 'auto' preferred for responsiveness
  containerWidth = "100%",
  imageHeight = "auto",
  imageWidth = "100%",
  scaleOnHover = 1.06,
  rotateAmplitude = 12,
  showMobileWarning = true,
  showTooltip = true,
  overlayContent = null,
  displayOverlayContent = false,
  className = ""
}) {
  const ref = useRef(null);

  // motion values (only used on non-touch devices)
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useMotionValue(0), springValues);
  const rotateY = useSpring(useMotionValue(0), springValues);
  const scale = useSpring(1, springValues);
  const opacity = useSpring(0);
  const rotateFigcaption = useSpring(0, {
    stiffness: 350,
    damping: 30,
    mass: 1,
  });

  const [lastY, setLastY] = useState(0);
  const [isTouch, setIsTouch] = useState(false);
  const [smallScreen, setSmallScreen] = useState(false);

  useEffect(() => {
    const touchDetected = (typeof window !== "undefined") &&
      ("ontouchstart" in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0));
    setIsTouch(Boolean(touchDetected));

    const mq = window.matchMedia("(max-width: 576px)");
    const onMq = (ev) => setSmallScreen(ev.matches);
    setSmallScreen(mq.matches);
    mq.addEventListener?.("change", onMq);
    return () => mq.removeEventListener?.("change", onMq);
  }, []);

  // Handlers do nothing on touch / small screens (avoid janky behavior)
  function handleMouse(e) {
    if (!ref.current || isTouch || smallScreen) return;

    const rect = ref.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left - rect.width / 2;
    const offsetY = e.clientY - rect.top - rect.height / 2;

    const rotationX = (offsetY / (rect.height / 2)) * -rotateAmplitude;
    const rotationY = (offsetX / (rect.width / 2)) * rotateAmplitude;

    rotateX.set(rotationX);
    rotateY.set(rotationY);

    x.set(e.clientX - rect.left);
    y.set(e.clientY - rect.top);

    const velocityY = offsetY - lastY;
    rotateFigcaption.set(-velocityY * 0.6);
    setLastY(offsetY);
  }

  function handleMouseEnter() {
    if (isTouch || smallScreen) return;
    scale.set(scaleOnHover);
    opacity.set(1);
  }

  function handleMouseLeave() {
    if (isTouch || smallScreen) return;
    opacity.set(0);
    scale.set(1);
    rotateX.set(0);
    rotateY.set(0);
    rotateFigcaption.set(0);
  }

  // fallback: if image missing, let browser handle alt + broken-icon
  const innerStyle = {
    width: imageWidth,
    height: imageHeight,
    transformStyle: "preserve-3d",
    willChange: "transform",
  };

  return (
    <figure
      ref={ref}
      className={`tilted-card-figure ${className}`}
      style={{
        width: containerWidth,
        height: containerHeight === "auto" ? "auto" : containerHeight,
        position: "relative",
        overflow: "visible",
      }}
      onMouseMove={handleMouse}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      tabIndex={-1}
      aria-label={altText}
    >
      {/* Responsive inline styles to avoid forcing the external CSS file */}
      <style>{`
        /* Scoped small responsive tweaks */
        .tilted-card-figure { display:block; margin:0; }
        .tilted-card-inner { margin: 0 auto; display:block; border-radius: 10px; overflow: hidden; backface-visibility: hidden; }
        .tilted-card-img { display:block; width:100%; height:100%; object-fit: cover; pointer-events: none; user-select: none; }
        .tilted-card-caption { position: absolute; left: 12px; top: 12px; background: rgba(0,0,0,0.55); color: #fff; padding: 6px 10px; border-radius: 8px; font-size: 0.95rem; pointer-events: none; transform-origin: center; white-space: nowrap; z-index: 40; }
        .tilted-card-snapshot { position: absolute; left: 50%; transform: translateX(-50%); bottom: -1.25rem; z-index: 35; width: calc(100% - 2rem); max-width: 720px; }
        .tilted-card-snapshot-inner { background: #fff; border-radius: 10px; padding: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.12); }
        .tilted-card-mobile-alert { display: none; position: absolute; left: 8px; top: 8px; background: rgba(255,255,255,0.95); color: #111; padding: 6px 8px; border-radius: 8px; font-size: 12px; z-index: 50; box-shadow: 0 4px 14px rgba(0,0,0,0.06); }
        @media (max-width: 576px) {
          .tilted-card-caption { position: static; margin-top: 0.5rem; background: transparent; color: #111; padding: 0; white-space: normal; position: relative; z-index: 0; text-shadow: none; }
          .tilted-card-snapshot { position: relative; transform: none; bottom: 0; width: 100%; margin-top: 12px; }
          .tilted-card-mobile-alert { display: ${showMobileWarning ? "block" : "none"}; }
        }
      `}</style>

      {/* small-screen warning only shown if prop true and device is touch or small */}
      {(showMobileWarning && (isTouch || smallScreen)) && (
        <div className="tilted-card-mobile-alert" role="note">
          Best viewed on desktop — tilt effect disabled
        </div>
      )}

      {/* If touch/small: render static image without motion transforms to avoid jank */}
      {isTouch || smallScreen ? (
        <div className="tilted-card-inner" style={{ ...innerStyle }}>
          <img
            className="tilted-card-img"
            src={imageSrc}
            alt={altText}
            draggable={false}
            style={{ width: "100%", height: imageHeight === "auto" ? "auto" : imageHeight }}
          />
        </div>
      ) : (
        // Non-touch: render motion-enabled tilt
        <motion.div
          className="tilted-card-inner"
          style={{
            ...innerStyle,
            rotateX,
            rotateY,
            scale,
          }}
        >
          <motion.img
            src={imageSrc}
            alt={altText}
            className="tilted-card-img"
            style={{
              width: "100%",
              height: imageHeight === "auto" ? "100%" : imageHeight,
            }}
            draggable={false}
          />
        </motion.div>
      )}

      {/* Snapshot overlay (optional) */}
      {displayOverlayContent && overlayContent && (
        <motion.div
          className="tilted-card-snapshot"
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ stiffness: 120, damping: 20 }}
          aria-hidden={false}
        >
          <div className="tilted-card-snapshot-inner">{overlayContent}</div>
        </motion.div>
      )}

      {/* Tooltip/caption */}
      {showTooltip && captionText && (
        <motion.figcaption
          className="tilted-card-caption"
          style={{
            x,
            y,
            opacity,
            rotate: rotateFigcaption,
          }}
        >
          {captionText}
        </motion.figcaption>
      )}
    </figure>
  );
}
