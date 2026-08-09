import type { RagPhotoSearchResponse } from "../../types";

export const getPhotoRagModeLabel = (
  result: RagPhotoSearchResponse | null,
): string => {
  if (!result) return "关键词结果";
  if (
    result.mode === "semantic" &&
    Boolean(result.warning?.includes("不足"))
  ) {
    return "证据不足";
  }
  if (result.mode === "rag") return "AI 回答";
  if (result.mode === "semantic") return "语义找图";
  return "关键词结果";
};
