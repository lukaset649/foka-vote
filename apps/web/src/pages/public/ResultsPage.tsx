import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import type { ContestDto, ResultEntryDto, ResultsDto } from '@foka-vote/shared';
import { fetchContest } from '../../services/contests';
import { fetchResults } from '../../services/results';
import { cn } from '../../lib/cn';
import PageHeader from '../../components/ui/PageHeader';
import Alert from '../../components/ui/Alert';
import Spinner from '../../components/ui/Spinner';
import Table, {
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '../../components/ui/Table';

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
    return <Alert variant="error">Failed to load results</Alert>;
  }

  if (!contest) {
    return <Spinner />;
  }

  if (contest.status !== 'CLOSED') {
    return (
      <div>
        <PageHeader
          title={`Results — ${contest.title}`}
          backTo={`/contest/${slug}`}
          backLabel="Back to the contest"
        />
        <Alert variant="info">
          Results will be available once voting closes, on{' '}
          {new Date(contest.votingEnd).toLocaleString()}.
        </Alert>
      </div>
    );
  }

  if (!results) {
    return <Spinner />;
  }

  return (
    <div>
      <PageHeader
        title={`Results — ${contest.title}`}
        backTo={`/contest/${slug}`}
        backLabel="Back to the contest"
      >
        <span className="inline-flex items-center gap-2 text-sm text-zinc-500">
          <i className="bi bi-trophy text-amber-500" aria-hidden="true" />
          {results.voteCardCount} vote cards cast
        </span>
      </PageHeader>

      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Place</TableHeaderCell>
            <TableHeaderCell>Author</TableHeaderCell>
            <TableHeaderCell>Points</TableHeaderCell>
            <TableHeaderCell>Breakdown</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {results.results.map((entry) => (
            <TableRow key={entry.submissionId} className={cn(entry.place === 1 && 'bg-amber-50')}>
              <TableCell className="font-semibold text-zinc-900">
                {entry.place === 1 ? (
                  <span className="inline-flex items-center gap-1">
                    <i className="bi bi-trophy text-amber-500" aria-hidden="true" />
                    {entry.place}
                  </span>
                ) : (
                  entry.place
                )}
              </TableCell>
              <TableCell>
                {entry.firstName} {entry.lastName} ({entry.alias})
              </TableCell>
              <TableCell className="font-semibold text-indigo-600">{entry.total} pkt</TableCell>
              <TableCell className="text-zinc-500">{formatBreakdown(entry)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ResultsPage;
