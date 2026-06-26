import type { ImageRef, VisualVariant } from "@/data/luxeRoads";

const gradients: Record<VisualVariant, string> = {
  hero:
    "linear-gradient(115deg, rgba(246,242,234,.92), rgba(207,225,220,.24) 32%, rgba(47,80,102,.18) 54%, rgba(16,43,53,.12)), linear-gradient(145deg, #f3e7d6 0%, #d9e9e6 28%, #6f8f94 52%, #b99058 68%, #203d4a 100%)",
  coast:
    "linear-gradient(145deg, rgba(255,253,247,.26), rgba(47,80,102,.18)), linear-gradient(135deg, #2f5066 0%, #7eb0b5 28%, #f4e7d5 45%, #9db18d 64%, #d1b079 100%)",
  forest:
    "linear-gradient(145deg, rgba(255,253,247,.2), rgba(16,43,53,.18)), linear-gradient(135deg, #20372c 0%, #58745d 34%, #a7b59b 52%, #e6d6be 100%)",
  couple:
    "linear-gradient(145deg, rgba(255,253,247,.28), rgba(47,80,102,.18)), linear-gradient(135deg, #cba96b 0%, #f3dfc4 32%, #7e9fa6 58%, #243f4a 100%)",
  family:
    "linear-gradient(145deg, rgba(255,253,247,.24), rgba(16,43,53,.18)), linear-gradient(135deg, #e6d6be 0%, #cfe1dc 30%, #9fb999 60%, #2f5066 100%)",
  dog:
    "linear-gradient(145deg, rgba(255,253,247,.34), rgba(47,80,102,.16)), linear-gradient(135deg, #f0d9b7 0%, #c8a15a 32%, #a7b59b 58%, #2f5066 100%)",
  offGrid:
    "linear-gradient(145deg, rgba(255,253,247,.18), rgba(16,43,53,.24)), linear-gradient(135deg, #102b35 0%, #2f5066 28%, #57735f 60%, #c8a15a 100%)",
  vineyard:
    "linear-gradient(145deg, rgba(255,253,247,.2), rgba(16,43,53,.16)), linear-gradient(135deg, #6d805a 0%, #a7b59b 34%, #e6d6be 56%, #2f5066 100%)",
  cliff:
    "linear-gradient(145deg, rgba(255,253,247,.22), rgba(16,43,53,.2)), linear-gradient(135deg, #263d45 0%, #7da8ad 28%, #e6d6be 46%, #9b7650 70%, #102b35 100%)",
  vanSilver:
    "linear-gradient(145deg, rgba(255,253,247,.32), rgba(16,43,53,.14)), linear-gradient(135deg, #d9d5ca 0%, #f6f2ea 33%, #9daaa1 52%, #2f5066 100%)",
  vanSage:
    "linear-gradient(145deg, rgba(255,253,247,.3), rgba(16,43,53,.16)), linear-gradient(135deg, #a7b59b 0%, #d8deca 36%, #c8a15a 58%, #2f5066 100%)",
  vanSand:
    "linear-gradient(145deg, rgba(255,253,247,.34), rgba(16,43,53,.14)), linear-gradient(135deg, #e6d6be 0%, #b8b598 38%, #7e8f79 60%, #102b35 100%)",
  farm:
    "linear-gradient(145deg, rgba(255,253,247,.26), rgba(16,43,53,.14)), linear-gradient(135deg, #d7bd82 0%, #a7b59b 36%, #687b58 62%, #e6d6be 100%)",
  retreat:
    "linear-gradient(145deg, rgba(255,253,247,.26), rgba(16,43,53,.18)), linear-gradient(135deg, #cfe1dc 0%, #8fa79a 34%, #e6d6be 56%, #2f5066 100%)"
};

type ScenicImageProps = {
  image: ImageRef;
  className?: string;
  overlay?: "light" | "dark" | "none";
  children?: React.ReactNode;
};

export function ScenicImage({ image, className = "", overlay = "none", children }: ScenicImageProps) {
  const overlayLayer =
    overlay === "dark"
      ? "linear-gradient(180deg, rgba(16,43,53,.12), rgba(16,43,53,.62))"
      : overlay === "light"
        ? "linear-gradient(180deg, rgba(255,253,247,.1), rgba(255,253,247,.52))"
        : "linear-gradient(180deg, transparent, transparent)";

  return (
    <div
      className={`scenic-frame ${className}`}
      data-variant={image.variant}
      role="img"
      aria-label={image.alt}
      style={{
        backgroundImage: `${overlayLayer}, url("${image.src}"), ${gradients[image.variant]}`
      }}
    >
      {children}
    </div>
  );
}
