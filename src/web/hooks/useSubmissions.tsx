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

  const handleAddSubmission = async (sub: Submission) => {
    await db.submissions.put(sub);
    setSubs((prevSubs) => [...prevSubs, sub]);
  }

  const addSubmission = () => {
    handleAddSubmission({
      id: subs.length + 1,
      score: 0,
      submitTime: new Date(),
      contest: null,
      problem: "CCCC",
      verdict: "TLE"
    });
  };

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

  return { subs, addSubmission, markAC };
}

export default useSubmissions;
