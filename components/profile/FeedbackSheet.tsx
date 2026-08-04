'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare, Send, RefreshCw, Bug, Lightbulb, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function FeedbackSheet({ open, onClose }: Props) {
  const [type, setType] = useState<'suggestion' | 'bug'>('suggestion');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!subject.trim() || !body.trim()) {
      setError('Fyll ut emne og beskrivelse');
      return;
    }
    setLoading(true);
    setError(null);

    const { data: { session } } = await supabase.auth.getSession();
    const platform = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';

    const { error: insertError } = await supabase.from('feedback').insert({
      user_id: session?.user?.id ?? null,
      type,
      subject: subject.trim(),
      body: body.trim(),
      platform,
      app_version: '1.0.0',
    });

    if (insertError) {
      setLoading(false);
      setError('Kunne ikke sende tilbakemelding. Prøv igjen.');
      return;
    }

    // Send email notification (fire-and-forget — DB save already succeeded)
    fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/feedback-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token ?? ''}`,
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      },
      body: JSON.stringify({
        type,
        subject: subject.trim(),
        body: body.trim(),
        user_email: session?.user?.email ?? null,
        platform,
        app_version: '1.0.0',
      }),
    }).catch(() => {});

    setLoading(false);
    setSuccess(true);
    setSubject('');
    setBody('');
    setTimeout(() => {
      setSuccess(false);
      onClose();
    }, 1500);
  };

  const handleClose = () => {
    setSubject('');
    setBody('');
    setError(null);
    setSuccess(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[59]"
            onClick={handleClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[60] bg-zinc-950 border-t border-zinc-800 rounded-t-3xl px-5 pt-5 pb-[calc(env(safe-area-inset-bottom)+2rem)] max-h-[85vh] overflow-y-auto"
          >
            <div className="w-10 h-1 bg-zinc-800 rounded-full mx-auto mb-5" />
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                  <MessageSquare size={18} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-white font-bold">Tilbakemelding</p>
                  <p className="text-zinc-500 text-xs">Hjelp oss å forbedre IronGrid</p>
                </div>
              </div>
              <button onClick={handleClose} className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center">
                <X size={16} className="text-zinc-400" />
              </button>
            </div>

            {/* Type toggle */}
            <div className="flex gap-2 mb-4 bg-zinc-900 rounded-xl p-1">
              <button
                onClick={() => setType('suggestion')}
                className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
                  type === 'suggestion' ? 'bg-blue-500 text-white' : 'text-zinc-500'
                }`}
              >
                <Lightbulb size={14} />
                Forslag
              </button>
              <button
                onClick={() => setType('bug')}
                className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
                  type === 'bug' ? 'bg-red-500 text-white' : 'text-zinc-500'
                }`}
              >
                <Bug size={14} />
                Feil
              </button>
            </div>

            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Emne"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600 mb-3"
            />
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder={type === 'bug' ? 'Beskriv feilen, hva du gjorde og hva som skjedde...' : 'Hva vil du forbedre eller legge til?'}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600 min-h-[120px] resize-none mb-3"
            />

            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSubmit}
              disabled={loading || success}
              className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-colors ${
                success
                  ? 'bg-green-500/20 border border-green-500/30 text-green-400'
                  : 'bg-blue-500 text-white'
              }`}
            >
              {loading ? <RefreshCw size={16} className="animate-spin" /> : success ? <Check size={16} /> : <Send size={16} />}
              {success ? 'Sendt!' : loading ? 'Sender...' : 'Send tilbakemelding'}
            </motion.button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
