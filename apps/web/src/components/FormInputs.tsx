import { useEffect, useState, type InputHTMLAttributes } from "react";
import { formatPhone } from "../lib/formats";

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

export function PhoneInput({ defaultValue, value, onChange, ...props }: InputProps) {
  const [phone, setPhone] = useState(() => formatPhone(String(value ?? defaultValue ?? "")));

  useEffect(() => {
    if (value !== undefined) setPhone(formatPhone(String(value)));
  }, [value]);

  return (
    <input
      autoComplete="tel"
      inputMode="tel"
      placeholder="+90 555 111 22 33"
      type="tel"
      {...props}
      value={phone}
      onChange={(event) => {
        const formatted = formatPhone(event.target.value);
        setPhone(formatted);
        event.target.value = formatted;
        onChange?.(event);
      }}
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
