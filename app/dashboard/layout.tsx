import DiscordActivityAuth from '@/components/DiscordActivityAuth';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DiscordActivityAuth>{children}</DiscordActivityAuth>;
}
