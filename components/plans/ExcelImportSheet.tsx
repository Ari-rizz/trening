'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileSpreadsheet, ClipboardPaste, Upload, CircleAlert as AlertCircle, Check, RefreshCw, Dumbbell } from 'lucide-react';
import { ParsedProgram, parsePastedText, parseWorkbook, importParsedProgram } from '@/lib/excel-import';

interface Props {
  open: boolean;
  userId: string;
  onClose: () => void;
  onImported: () => void;
}

type Mode = 'file' | 'paste';

export function ExcelImportSheet({ open, userId, onClose, onImported }: Props) {
  const [mode, setMode] = useState<Mode>('paste');
  const [parsed, setParsed] = useState<ParsedProgram | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [planName, setPlanName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setParsing(true);
    setError(null);
    setParsed(null);
    try {
      const result = await parseWorkbook(file);
      setParsed(result);
      setPlanName(result.name);
      if (result.rows.length === 0) {
        setError(result.errors[0] ?? 'Ingen gyldige øvelser funnet i filen. Sjekk at kolonnene har navn som "Øvelse", "Sett", "Reps", "Vekt".');
      }
    } catch (err) {
      console.error('Excel import error:', err);
      setError('Kunne ikke lese filen. Sjekk at det er en gyldig Excel- eller CSV-fil.');
    }
    setParsing(false);
  };

  const handleParsePaste = () => {
    setParsing(true);
    setError(null);
    setParsed(null);
    const result = parsePastedText(pasteText);
    setParsed(result);
    setParsing(false);
  };

  const handleImport = async () => {
    if (!parsed || parsed.rows.length === 0) return;
    setImporting(true);
    setError(null);
    const program: ParsedProgram = { ...parsed, name: planName || parsed.name || 'Importert plan' };
    const result = await importParsedProgram(program, userId);
    setImporting(false);
    if (result.success) {
      setSuccess(true);
      if (result.error) setError(result.error);
      setTimeout(() => {
        setSuccess(false);
        setParsed(null);
        setPasteText('');
        setPlanName('');
        onImported();
        onClose();
      }, 1500);
    } else {
      setError(result.error ?? 'Noe gikk galt under importering');
    }
  };

  const handleClose = () => {
    setParsed(null);
    setPasteText('');
    setPlanName('');
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
                <div className="w-10 h-10 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                  <FileSpreadsheet size={18} className="text-green-400" />
                </div>
                <div>
                  <p className="text-white font-bold">Importer fra Excel/CSV</p>
                  <p className="text-zinc-500 text-xs">Last opp fil eller lim inn fra notater</p>
                </div>
              </div>
              <button onClick={handleClose} className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center">
                <X size={16} className="text-zinc-400" />
              </button>
            </div>

            {/* Mode toggle */}
            <div className="flex gap-2 mb-4 bg-zinc-900 rounded-xl p-1">
              <button
                onClick={() => setMode('paste')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
                  mode === 'paste' ? 'bg-blue-500 text-white' : 'text-zinc-500'
                }`}
              >
                <ClipboardPaste size={14} />
                Lim inn
              </button>
              <button
                onClick={() => setMode('file')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
                  mode === 'file' ? 'bg-blue-500 text-white' : 'text-zinc-500'
                }`}
              >
                <Upload size={14} />
                Last opp fil
              </button>
            </div>

            {mode === 'paste' && (
              <div className="space-y-3">
                <textarea
                  value={pasteText}
                  onChange={e => setPasteText(e.target.value)}
                  placeholder={`Lim inn øvelser her. Støtter:\nØvelse;Sett;Reps;Vekt;Hvile\nBenkpress;3;8;80;90\nKnebøy;5;5;100;180`}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm font-mono placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600 min-h-[120px] resize-none"
                />
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleParsePaste}
                  disabled={!pasteText.trim() || parsing}
                  className="w-full bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
                >
                  {parsing ? <RefreshCw size={16} className="animate-spin" /> : <ClipboardPaste size={16} />}
                  Forhåndsvis
                </motion.button>
              </div>
            )}

            {mode === 'file' && (
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-zinc-800 rounded-2xl py-10 px-4 text-center cursor-pointer hover:border-zinc-700 transition-colors"
              >
                <FileSpreadsheet size={32} className="text-zinc-600 mx-auto mb-3" />
                <p className="text-white font-medium text-sm">Trykk for å velge fil</p>
                <p className="text-zinc-600 text-xs mt-1">Støtter .xlsx, .xls og .csv</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                    e.target.value = '';
                  }}
                />
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 mt-4">
                <AlertCircle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-amber-400 text-sm">{error}</p>
              </div>
            )}

            {/* Preview */}
            {parsed && parsed.rows.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 space-y-3"
              >
                <input
                  type="text"
                  value={planName}
                  onChange={e => setPlanName(e.target.value)}
                  placeholder="Navn på planen"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600"
                />

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-zinc-800 bg-zinc-800/50">
                    <p className="text-zinc-400 text-xs font-semibold">
                      {parsed.rows.length} øvelser funnet
                    </p>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {parsed.rows.map((row, i) => (
                      <div
                        key={i}
                        className={`flex items-center gap-2 px-4 py-2 text-xs ${
                          i % 2 === 0 ? 'bg-zinc-900' : 'bg-zinc-900/50'
                        } border-b border-zinc-800/50`}
                      >
                        <Dumbbell size={10} className="text-zinc-600 flex-shrink-0" />
                        <span className="text-white truncate flex-1">{row.exerciseName}</span>
                        <span className="text-zinc-500 flex-shrink-0">{row.sets}x{row.reps}</span>
                        {row.weight > 0 && <span className="text-zinc-500 flex-shrink-0">{row.weight}kg</span>}
                        {row.warnings.length > 0 && (
                          <AlertCircle size={10} className="text-amber-400 flex-shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleImport}
                  disabled={importing || success}
                  className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-colors ${
                    success
                      ? 'bg-green-500/20 border border-green-500/30 text-green-400'
                      : 'bg-green-500 text-white'
                  }`}
                >
                  {importing ? <RefreshCw size={16} className="animate-spin" /> : success ? <Check size={16} /> : <Upload size={16} />}
                  {success ? 'Importert!' : importing ? 'Importerer...' : 'Importer plan'}
                </motion.button>
              </motion.div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
