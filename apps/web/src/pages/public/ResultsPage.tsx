import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import type { ContestDto, ResultEntryDto, ResultsDto } from '@foka-vote/shared';
import { fetchContest } from '../../services/contests';
import { fetchResults } from '../../services/results';

function formatBreakdown(entry: ResultEntryDto): string {
  const parts: string[] = [];
  if (entry.votes3 > 0) {
    parts.push(`${entry.votes3}× 3 pkt`);
  }
  if (entry.votes2 > 0) {
    parts.push(`${entry.votes2}× 2 pkt`);
  }
  if (entry.votes1 > 0) {
    parts.push(`${entry.votes1}× 1 pkt`);
  }
  return parts.join(', ');
}

const ResultsPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [contest, setContest] = useState<ContestDto | null>(null);
  const [results, setResults] = useState<ResultsDto | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!slug) {
      return;
    }
    let cancelled = false;

    fetchContest(slug)
      .then((contestData) => {
        if (cancelled) {
          return;
        }
        setContest(contestData);
        if (contestData.status !== 'CLOSED') {
          return undefined;
        }
        return fetchResults(slug).then((resultsData) => {
          if (!cancelled) {
            setResults(resultsData);
          }
        });
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (error) {
    return <p role="alert">Failed to load results</p>;
  }

  if (!contest) {
    return <p>Loading…</p>;
  }

  if (contest.status !== 'CLOSED') {
    return (
      <div>
        <h1>Results — {contest.title}</h1>
        <p>
          Results will be available once voting closes, on{' '}
          {new Date(contest.votingEnd).toLocaleString()}.
        </p>
      </div>
    );
  }

  if (!results) {
    return <p>Loading…</p>;
  }

  return (
    <div>
      <h1>Results — {contest.title}</h1>
      <p>{results.voteCardCount} vote cards cast</p>

      <table>
        <thead>
          <tr>
            <th>Place</th>
            <th>Author</th>
            <th>Points</th>
            <th>Breakdown</th>
          </tr>
        </thead>
        <tbody>
          {results.results.map((entry) => (
            <tr key={entry.submissionId}>
              <td>{entry.place}</td>
              <td>
                {entry.firstName} {entry.lastName} ({entry.alias})
              </td>
              <td>{entry.total} pkt</td>
              <td>{formatBreakdown(entry)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ResultsPage;
