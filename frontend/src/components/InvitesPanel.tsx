import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { acceptInvite, fetchInvites, rejectInvite, type Invite } from "../api/invites";
import { ApiError } from "../api/client";
import { useSocket } from "../context/useSocket";
import type { ChatRequestPayload, GroupInvitePayload } from "../socket/events";

type InvitesPanelProps = {
  onInviteHandled: () => void;
};

export default function InvitesPanel({ onInviteHandled }: InvitesPanelProps) {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadInvites = useCallback(async () => {
    try {
      const data = await fetchInvites();
      setInvites(data);
    } catch {
      setInvites([]);
    }
  }, []);

  useEffect(() => {
    void loadInvites();
  }, [loadInvites]);

  useEffect(() => {
    if (socket === null) {
      return;
    }

    const isGroupInvite = (payload: ChatRequestPayload | GroupInvitePayload): payload is GroupInvitePayload =>
      "groupName" in payload;

    const addInvite = (payload: ChatRequestPayload | GroupInvitePayload) => {
      const invite: Invite = {
        id: payload.inviteId,
        type: isGroupInvite(payload) ? "group" : "private",
        fromUserId: payload.fromUserId,
        fromUsername: payload.fromUsername,
        chatId: isGroupInvite(payload) ? payload.chatId : null,
        groupName: isGroupInvite(payload) ? payload.groupName : null,
        createdAt: new Date().toISOString(),
      };

      setInvites((current) => {
        if (current.some((item) => item.id === invite.id)) {
          return current;
        }
        return [invite, ...current];
      });
    };

    socket.on("chat:request", addInvite);
    socket.on("group:invite", addInvite);

    return () => {
      socket.off("chat:request", addInvite);
      socket.off("group:invite", addInvite);
    };
  }, [socket]);

  const handleAccept = async (invite: Invite) => {
    setLoadingId(invite.id);
    setError(null);

    try {
      const result = await acceptInvite(invite.id);
      setInvites((current) => current.filter((item) => item.id !== invite.id));
      onInviteHandled();
      void navigate(`/chats/${String(result.chatId)}`);
    } catch (acceptError) {
      const message =
        acceptError instanceof ApiError ? acceptError.message : "Не удалось принять приглашение";
      setError(message);
    } finally {
      setLoadingId(null);
    }
  };

  const handleReject = async (invite: Invite) => {
    setLoadingId(invite.id);
    setError(null);

    try {
      await rejectInvite(invite.id);
      setInvites((current) => current.filter((item) => item.id !== invite.id));
    } catch (rejectError) {
      const message =
        rejectError instanceof ApiError ? rejectError.message : "Не удалось отклонить приглашение";
      setError(message);
    } finally {
      setLoadingId(null);
    }
  };

  if (invites.length === 0 && error === null) {
    return null;
  }

  return (
    <section className="invites-panel">
      <h2 className="invites-title">Уведомления</h2>
      {error !== null && <p className="form-error">{error}</p>}
      <ul className="invites-list">
        {invites.map((invite) => (
          <li key={invite.id} className="invite-item">
            <p className="invite-text">
              {invite.type === "private" ? (
                <>
                  <strong>{invite.fromUsername}</strong> хочет начать с вами диалог
                </>
              ) : (
                <>
                  <strong>{invite.fromUsername}</strong> приглашает вас в группу{" "}
                  <strong>{invite.groupName}</strong>
                </>
              )}
            </p>
            <div className="invite-actions">
              <button
                type="button"
                className="primary-button"
                disabled={loadingId !== null}
                onClick={() => {
                  void handleAccept(invite);
                }}
              >
                Принять
              </button>
              <button
                type="button"
                className="secondary-button"
                disabled={loadingId !== null}
                onClick={() => {
                  void handleReject(invite);
                }}
              >
                Отклонить
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
