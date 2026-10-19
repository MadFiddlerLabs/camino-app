# Supabase auth email templates (Get Camino brand — five languages)

The two styled auth templates, versioned here so they can be applied to any Supabase
instance (production is self-hosted at `supabase.getcamino.app`) instead of
living only in a dashboard. Style mirrors `lib/emailTemplates.ts` (`shell()` + `button()`:
cal ground, Georgia masthead, Helvetica body, cobalt button, 560px column).

Where they go: Supabase dashboard → project → **Authentication → Emails → Templates** →
"Magic link or OTP" / "Confirm sign up" (Subject + Body/Source). Both include the
`{{ .ConfirmationURL }}` button **and** the one-time `{{ .Token }}` code (length is
Supabase's choice — currently 8 digits) so a link requested on one device can be completed
on another (the app's EmailSignIn dialog accepts the code).

**LOCALIZED since 2026-07-05** (user-found bug: Italian UI, English code email). GoTrue
renders these with Go templates and exposes the user's metadata as `{{ .Data }}`; the app
guarantees `user_metadata.lang` (signInWithOtp sends it for new users; SessionSync mirrors
it for existing ones). The templates branch on it — **note the nil-safe first line**:

```
{{ $lang := printf "%v" .Data.lang }}
```

`printf "%v"` turns a missing key into the string `"<nil>"` instead of a nil that would make
`eq` ERROR and kill the send for every pre-localization user. Every branch then falls
through to English. Subjects use the same inline branching (GoTrue templates subjects too).

Auth emails are transactional: no unsubscribe footer (that's only for the weekly roundup).

Test order: LOCAL first (`npx supabase start`; point `[auth.email.template.magic_link]` in
`supabase/config.toml` at the template file; mail lands in Mailpit at http://127.0.0.1:54324)
→ request a code from the local app in es/it → verify → then PRODUCTION. Both templates below are complete paste-ready sources.

---

## Magic link or OTP

**Subject** (Supabase caps subjects at 255 chars, so the brand sits OUTSIDE the branch and
`$l` keeps the guard short):

```
{{ $l := printf "%v" .Data.lang }}Get Camino: {{ if eq $l "es" }}tu enlace de acceso{{ else if eq $l "fr" }}ton lien de connexion{{ else if eq $l "de" }}dein Anmeldelink{{ else if eq $l "it" }}il tuo link di accesso{{ else }}your sign-in link{{ end }}
```

**Body (Source):**

```html
{{ $lang := printf "%v" .Data.lang }}<!doctype html>
<html><body style="margin:0;padding:0;background:#FBFAF7;">
<div style="max-width:560px;margin:0 auto;padding:32px 24px;font-family:Georgia,'Times New Roman',serif;color:#15243B;">
  <div style="font-size:22px;font-weight:600;margin-bottom:24px;">Get Camino <span style="color:#8A9BB0;font-size:14px;font-style:italic;">{{ if eq $lang "es" }}— tu camino a España{{ else if eq $lang "fr" }}— ta route vers l’Espagne{{ else if eq $lang "de" }}— dein Weg nach Spanien{{ else if eq $lang "it" }}— la tua strada per la Spagna{{ else }}— your road to Spain{{ end }}</span></div>
  <p style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:24px;margin:0 0 16px;">{{ if eq $lang "es" }}Hola — soy Lola.{{ else if eq $lang "fr" }}Hola — c’est Lola.{{ else if eq $lang "de" }}Hola — hier ist Lola.{{ else if eq $lang "it" }}Hola — sono Lola.{{ else }}Hola — Lola here.{{ end }}</p>
  <p style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:24px;margin:0 0 16px;">{{ if eq $lang "es" }}Toca el botón y vuelves a tu hoja de ruta — sin contraseña.{{ else if eq $lang "fr" }}Appuie sur le bouton et te revoilà sur ta feuille de route — sans mot de passe.{{ else if eq $lang "de" }}Tipp auf den Button und du bist zurück auf deiner Roadmap — ganz ohne Passwort.{{ else if eq $lang "it" }}Tocca il pulsante e sei di nuovo sulla tua roadmap — senza password.{{ else }}Tap the button and you’re back on your roadmap — no password needed.{{ end }}</p>
  <div style="margin:24px 0;"><a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#2B5AA3;color:#FFFFFF;text-decoration:none;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;padding:12px 22px;border-radius:8px;">{{ if eq $lang "es" }}Entrar en Get Camino{{ else if eq $lang "fr" }}Se connecter à Get Camino{{ else if eq $lang "de" }}Bei Get Camino anmelden{{ else if eq $lang "it" }}Accedi a Get Camino{{ else }}Sign in to Get Camino{{ end }}</a></div>
  <p style="font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:20px;color:#4A5A70;margin:0 0 8px;">{{ if eq $lang "es" }}¿Lo estás leyendo en otro dispositivo? Introduce este código en la app:{{ else if eq $lang "fr" }}Tu lis ceci sur un autre appareil ? Saisis ce code dans l’app :{{ else if eq $lang "de" }}Liest du das auf einem anderen Gerät? Gib stattdessen diesen Code in der App ein:{{ else if eq $lang "it" }}Lo stai leggendo su un altro dispositivo? Inserisci questo codice nell’app:{{ else }}Reading this on a different device? Enter this code in the app instead:{{ end }}</p>
  <div style="margin:0 0 24px;"><span style="display:inline-block;font-family:'Courier New',Courier,monospace;font-size:28px;letter-spacing:8px;font-weight:700;color:#15243B;background:#FFFFFF;border:1px solid #E8E4DC;border-radius:10px;padding:14px 18px;">{{ .Token }}</span></div>
  <p style="font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:20px;color:#8A9BB0;margin:0 0 16px;">{{ if eq $lang "es" }}El enlace y el código caducan en una hora y funcionan una sola vez. ¿No lo pediste? Puedes ignorarlo tranquilamente — sin él no pasa nada.{{ else if eq $lang "fr" }}Le lien et le code expirent dans une heure et ne servent qu’une fois. Tu n’as rien demandé ? Ignore cet e-mail — rien ne se passe sans lui.{{ else if eq $lang "de" }}Link und Code laufen in einer Stunde ab und funktionieren einmal. Nicht angefordert? Einfach ignorieren — ohne ihn passiert nichts.{{ else if eq $lang "it" }}Il link e il codice scadono tra un’ora e valgono una sola volta. Non l’hai richiesto? Puoi ignorarlo tranquillamente — senza non succede nulla.{{ else }}The link and code expire in an hour and work once. Didn’t request this? You can safely ignore it — nothing happens without it.{{ end }}</p>
  <hr style="border:none;border-top:1px solid #E8E4DC;margin:32px 0 16px;">
  <div style="font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:18px;color:#8A9BB0;">
    {{ if eq $lang "es" }}Recibes esto porque esta dirección se usó para entrar en Get Camino.{{ else if eq $lang "fr" }}Tu reçois ceci parce que cette adresse a servi à se connecter à Get Camino.{{ else if eq $lang "de" }}Du bekommst das, weil mit dieser Adresse eine Anmeldung bei Get Camino angefordert wurde.{{ else if eq $lang "it" }}Ricevi questa e-mail perché questo indirizzo è stato usato per accedere a Get Camino.{{ else }}You’re getting this because this address was used to sign in to Get Camino.{{ end }}
    <br>{{ if eq $lang "es" }}Solo orientación — no es asesoramiento legal ni fiscal.{{ else if eq $lang "fr" }}Simple orientation — ni conseil juridique ni conseil fiscal.{{ else if eq $lang "de" }}Nur Orientierung — keine Rechts- oder Steuerberatung.{{ else if eq $lang "it" }}Solo orientamento — non è consulenza legale né fiscale.{{ else }}Guidance only — not legal or tax advice.{{ end }}
  </div>
</div>
</body></html>
```

## Confirm sign up

**Subject** (compact — 255-char cap; brand outside the branch):

```
{{ $l := printf "%v" .Data.lang }}Get Camino: {{ if eq $l "es" }}confirma tu correo{{ else if eq $l "fr" }}confirme ton e-mail{{ else if eq $l "de" }}bestätige deine E-Mail{{ else if eq $l "it" }}conferma la tua e-mail{{ else }}confirm your email{{ end }}
```

**Body (Source):**

```html
{{ $lang := printf "%v" .Data.lang }}<!doctype html>
<html><body style="margin:0;padding:0;background:#FBFAF7;">
<div style="max-width:560px;margin:0 auto;padding:32px 24px;font-family:Georgia,'Times New Roman',serif;color:#15243B;">
  <div style="font-size:22px;font-weight:600;margin-bottom:24px;">Get Camino <span style="color:#8A9BB0;font-size:14px;font-style:italic;">{{ if eq $lang "es" }}— tu camino a España{{ else if eq $lang "fr" }}— ta route vers l’Espagne{{ else if eq $lang "de" }}— dein Weg nach Spanien{{ else if eq $lang "it" }}— la tua strada per la Spagna{{ else }}— your road to Spain{{ end }}</span></div>
  <p style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:24px;margin:0 0 16px;">{{ if eq $lang "es" }}Hola — soy Lola.{{ else if eq $lang "fr" }}Hola — je suis Lola.{{ else if eq $lang "de" }}Hola — ich bin Lola.{{ else if eq $lang "it" }}Hola — sono Lola.{{ else }}Hola — I’m Lola.{{ end }}</p>
  <p style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:24px;margin:0 0 16px;">{{ if eq $lang "es" }}Un toque para confirmar esta dirección y tu cuenta de Get Camino está lista:{{ else if eq $lang "fr" }}Un appui pour confirmer cette adresse et ton compte Get Camino est prêt :{{ else if eq $lang "de" }}Ein Tipp zum Bestätigen dieser Adresse und dein Konto bei Get Camino ist bereit:{{ else if eq $lang "it" }}Un tocco per confermare questo indirizzo e il tuo account Get Camino è pronto:{{ else }}One tap to confirm this address and your Get Camino account is ready:{{ end }}</p>
  <div style="margin:24px 0;"><a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#2B5AA3;color:#FFFFFF;text-decoration:none;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;padding:12px 22px;border-radius:8px;">{{ if eq $lang "es" }}Confirmar mi correo{{ else if eq $lang "fr" }}Confirmer mon e-mail{{ else if eq $lang "de" }}Meine E-Mail bestätigen{{ else if eq $lang "it" }}Conferma la mia e-mail{{ else }}Confirm my email{{ end }}</a></div>
  <p style="font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:20px;color:#4A5A70;margin:0 0 8px;">{{ if eq $lang "es" }}¿Lo estás leyendo en otro dispositivo? Introduce este código en la app:{{ else if eq $lang "fr" }}Tu lis ceci sur un autre appareil ? Saisis ce code dans l’app :{{ else if eq $lang "de" }}Liest du das auf einem anderen Gerät? Gib stattdessen diesen Code in der App ein:{{ else if eq $lang "it" }}Lo stai leggendo su un altro dispositivo? Inserisci questo codice nell’app:{{ else }}Reading this on a different device? Enter this code in the app instead:{{ end }}</p>
  <div style="margin:0 0 24px;"><span style="display:inline-block;font-family:'Courier New',Courier,monospace;font-size:28px;letter-spacing:8px;font-weight:700;color:#15243B;background:#FFFFFF;border:1px solid #E8E4DC;border-radius:10px;padding:14px 18px;">{{ .Token }}</span></div>
  <p style="font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:20px;color:#8A9BB0;margin:0 0 16px;">{{ if eq $lang "es" }}El enlace y el código caducan en una hora. ¿No creaste una cuenta de Get Camino? Puedes ignorar este correo.{{ else if eq $lang "fr" }}Le lien et le code expirent dans une heure. Tu n’as pas créé de compte Get Camino ? Ignore simplement cet e-mail.{{ else if eq $lang "de" }}Link und Code laufen in einer Stunde ab. Kein Konto bei Get Camino erstellt? Ignoriere diese E-Mail einfach.{{ else if eq $lang "it" }}Il link e il codice scadono tra un’ora. Non hai creato un account Get Camino? Puoi ignorare questa e-mail.{{ else }}The link and code expire in an hour. Didn’t create a Get Camino account? You can safely ignore this email.{{ end }}</p>
  <hr style="border:none;border-top:1px solid #E8E4DC;margin:32px 0 16px;">
  <div style="font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:18px;color:#8A9BB0;">
    {{ if eq $lang "es" }}Recibes esto porque esta dirección se usó para crear una cuenta de Get Camino.{{ else if eq $lang "fr" }}Tu reçois ceci parce que cette adresse a servi à créer un compte Get Camino.{{ else if eq $lang "de" }}Du bekommst das, weil mit dieser Adresse ein Konto bei Get Camino erstellt wurde.{{ else if eq $lang "it" }}Ricevi questa e-mail perché questo indirizzo è stato usato per creare un account Get Camino.{{ else }}You’re getting this because this address was used to create a Get Camino account.{{ end }}
    <br>{{ if eq $lang "es" }}Solo orientación — no es asesoramiento legal ni fiscal.{{ else if eq $lang "fr" }}Simple orientation — ni conseil juridique ni conseil fiscal.{{ else if eq $lang "de" }}Nur Orientierung — keine Rechts- oder Steuerberatung.{{ else if eq $lang "it" }}Solo orientamento — non è consulenza legale né fiscale.{{ else }}Guidance only — not legal or tax advice.{{ end }}
  </div>
</div>
</body></html>
```
