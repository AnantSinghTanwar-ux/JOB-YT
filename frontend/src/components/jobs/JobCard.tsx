import Link from 'next/link';
import { Job } from '@/types';
import { Badge, Card, CardBody } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { formatSalaryRange } from '@/lib/salary';
import { ROUTES } from '@/constants';
import { resolveAssetUrl } from '@/lib/assetUrl';
import { isSpazorlabsCompany } from '@/lib/companyFlags';
import { SelectionProbabilityBadge } from '@/components/jobs/SelectionProbability';

interface JobCardProps {
  job: Job;
  actions?: React.ReactNode;
}

export const JobCard = ({ job, actions }: JobCardProps) => {
  const isVerifiedCompany = isSpazorlabsCompany(job.companyName);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardBody>
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-1 items-start gap-3">
          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-slate-200">
            {resolveAssetUrl(job.company_logo) ? (
              <img
                src={resolveAssetUrl(job.company_logo) || ''}
                alt={job.companyName ? `${job.companyName} logo` : 'Company logo'}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs font-bold text-slate-600">
                {(job.companyName || job.title).slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1">
          <Link href={ROUTES.jobDetail(job.id)} className="text-base font-semibold text-gray-900 hover:text-blue-600">
            {job.title}
          </Link>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            {job.companyName && <p className="text-sm text-gray-500">{job.companyName}</p>}
            {isVerifiedCompany && <Badge variant="success">Verified</Badge>}
            {job.selectionProbability !== undefined && (
              <SelectionProbabilityBadge score={job.selectionProbability} />
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {job.location && <span className="text-xs text-gray-500">📍 {job.location}</span>}
            <Badge>{job.type}</Badge>
            {job.is_boosted && <Badge variant="warning">⚡ Boosted</Badge>}
          </div>

          {job.skills.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {job.skills.slice(0, 5).map((s) => (
                <Badge key={s} variant="info">{s}</Badge>
              ))}
              {job.skills.length > 5 && <Badge variant="default">+{job.skills.length - 5}</Badge>}
            </div>
          )}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-sm font-medium text-gray-900">{formatSalaryRange(job.salary_min, job.salary_max, job.type)}</p>
          <p className="mt-1 text-xs text-gray-400">{formatDate(job.created_at)}</p>
        </div>
      </div>

      {actions && <div className="mt-4 flex gap-2">{actions}</div>}
      </CardBody>
    </Card>
  );
};
