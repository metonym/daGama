import { cx } from "@/utils/cx";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "blue" | "green" | "yellow" | "red" | "gray";
  size?: "sm" | "xs";
  className?: string;
}

const getVariantClasses = (variant: BadgeProps["variant"]) => {
  switch (variant) {
    case "blue":
      return "bg-blue-100 text-blue-800";
    case "green":
      return "bg-emerald-100 text-emerald-800";
    case "yellow":
      return "bg-yellow-100 text-yellow-800";
    case "red":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getSizeClasses = (size: BadgeProps["size"]) => {
  switch (size) {
    case "xs":
      return "px-1 py-0.5 text-xs";
    default:
      return "px-2 py-1 text-xs";
  }
};

export const Badge = ({
  children,
  variant = "gray",
  size = "sm",
  className = "",
}: BadgeProps) => {
  return (
    <span
      className={cx(
        "inline-block font-medium break-all",
        getVariantClasses(variant),
        getSizeClasses(size),
        className,
      )}
    >
      {children}
    </span>
  );
};
