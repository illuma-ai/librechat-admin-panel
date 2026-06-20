import { createFileRoute } from '@tanstack/react-router';
import { DashboardsListPage } from '@/components/dashboard';

export const Route = createFileRoute('/_app/dashboards/')({
  component: DashboardsListPage,
});
