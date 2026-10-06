"use client";
import Image from "next/image";
import { useActionState, useState } from "react";
import { saveProfile } from "@/app/perfil/actions";
import { ageFromBirthDate, interestOptions, objectiveOptions, stateOptions, type Profile, type ProfileState } from "@/lib/profile";

export function ProfileEditor({ initialProfile, initialPhotoUrl }: { initialProfile: Profile | null; initialPhotoUrl?: string }) {
  const [result, action, pending] = useActionState<ProfileState, FormData>(saveProfile, { message: "", success: false });
  const [preview, setPreview] = useState(false);
  const saved = result.profile ?? initialProfile;
  const photoUrl = result.photoUrl ?? initialPhotoUrl;
  return (
    <div className="profile-workspace">
      <div className="editor-toolbar">
        <button className="button button-secondary" onClick={() => setPreview(!preview)} disabled={!saved || pending} type="button">{preview ? "Editar perfil" : "Pré-visualizar perfil salvo"}</button>
        <span className="muted">A prévia utiliza as informações já salvas.</span>
      </div>
      {preview && saved ? (
        <article className="panel saved-preview">
          {photoUrl && <Image src={photoUrl} alt={"Foto principal de " + saved.display_name} width={600} height={600} unoptimized className="profile-photo" />}
          <h2>{saved.display_name}, {ageFromBirthDate(saved.birth_date)}</h2>
          <p className="muted">{saved.city}, {saved.state}</p>
          <p className="profile-about">{saved.about}</p>
          <div className="chips">{saved.interests.map(value => <span className="chip" key={value}>{value}</span>)}</div>
          {saved.objectives.length > 0 && <p>Procuro: {saved.objectives.join(", ")}</p>}
          <p className="notice">Ainda sem avaliações. Sua data de nascimento e seu e-mail não aparecem na prévia.</p>
        </article>
      ) : (
        <form action={action} className="panel form profile-form">
          <div className="photo-field">
            {photoUrl && <Image src={photoUrl} alt="Sua foto principal salva" width={160} height={160} unoptimized className="profile-photo" />}
            <label>Foto principal {saved ? "(trocar é opcional)" : "*"}<input type="file" name="photo" accept="image/jpeg,image/png,image/webp" required={!saved} /></label>
            <p className="muted">JPG, PNG ou WebP, até 5 MB. Removemos os metadados da imagem ao salvar.</p>
          </div>
          <div className="profile-fields">
            <label>Nome *<input name="display_name" autoComplete="nickname" defaultValue={saved?.display_name} required minLength={2} maxLength={80} /></label>
            <label>Data de nascimento *<input name="birth_date" type="date" autoComplete="bday" defaultValue={saved?.birth_date} required /><span className="field-help">Mostramos apenas sua idade. Uso permitido a partir de 18 anos.</span></label>
            <label>Cidade *<input name="city" autoComplete="address-level2" defaultValue={saved?.city} required minLength={2} maxLength={100} /></label>
            <label>Estado *<select name="state" autoComplete="address-level1" defaultValue={saved?.state ?? ""} required><option value="" disabled>Selecione</option>{stateOptions.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
          </div>
          <label>Sobre mim (opcional)<textarea name="about" defaultValue={saved?.about} maxLength={500} /></label>
          <fieldset><legend>Interesses (opcional)</legend><div className="choice-grid">{interestOptions.map(value => <label key={value}><input type="checkbox" name="interests" value={value} defaultChecked={saved?.interests.includes(value)} />{value}</label>)}</div></fieldset>
          <fieldset><legend>O que procuro (opcional)</legend><div className="choice-grid">{objectiveOptions.map(value => <label key={value}><input type="checkbox" name="objectives" value={value} defaultChecked={saved?.objectives.includes(value)} />{value}</label>)}</div></fieldset>
          <p className="muted">* Campos obrigatórios. Seus dados são salvos na sua conta.</p>
          <button className="button button-primary" type="submit" disabled={pending}>{pending ? "Salvando…" : saved ? "Salvar alterações" : "Salvar meu perfil"}</button>
        </form>
      )}
      {result.message && <p role="status" className="notice">{result.message}</p>}
    </div>
  );
}
