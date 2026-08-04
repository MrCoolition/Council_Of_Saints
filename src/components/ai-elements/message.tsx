"use client";

import { memo, type ComponentProps } from "react";
import { Streamdown } from "streamdown";

export type MessageResponseProps = ComponentProps<typeof Streamdown>;

export const MessageResponse = memo(
  ({ className = "", ...props }: MessageResponseProps) => (
    <Streamdown
      className={`father-markdown ${className}`.trim()}
      {...props}
    />
  ),
  (previous, next) =>
    previous.children === next.children &&
    previous.isAnimating === next.isAnimating,
);

MessageResponse.displayName = "MessageResponse";
