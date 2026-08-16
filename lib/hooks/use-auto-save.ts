import React, { useEffect, useRef, useCallback } from 'react';

interface UseAutoSaveOptions {
  initialData: Record<string, any>;
  onSave: (data: Record<string, any>) => Promise<void>;
  delay?: number; // milliseconds before saving after last change
  storageKey?: string; // localStorage key for draft saving
}

export function useAutoSave({
  initialData,
  onSave,
  delay = 2000,
  storageKey,
}: UseAutoSaveOptions) {
  const [data, setData] = useFormData(initialData, storageKey);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const isSavingRef = useRef(false);

  const save = useCallback(
    async (dataToSave: Record<string, any>) => {
      if (isSavingRef.current) return;

      isSavingRef.current = true;
      try {
        await onSave(dataToSave);
        // Clear draft from localStorage on successful save
        if (storageKey) {
          localStorage.removeItem(`draft_${storageKey}`);
        }
      } catch (error) {
        console.error('Auto-save failed:', error);
      } finally {
        isSavingRef.current = false;
      }
    },
    [onSave, storageKey]
  );

  const handleChange = useCallback(
    (updatedData: Record<string, any>) => {
      setData(updatedData);

      // Save draft to localStorage
      if (storageKey) {
        localStorage.setItem(`draft_${storageKey}`, JSON.stringify(updatedData));
      }

      // Clear previous timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout for auto-save
      timeoutRef.current = setTimeout(() => {
        save(updatedData);
      }, delay);
    },
    [setData, save, delay, storageKey]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const restoreDraft = useCallback(() => {
    if (storageKey) {
      const draft = localStorage.getItem(`draft_${storageKey}`);
      if (draft) {
        try {
          setData(JSON.parse(draft));
          return true;
        } catch (error) {
          console.error('Failed to restore draft:', error);
        }
      }
    }
    return false;
  }, [storageKey, setData]);

  const clearDraft = useCallback(() => {
    if (storageKey) {
      localStorage.removeItem(`draft_${storageKey}`);
    }
  }, [storageKey]);

  return {
    data,
    handleChange,
    restoreDraft,
    clearDraft,
    isSaving: isSavingRef.current,
  };
}

function useFormData(
  initialData: Record<string, any>,
  storageKey?: string
): [Record<string, any>, (data: Record<string, any>) => void] {
  const [data, setData] = React.useState(() => {
    if (storageKey && typeof window !== 'undefined') {
      const draft = localStorage.getItem(`draft_${storageKey}`);
      if (draft) {
        try {
          return JSON.parse(draft);
        } catch (error) {
          console.error('Failed to parse stored data:', error);
        }
      }
    }
    return initialData;
  });

  return [data, setData];

export function useAutoSaveFormField(
  fieldName: string,
  initialValue: any,
  onSave: (value: any) => Promise<void>,
  delay = 1000
) {
  const [value, setValue] = React.useState(initialValue);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const isSavingRef = useRef(false);

  const handleChange = useCallback(
    (newValue: any) => {
      setValue(newValue);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(async () => {
        if (isSavingRef.current) return;
        isSavingRef.current = true;

        try {
          await onSave(newValue);
        } catch (error) {
          console.error(`Failed to save field ${fieldName}:`, error);
        } finally {
          isSavingRef.current = false;
        }
      }, delay);
    },
    [fieldName, onSave, delay]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [value, handleChange, isSavingRef.current] as const;
}
