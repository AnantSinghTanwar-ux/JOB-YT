import { Card, CardBody, Button } from '@/components/ui';

export interface InsufficientCreditsData {
  required: number;
  available: number;
}

interface InsufficientCreditsCardProps {
  creditError: InsufficientCreditsData;
  onViewCredits: () => void;
  onRetry: () => void;
  retryDisabled?: boolean;
}

export function InsufficientCreditsCard({
  creditError,
  onViewCredits,
  onRetry,
  retryDisabled = false,
}: InsufficientCreditsCardProps) {
  return (
    <Card>
      <CardBody className="p-6 space-y-4">
        <h3 className="font-semibold text-slate-900">Not enough credits</h3>

        <p className="text-sm text-slate-500">
          You need {creditError.required} credits, but only have {creditError.available}.
        </p>

        <div className="flex gap-2">
          <Button onClick={onViewCredits}>View Credits</Button>
          <Button variant="outline" onClick={onRetry} disabled={retryDisabled}>
            Try Again
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
