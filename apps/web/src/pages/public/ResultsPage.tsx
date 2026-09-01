import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import type { ContestDto, ResultEntryDto, ResultsDto } from '@foka-vote/shared';
import { isUnauthorizedError } from '../../services/apiClient';
import { contestGatePath, fetchContest } from '../../services/contests';
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
  const navigate = useNavigate();
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
        if (contestData.status !== 'CLOSED' && contestData.status !== 'VOTING') {
          return undefined;
        }
        return fetchResults(slug).then((resultsData) => {
          if (!cancelled) {
            setResults(resultsData);
          }
        });
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        if (isUnauthorizedError(err)) {
          void navigate(contestGatePath(slug, `/contest/${slug}/results`), { replace: true });
          return;
        }
        setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [slug, navigate]);

  if (error) {
    return <Alert variant="error">Failed to load results</Alert>;
  }

  if (!contest) {
    return <Spinner />;
  }

  if (contest.status !== 'CLOSED' && contest.status !== 'VOTING') {
    return (
      <div>
        <PageHeader
          title={`Results — ${contest.title}`}
          backTo={`/contest/${slug}`}
          backLabel="Back to the contest"
        />
        <Alert variant="info">
          Results will be available once voting starts, on{' '}
          {new Date(contest.votingStart).toLocaleString()}.
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

      {!results.final && (
        <Alert variant="info" className="mb-4">
          Voting is still in progress — standings may change before the contest closes.
        </Alert>
      )}

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
