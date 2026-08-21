"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock } from "lucide-react";

export function ClockSettings() {
  const [currentTime, setCurrentTime] = useState<string>("");
  const [currentDate, setCurrentDate] = useState<string>("");
  const [customTime, setCustomTime] = useState<string>("");
  const [customDate, setCustomDate] = useState<string>("");
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => {
    const updateDisplay = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      setCurrentDate(now.toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" }));
    };

    updateDisplay();
    const interval = setInterval(updateDisplay, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedTime = window.localStorage.getItem("mc-custom-time");
    const savedDate = window.localStorage.getItem("mc-custom-date");

    if (savedTime) setCustomTime(savedTime);
    if (savedDate) setCustomDate(savedDate);
  }, []);

  const handleSaveTime = () => {
    if (customTime && typeof window !== "undefined") {
      window.localStorage.setItem("mc-custom-time", customTime);
      setShowEdit(false);
      // Optionnel: afficher un toast de confirmation
    }
  };

  const handleSaveDate = () => {
    if (customDate && typeof window !== "undefined") {
      window.localStorage.setItem("mc-custom-date", customDate);
      setShowEdit(false);
      // Optionnel: afficher un toast de confirmation
    }
  };

  const handleReset = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("mc-custom-time");
      window.localStorage.removeItem("mc-custom-date");
      setCustomTime("");
      setCustomDate("");
      setShowEdit(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-gold" />
          Horloge opérationnelle
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg bg-zinc-900/50 p-4">
          <div>
            <p className="text-sm text-zinc-400">Date et heure actuelle</p>
            <p className="mt-2 text-lg font-semibold text-white">{currentDate}</p>
            <p className="text-2xl font-bold text-gold">{currentTime}</p>
          </div>
        </div>

        {!showEdit ? (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowEdit(true)}
          >
            Configurer l'horloge
          </Button>
        ) : (
          <div className="space-y-4 border-t border-zinc-800 pt-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Heure personnalisée (HH:MM)
              </label>
              <Input
                type="time"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                className="bg-zinc-900 border-zinc-700"
              />
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 text-gold hover:text-gold hover:bg-gold/10"
                onClick={handleSaveTime}
              >
                Enregistrer l'heure
              </Button>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Date personnalisée (YYYY-MM-DD)
              </label>
              <Input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="bg-zinc-900 border-zinc-700"
              />
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 text-gold hover:text-gold hover:bg-gold/10"
                onClick={handleSaveDate}
              >
                Enregistrer la date
              </Button>
            </div>

            <div className="flex gap-2 pt-2 border-t border-zinc-700">
              <Button
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={handleReset}
              >
                Réinitialiser
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1"
                onClick={() => setShowEdit(false)}
              >
                Fermer
              </Button>
            </div>
          </div>
        )}

        <p className="text-xs text-zinc-500 pt-2">
          💡 L'horloge opérationnelle permet de synchroniser l'heure et la date système avec votre caisse.
        </p>
      </CardContent>
    </Card>
  );
}
