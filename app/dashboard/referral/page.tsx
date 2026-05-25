import { redirect } from 'next/navigation';

/** Invite Earn kaldırıldı — eski bağlantılar panele yönlendirilir. */
export default function ReferralPage() {
  redirect('/dashboard');
}
