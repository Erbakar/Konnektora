import { useMutation } from "@tanstack/react-query";
import { Check, KeyRound, MailCheck, UserRound } from "lucide-react";
import { type FormEvent, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { acceptInvite, confirmEmail, resetPassword, setUserSession } from "../lib/api";

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const mutation = useMutation({
    mutationFn: confirmEmail,
    onSuccess: (response) => setUserSession(response)
  });

  useEffect(() => {
    if (token && !mutation.data && !mutation.isPending && !mutation.isError) {
      mutation.mutate(token);
    }
  }, [mutation, token]);

  return (
    <section className="page auth-token-page">
      <MailCheck size={36} />
      <h1>Email doğrulama</h1>
      {mutation.isPending ? <p>Email adresin doğrulanıyor...</p> : null}
      {mutation.data ? (
        <>
          <p>Hesabın aktifleştirildi.</p>
          <Link className="primary-action" to="/onboarding">
            <Check size={18} />
            Telefon doğrulamasına devam et
          </Link>
        </>
      ) : null}
      {mutation.isError || !token ? <p className="form-error">Doğrulama linki geçersiz veya süresi dolmuş.</p> : null}
    </section>
  );
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const mutation = useMutation({
    mutationFn: (password: string) => resetPassword(token, password),
    onSuccess: (response) => setUserSession(response)
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    mutation.mutate(String(form.get("password")));
  }

  return (
    <section className="page auth-token-page">
      <KeyRound size={36} />
      <h1>Şifre sıfırla</h1>
      <form className="admin-form compact-form" onSubmit={handleSubmit}>
        <label>
          Yeni şifre
          <input maxLength={128} minLength={8} name="password" pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,128}" required title="En az 8 karakter, bir büyük harf, bir küçük harf ve bir özel karakter kullanın." type="password" />
        </label>
        <button className="primary-action" disabled={mutation.isPending || !token} type="submit">
          Şifreyi kaydet
        </button>
      </form>
      {mutation.data ? <p className="form-success">Şifren güncellendi ve giriş yapıldı.</p> : null}
      {mutation.isError || !token ? <p className="form-error">Şifre sıfırlama linki geçersiz veya süresi dolmuş.</p> : null}
    </section>
  );
}

export function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const mutation = useMutation({
    mutationFn: (input: { name?: string; password: string }) => acceptInvite({ token, ...input }),
    onSuccess: (response) => setUserSession(response)
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    mutation.mutate({
      name: String(form.get("name") || "") || undefined,
      password: String(form.get("password"))
    });
  }

  return (
    <section className="page auth-token-page">
      <UserRound size={36} />
      <h1>Daveti kabul et</h1>
      <form className="admin-form compact-form" onSubmit={handleSubmit}>
        <label>
          Ad Soyad
          <input name="name" minLength={2} />
        </label>
        <label>
          Şifre
          <input maxLength={128} minLength={8} name="password" pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,128}" required title="En az 8 karakter, bir büyük harf, bir küçük harf ve bir özel karakter kullanın." type="password" />
        </label>
        <button className="primary-action" disabled={mutation.isPending || !token} type="submit">
          Daveti kabul et
        </button>
      </form>
      {mutation.data ? (
        <p className="form-success">
          Davet kabul edildi. <Link to="/feed">Akışa geç</Link>
        </p>
      ) : null}
      {mutation.isError || !token ? <p className="form-error">Davet linki geçersiz veya süresi dolmuş.</p> : null}
    </section>
  );
}
