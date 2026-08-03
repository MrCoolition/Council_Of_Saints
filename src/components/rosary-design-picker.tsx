"use client";

import { Check, Gem } from "lucide-react";
import type { CSSProperties } from "react";
import {
  getRosaryDesign,
  ROSARY_DESIGNS,
  type RosaryDesign,
  type RosaryDesignId,
} from "@/lib/rosary-designs";

type RosaryDesignPickerProps = {
  compact?: boolean;
  onSelect: (designId: RosaryDesignId) => void;
  selectedDesignId: RosaryDesignId;
};

export function RosaryDesignPicker({
  compact = false,
  onSelect,
  selectedDesignId,
}: RosaryDesignPickerProps) {
  const selectedDesign = getRosaryDesign(selectedDesignId);

  return (
    <section
      aria-label="Rosary treasury"
      className={[
        "rosary-design-treasury",
        compact ? "rosary-design-treasury-compact" : "",
      ].join(" ")}
    >
      <div className="rosary-design-treasury-heading">
        <span className="rosary-settings-heading">
          {compact ? "Rosary" : "Rosary treasury"}
        </span>
        {!compact ? (
          <span className="rosary-design-current">
            <Gem aria-hidden className="size-3.5" />
            {selectedDesign.name}
          </span>
        ) : null}
      </div>

      <div
        aria-label="Choose a rosary design"
        className="rosary-design-rail"
        role="group"
      >
        {ROSARY_DESIGNS.map((design) => (
          <RosaryDesignChoice
            compact={compact}
            design={design}
            key={design.id}
            onSelect={onSelect}
            selected={design.id === selectedDesignId}
          />
        ))}
      </div>
    </section>
  );
}

function RosaryDesignChoice({
  compact,
  design,
  onSelect,
  selected,
}: {
  compact: boolean;
  design: RosaryDesign;
  onSelect: (designId: RosaryDesignId) => void;
  selected: boolean;
}) {
  return (
    <button
      aria-pressed={selected}
      className={[
        "rosary-design-choice",
        selected ? "rosary-design-choice-active" : "",
      ].join(" ")}
      data-bead-shape={design.beadShape}
      data-pater-shape={design.ourFatherShape}
      data-texture={design.texture}
      onClick={() => onSelect(design.id)}
      style={getPreviewStyle(design)}
      type="button"
    >
      <RosaryDesignPreview design={design} />
      <span className="rosary-design-copy">
        <span className="rosary-design-name">{design.name}</span>
        <span className="rosary-design-materials">
          {compact ? design.finish : design.materials}
        </span>
        {!compact ? (
          <span className="rosary-design-dedication">{design.dedication}</span>
        ) : null}
      </span>
      {selected ? (
        <span aria-hidden className="rosary-design-check">
          <Check className="size-3.5" />
        </span>
      ) : null}
    </button>
  );
}

function RosaryDesignPreview({ design }: { design: RosaryDesign }) {
  return (
    <span aria-hidden className="rosary-design-preview">
      <span className="rosary-design-preview-chain" />
      {[0, 1, 2, 3, 4].map((index) => (
        <span
          className={[
            "rosary-design-preview-bead",
            index === 2 ? "rosary-design-preview-pater" : "",
          ].join(" ")}
          key={index}
        />
      ))}
      <span className="rosary-design-preview-medal">{design.centerMark}</span>
    </span>
  );
}

function getPreviewStyle(design: RosaryDesign) {
  return {
    "--preview-aura": design.palette.aura,
    "--preview-bead-highlight": design.palette.beadHighlight,
    "--preview-bead-mid": design.palette.beadMid,
    "--preview-bead-shadow": design.palette.beadShadow,
    "--preview-chain-high": design.palette.chainHigh,
    "--preview-chain-low": design.palette.chainLow,
    "--preview-center": design.palette.centerFill,
    "--preview-center-text": design.palette.centerText,
    "--preview-pater-highlight": design.palette.paterHighlight,
    "--preview-pater-mid": design.palette.paterMid,
    "--preview-pater-shadow": design.palette.paterShadow,
  } as CSSProperties;
}
