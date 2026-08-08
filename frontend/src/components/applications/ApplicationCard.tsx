import { Application } from '@/types';
import { Badge, Card, CardBody } from '@/components/ui';
import { APPLICATION_STATUS_COLORS, APPLICATION_STATUS_LABELS } from '@/constants';
import { formatDate } from '@/lib/utils';

interface ApplicationCardProps {
  application: Application;
  actions?: React.ReactNode;
}

export const ApplicationCard = ({ application, actions }: ApplicationCardProps) => (
  <Card>
    <CardBody>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-gray-900">{application.job_title || 'Job'}</p>
          {application.companyName && <p className="text-sm text-gray-500">{application.companyName}</p>}
          <p className="mt-1 text-xs text-gray-400">Applied {formatDate(application.created_at)}</p>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${APPLICATION_STATUS_COLORS[application.status]}`}>
          {APPLICATION_STATUS_LABELS[application.status]}
        </span>
      </div>
      {actions && <div className="mt-3 flex gap-2">{actions}</div>}
    </CardBody>
  </Card>
);
