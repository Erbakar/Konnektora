import { Eye, EyeOff } from "lucide-react";
import { useState, type InputHTMLAttributes } from "react";

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function EmailInput(props: InputProps) {
  return (
    <input
      autoCapitalize="none"
      autoComplete="email"
      inputMode="email"
      placeholder="ornek@eposta.com"
      spellCheck={false}
      type="email"
      {...props}
    />
  );
}

export function PhoneInput(props: InputProps) {
  return (
    <input
      autoComplete="tel"
      inputMode="tel"
      placeholder="+90 555 111 22 33"
      type="tel"
      {...props}
    />
  );
}

export function VerificationCodeInput(props: InputProps) {
  return (
    <input
      autoComplete="one-time-code"
      inputMode="numeric"
      maxLength={6}
      minLength={6}
      pattern="[0-9]{6}"
      placeholder="123456"
      {...props}
      onChange={(event) => {
        event.target.value = event.target.value.replace(/\D/g, "").slice(0, 6);
        props.onChange?.(event);
      }}
    />
  );
}

export function PasswordInput(props: InputProps) {
  const [visible, setVisible] = useState(false);
  const isTurkish = document.documentElement.lang !== "en";
  return (
    <span className="password-input">
      <input {...props} type={visible ? "text" : "password"} />
      <button
        aria-label={visible ? (isTurkish ? "Şifreyi gizle" : "Hide password") : (isTurkish ? "Şifreyi göster" : "Show password")}
        onClick={() => setVisible((current) => !current)}
        type="button"
      >
        {visible ? <EyeOff size={18}/> : <Eye size={18}/>}
      </button>
    </span>
  );
}
