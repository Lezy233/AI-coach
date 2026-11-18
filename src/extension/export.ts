import type { Submission } from "../toSubmission";

export function serializeSubmissions(
  uid: number,
  submissions: Submission[],
  exportedAt: Date = new Date(),
): string {
  return JSON.stringify(
    {
      source: "luogu",
      uid,
      exportedAt,
      submissions,
    },
    null,
    2,
  );
}

export function createExportFilename(
  uid: number,
  exportedAt: Date = new Date(),
): string {
  const timestamp = exportedAt.toISOString().replace(/[:.]/g, "-");
  return `luogu-${uid}-${timestamp}.json`;
}

export function downloadSubmissions(
  uid: number,
  submissions: Submission[],
): void {
  const exportedAt = new Date();
  const blob = new Blob([serializeSubmissions(uid, submissions, exportedAt)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = createExportFilename(uid, exportedAt);
  anchor.click();
  URL.revokeObjectURL(url);
}
