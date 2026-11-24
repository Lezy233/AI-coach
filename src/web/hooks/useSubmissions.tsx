import { useEffect, useState } from 'react'
import { db } from '../storage/db'
import type { Submission, Verdict } from '../../domain/submission'

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
    await db.submissions.bulkPut(batch);
    const rows = await db.submissions.toArray();
    setSubs(rows);
  }

  const handleMarkVerdict = async (targetID: number, verdict: Verdict) => {
    const updated = subs.map((submission) => {
      if (submission.id !== targetID) {
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

  const markAC = (targetID: number) => {
    handleMarkVerdict(targetID, "AC");
  };

  return { subs, importSubmissions, markAC };
}

export default useSubmissions;
