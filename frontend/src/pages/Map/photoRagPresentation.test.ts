import { describe, expect, it } from "vitest";
import type { RagPhotoSearchResponse } from "../../types";
import { getPhotoRagModeLabel } from "./photoRagPresentation";

const result = (
  mode: RagPhotoSearchResponse["mode"],
  warning: string | null = null,
): RagPhotoSearchResponse => ({
  answer: null,
  mode,
  citationPhotoIds: [],
  evidence: [],
  indexCoverage: { ready: 0, total: 0 },
  warning,
  requestId: "test",
});

describe("getPhotoRagModeLabel", () => {
  it("distinguishes the four public result states", () => {
    expect(getPhotoRagModeLabel(result("rag"))).toBe("AI 回答");
    expect(getPhotoRagModeLabel(result("semantic"))).toBe("语义找图");
    expect(getPhotoRagModeLabel(result("keyword"))).toBe("关键词结果");
    expect(
      getPhotoRagModeLabel(result("semantic", "照片相关度不足，未调用回答模型")),
    ).toBe("证据不足");
  });
});
