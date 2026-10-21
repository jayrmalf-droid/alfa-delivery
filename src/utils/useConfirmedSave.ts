import { useRef, useState } from 'react';

/** Keep a form open and its draft intact until the server confirms the write. */
export function useConfirmedSave() {
  const busy = useRef(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const runSave = async (operation: () => Promise<unknown>): Promise<boolean> => {
    if (busy.current) return false;
    busy.current = true;
    setSaving(true);
    setSaveError('');
    try {
      await operation();
      return true;
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Não foi possível confirmar a gravação. Confira o histórico antes de tentar novamente.');
      return false;
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };

  return { saving, saveError, runSave };
}
