"use client";

import { useEffect, useState } from "react";
import { BellOutlined } from "@ant-design/icons";
import moment from "moment";
import { auth } from "@/firebase/firebase";

export default function RecentNotifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;

    const load = async (user) => {
      if (!user) {
        setItems([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const token = await user.getIdToken();
        const response = await fetch("/api/notifications?limit=10", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const body = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(body.error || "Error al cargar notificaciones");
        }

        if (!cancelled) {
          setItems(body.notifications || []);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("RecentNotifications:", err);
          setError(err.message);
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const unsubscribe = auth.onAuthStateChanged((user) => {
      load(user);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const formatDate = (iso) => {
    if (!iso) return "—";
    return moment(iso).format("DD MMM HH:mm");
  };

  return (
    <section className="bg-ki-black border border-border-ki rounded-lg p-4 mt-6">
      <h2 className="text-pearl-white font-semibold text-lg mb-4 flex items-center gap-2">
        <BellOutlined className="text-ki-purple" />
        Últimas 10 notificaciones
      </h2>

      {loading ? (
        <p className="text-light-gray text-sm italic">Cargando notificaciones…</p>
      ) : error ? (
        <p className="text-light-gray text-sm italic">{error}</p>
      ) : items.length === 0 ? (
        <p className="text-light-gray text-sm italic">No hay notificaciones recientes.</p>
      ) : (
        <ul className="space-y-2 max-h-80 overflow-y-auto">
          {items.map((item) => (
            <li
              key={item.id || item.idempotencyKey}
              className="grid grid-cols-[88px_120px_1fr] gap-2 px-3 py-2 rounded-md bg-dark-blue border border-border-ki text-sm"
            >
              <span className="text-light-gray text-xs whitespace-nowrap">
                {formatDate(item.createdAt)}
              </span>
              <span className="text-pearl-white font-medium truncate" title={item.actorName}>
                {item.actorName || "—"}
              </span>
              <span className="text-light-gray truncate" title={item.messageFragment}>
                {item.messageFragment || "—"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
