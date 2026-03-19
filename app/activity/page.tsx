"use client";

import DiscordActivityAuth from '@/components/DiscordActivityAuth';
import DashboardPage from '../dashboard/page';

export default function ActivityPage() {
  return (
    <DiscordActivityAuth>
      <DashboardPage />
    </DiscordActivityAuth>
  );
}
