'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  LuLoader, LuTriangleAlert, LuCheck, LuThumbsUp,
  LuBadgeCheck, LuUsers, LuChevronRight, LuShield,
  LuTrendingUp, LuStar, LuArrowLeft, LuCircleCheck,
  LuCircleX, LuClock, LuVote,
} from 'react-icons/lu';
import fetchWithCreds from '@/lib/fetchWithCreds';
import { apiUrl } from '@/lib/api';
import { useT } from '@/contexts/LocaleContext';

type AppStatus = {
  status: 'none' | 'pending' | 'approved' | 'rejected' | 'voting';
  guild_id?: string;
  type?: 'direct' | 'vote';
  vote_count?: number;
  vote_threshold?: number;
  scheduled_open_at?: string | null;
  reviewed_at?: string | null;
  rejection_reason?: string | null;
};

export default function EconomyApplySection() {
  const t = useT();
  const [app, setApp] = useState<AppStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [acknowledged, setAcknowledged] = useState(false);

  const getGuildId = () => {
    try { return localStorage.getItem('selectedGuildId'); } catch { return null; }
  };
  const getStepKey = (gid: string | null) => gid ? `economy_apply_step_${gid}` : 'economy_apply_step';
  const getAckKey = (gid: string | null) => gid ? `economy_apply_ack_${gid}` : 'economy_apply_ack';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithCreds(apiUrl('/api/member/economy-apply'));
      'use client';

      import Image from 'next/image';

      export default function EconomyApplySection() {
        return (
          <section className="relative flex min-h-[70vh] w-full items-center justify-center px-4 py-8 sm:px-8">
            <div className="relative w-full max-w-3xl">
              <Image
                src="/yakinda.png"
                alt="Yakinda"
                width={1200}
                height={800}
                className="h-auto w-full object-contain"
                priority
              />
            </div>

            <p className="pointer-events-none absolute bottom-4 right-5 text-xs font-medium tracking-wide text-white/55 sm:bottom-6 sm:right-8">
              yakında kullanıma sunulacak.
            </p>
          </section>
        );
      }
  useEffect(() => {
