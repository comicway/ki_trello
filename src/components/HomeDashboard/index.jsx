"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { UserIcon, CheckCircleIcon } from "../ui/icons";
import MemberAvatar from "../MemberAvatar";

const RecentNotifications = dynamic(() => import("../RecentNotifications"), {
  ssr: false,
  loading: () => (
    <section className="bg-ki-black border border-border-ki rounded-lg p-4 mt-6">
      <p className="text-light-gray text-sm italic">Cargando notificaciones…</p>
    </section>
  ),
});

export default function HomeDashboard({ myPendingTareas, membersWithPendingCounts, currentUserEmail }) {
  return (
    <div className="w-full max-w-5xl mx-auto pb-10 mt-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <section className="bg-ki-black border border-border-ki rounded-lg p-4">
          <h2 className="text-pearl-white font-semibold text-lg mb-4 flex items-center gap-2">
            <CheckCircleIcon className="h-5 w-5 text-ki-orange" />
            Mis tareas pendientes
          </h2>
          {myPendingTareas.length === 0 ? (
            <p className="text-light-gray text-sm italic">No tienes tareas pendientes asignadas.</p>
          ) : (
            <ul className="space-y-2 max-h-80 overflow-y-auto">
              {myPendingTareas.map((t) => (
                <li key={`${t.boardKey}-${t.tareaKey}-${t.subtaskId || "main"}`}>
                  <Link
                    href={`/b/${t.boardKey}`}
                    className="block px-3 py-2 rounded-md bg-dark-blue border border-border-ki hover:border-ki-purple transition-colors"
                  >
                    <p className="text-pearl-white text-sm font-medium truncate">
                      {t.isSubtask && (
                        <span className="text-light-gray text-xs mr-1">[Subtarea]</span>
                      )}
                      {t.title}
                    </p>
                    <p className="text-light-gray text-xs truncate mt-0.5">
                      {t.boardTitle} · {t.listTitle}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-ki-black border border-border-ki rounded-lg p-4">
          <h2 className="text-pearl-white font-semibold text-lg mb-4 flex items-center gap-2">
            <UserIcon className="h-5 w-5 text-ki-orange" />
            Miembros · tareas pendientes
          </h2>
          {membersWithPendingCounts.length === 0 ? (
            <p className="text-light-gray text-sm italic">No hay miembros en tus boards.</p>
          ) : (
            <ul className="space-y-2 max-h-80 overflow-y-auto">
              {membersWithPendingCounts.map((member) => (
                <li
                  key={member.email}
                  className="flex items-center gap-3 px-3 py-2 rounded-md bg-dark-blue border border-border-ki"
                >
                  <MemberAvatar member={member} size={36} borderClass="border-ki-black" />
                  <div className="flex-1 min-w-0">
                    <p className="text-pearl-white text-sm font-medium truncate">
                      {member.displayName || member.email}
                      {member.email === currentUserEmail && (
                        <span className="text-light-gray text-xs ml-1">(tú)</span>
                      )}
                    </p>
                    <p className="text-light-gray text-xs truncate">{member.email}</p>
                  </div>
                  <span className="flex-shrink-0 min-w-[28px] h-7 px-2 flex items-center justify-center rounded-full bg-ki-black border border-border-ki text-pearl-white text-sm font-semibold">
                    {member.pendingCount}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <RecentNotifications />
    </div>
  );
}
