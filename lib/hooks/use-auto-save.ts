import { useCallback, useEffect, useRef, useState } from "react";

type AutoSaveData = Record<string, unknown>;

interface UseAutoSaveOptions {
  initialData: AutoSaveData;
  onSave: (data: AutoSaveData) => Promise<void>;
  delay?: number;
  storageKey?: string;
}

function readDraft(storageKey?: string): AutoSaveData | null {
  if (!storageKey || typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(`draft_${storageKey}`);
    return raw ? (JSON.parse(raw) as AutoSaveData) : null;
  } catch (error) {
    console.error("Failed to parse stored data:", error);
    return null;
  }
}

export function useAutoSave({
  initialData,
  onSave,
  delay = 2000,
  storageKey,
}: UseAutoSaveOptions) {
  const [data, setData] = useState<AutoSaveData>(() => readDraft(storageKey) ?? initialData);
  const [isSaving, setIsSaving] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(
    async (dataToSave: AutoSaveData) => {
      if (isSaving) return;

      setIsSaving(true);
      try {
        await onSave(dataToSave);
        if (storageKey && typeof window !== "undefined") {
          window.localStorage.removeItem(`draft_${storageKey}`);
        }
      } catch (error) {
        console.error("Auto-save failed:", error);
      } finally {
        setIsSaving(false);
      }
    },
    [isSaving, onSave, storageKey]
  );

  const handleChange = useCallback(
    (updatedData: AutoSaveData) => {
      setData(updatedData);

      if (storageKey && typeof window !== "undefined") {
        window.localStorage.setItem(`draft_${storageKey}`, JSON.stringify(updatedData));
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        void save(updatedData);
      }, delay);
    },
    [delay, save, storageKey]
  );

  const restoreDraft = useCallback(() => {
    const draft = readDraft(storageKey);
    if (!draft) return false;
    setData(draft);
    return true;
  }, [storageKey]);

  const clearDraft = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (storageKey && typeof window !== "undefined") {
      window.localStorage.removeItem(`draft_${storageKey}`);
    }
  }, [storageKey]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    data,
    handleChange,
    restoreDraft,
    clearDraft,
    isSaving,
  };
}

export function useAutoSaveFormField<T>(
  fieldName: string,
  initialValue: T,
  onSave: (value: T) => Promise<void>,
  delay = 1000
) {
  const [value, setValue] = useState<T>(initialValue);
  const [isSaving, setIsSaving] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback(
    (newValue: T) => {
      setValue(newValue);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        if (isSaving) return;

        setIsSaving(true);

        void onSave(newValue)
          .catch((error) => {
            console.error(`Failed to save field ${fieldName}:`, error);
          })
          .finally(() => {
            setIsSaving(false);
          });
      }, delay);
    },
    [delay, fieldName, isSaving, onSave]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [value, handleChange, isSaving] as const;
}

