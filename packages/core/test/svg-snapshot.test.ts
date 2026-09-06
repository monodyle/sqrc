import { describe, expect, test } from "vitest";
import { QRCode } from "../src";

describe("QRCode.toSvg snapshot", () => {
  test("solid foreground/background", async () => {
    const svg = await new QRCode("sqrc", { errorCorrectionLevel: "L" }).toSvg(64, {
      shape: "square",
      eyePatternShape: "square",
      foreground: "#1a1a2e",
      background: "#f4f4f4",
    });
    expect(svg).toContain('fill="#1a1a2e"');
    expect(svg).toContain('fill="#f4f4f4"');
    expect(svg).toMatchSnapshot();
  });

  test("linear gradient foreground", async () => {
    const svg = await new QRCode("sqrc", { errorCorrectionLevel: "L" }).toSvg(64, {
      shape: "square",
      eyePatternShape: "square",
      foreground: {
        from: "#000",
        to: "#333",
        type: "linear",
        rotation: Math.PI / 4,
      },
    });
    expect(svg).toMatchSnapshot();
  });

  test("radial gradient foreground", async () => {
    const svg = await new QRCode("sqrc", { errorCorrectionLevel: "L" }).toSvg(64, {
      shape: "square",
      eyePatternShape: "square",
      foreground: { from: "#000", to: "#333", type: "radial" },
    });
    expect(svg).toMatchSnapshot();
  });

  test("eyeColor override", async () => {
    const svg = await new QRCode("sqrc", { errorCorrectionLevel: "L" }).toSvg(64, {
      shape: "square",
      eyePatternShape: "square",
      eyeColor: ["#f00", "#0f0", "#00f"],
    });
    expect(svg).toMatchSnapshot();
  });
});
