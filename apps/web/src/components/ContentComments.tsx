import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Send } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  createContentComment,
  getUserSession,
  listContentComments,
} from "../lib/api";
import { RichText } from "./RichText";
import { userProfilePath } from "./UserIdentityLink";

export function ContentComments({
  targetType,
  targetId,
  title,
}: {
  targetType: "event" | "place" | "tag_comment";
  targetId: string;
  title: string;
}) {
  const user = getUserSession();
  const client = useQueryClient();
  const [body, setBody] = useState("");
  const comments = useQuery({
    queryKey: ["content-comments", targetType, targetId],
    queryFn: () => listContentComments(targetType, targetId),
  });
  const create = useMutation({
    mutationFn: () => createContentComment(targetType, targetId, body.trim()),
    onSuccess: () => {
      setBody("");
      void client.invalidateQueries({
        queryKey: ["content-comments", targetType, targetId],
      });
    },
  });
  return (
    <section className="admin-form content-comments">
      <div className="section-header compact">
        <h2>
          <MessageCircle size={19} />
          {title}
        </h2>
        <span>{comments.data?.length ?? 0} yorum</span>
      </div>
      {user ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (body.trim()) create.mutate();
          }}
        >
          <textarea
            maxLength={3000}
            placeholder="Yorum yaz…"
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
          <button
            className="primary-action"
            disabled={!body.trim() || create.isPending}
          >
            <Send size={17} />
            Gönder
          </button>
        </form>
      ) : (
        <p className="form-help">
          <Link to="/account">Giriş yaparak</Link> yorum yazabilirsin.
        </p>
      )}
      <div className="admin-list">
        {comments.data?.map((comment) => (
          <article className="admin-list-row" key={comment.id}>
            <div>
              <strong>
                {comment.author ? (
                  <Link to={userProfilePath(comment.author)}>
                    {comment.author.username
                      ? `@${comment.author.username}`
                      : comment.author.name}
                  </Link>
                ) : (
                  "Silinmiş kullanıcı"
                )}
              </strong>
              <span>
                <RichText text={comment.body} />
              </span>
              <small>
                {new Date(comment.createdAt).toLocaleString("tr-TR")}
              </small>
            </div>
          </article>
        ))}
      </div>
      {comments.isError ? (
        <p className="form-error">Yorumlar yüklenemedi.</p>
      ) : null}
    </section>
  );
}
