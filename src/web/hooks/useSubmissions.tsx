import { useEffect, useState } from 'react'
import { db } from '../storage/db'
import {
  submissionKey,
  type Submission,
  type SubmissionKey,
  type Verdict,
} from '../../domain/submission'

function useSubmissions() {
  const [subs, setSubs] = useState<Submission[]>([]);

  useEffect(() => {
    let cancelled = false; // cancelled 只防卸载不防覆盖

    db.submissions.toArray().then((rows) => {
      if (!cancelled) {
        setSubs(rows);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const importSubmissions = async (batch: Submission[]) => {
    const keysBySerializedKey = new Map<string, SubmissionKey>();
    for (const submission of batch) {
      const key = submissionKey(submission);
      keysBySerializedKey.set(JSON.stringify(key), key);
    }
    const keys = [...keysBySerializedKey.values()];
    const existingRows = await db.submissions.bulkGet(keys);
    const overwritten = existingRows.filter((row) => row !== undefined).length;

    await db.submissions.bulkPut(batch);
    const rows = await db.submissions.toArray();
    setSubs(rows);

    return { imported: keys.length - overwritten, overwritten };
  }

  const handleMarkVerdict = async (
    platform: string,
    targetID: number,
    verdict: Verdict,
  ) => {
    const updated = subs.map((submission) => {
      if (submission.platform !== platform || submission.id !== targetID) {
        return submission;
      }

      const updatedSubmission = {
        ...submission,
        verdict,
      };

      return updatedSubmission;
    });

    await db.submissions.bulkPut(updated);
    setSubs(updated);
  }

  const markAC = (platform: string, targetID: number) => {
    handleMarkVerdict(platform, targetID, "AC");
  };

  return { subs, importSubmissions, markAC };
}

export default useSubmissions;
