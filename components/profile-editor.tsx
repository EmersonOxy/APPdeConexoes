"use client";
import {genderOptions} from "@/lib/discovery-options";
import Image from "next/image";
import { ReputationPanel } from "./reputation";
import { useActionState, useState } from "react";
import { saveProfile, uploadProfilePhoto } from "@/app/perfil/actions";
import { ageFromBirthDate, interestOptions, objectiveOptions, stateOptions, type Profile, type ProfileState } from "@/lib/profile";

export function ProfileEditor({ initialProfile, initialPhotoUrl, initialGalleryUrls = [], userId }: { initialProfile: Profile | null; initialPhotoUrl?: string; initialGalleryUrls?: string[]; userId: string }) {
  const [result, action, pending] = useActionState<ProfileState, FormData>(async (previous, form) => {
    const main = form.get("photo");
    const extras = form.getAll("gallery").filter((file): file is File => file instanceof File && file.size > 0);
    const files = [...(main instanceof File && main.size > 0 ? [main] : []), ...extras];
    if (files.length > 6 || files.some(file => file.size > 3 * 1024 * 1024)) return { ...previous, success: false, message: "Escolha até 6 fotos, cada uma com no máximo 3 MB." };
    const current = previous.profile ?? initialProfile;
    const selected = String(form.get("main_photo") ?? current?.photo_path ?? "");
    const removed = new Set(form.getAll("remove_photo").map(String));
    const retained = current ? [current.photo_path, ...(current.gallery_paths ?? [])].filter(path => path !== selected && !removed.has(path)) : [];
    if (retained.length + extras.length > 5) return { ...previous, success: false, message: "Remova fotos do álbum para adicionar outras. O limite é 6, incluindo a principal." };
    form.delete("photo"); form.delete("gallery");
    try {
      for (const file of files) {
        const upload = new FormData(); upload.set("photo", file);
        const result = await uploadProfilePhoto(upload);
        if (result.error || !result.path) return { ...previous, success: false, message: result.error ?? "Falha no envio da foto." };
        form.append(file === main ? "uploaded_main" : "uploaded_gallery", result.path);
      }
      const result = await saveProfile(previous, form);
      return result.success ? result : { ...previous, ...result };
    } catch { return { ...previous, success: false, message: "Falha de conexão. Confira seu perfil antes de tentar novamente." }; }
  }, { message: "", success: false });
  const [preview, setPreview] = useState(false);
  const saved = result.profile ?? initialProfile;
  const photoUrl = result.photoUrl ?? initialPhotoUrl;
  const galleryUrls = result.galleryUrls ?? initialGalleryUrls;
  const paths = saved ? [saved.photo_path, ...(saved.gallery_paths ?? [])] : [];
  const urls = [photoUrl, ...galleryUrls];
  return (
    <div className="profile-workspace">
      <div className="editor-toolbar">
        <button className="button button-secondary" onClick={() => setPreview(!preview)} disabled={!saved || pending} type="button">{preview ? "Editar perfil" : "Pré-visualizar perfil salvo"}</button>
        <span className="muted">A prévia utiliza as informações já salvas.</span>
        {saved ? <span className="chip">Completude: {Math.round([saved.display_name, saved.birth_date, saved.city, saved.state, saved.photo_path, saved.about.trim(), saved.interests.length > 0, saved.objectives.length > 0].filter(Boolean).length / 8 * 100)}%</span> : null}
      </div>
      {preview && saved ? (
        <article className="panel saved-preview">
          {photoUrl && <Image src={photoUrl} alt={"Foto principal de " + saved.display_name} width={600} height={600} unoptimized className="profile-photo" />}
          <div className="album-preview">{galleryUrls.map((url, index) => <img key={url} src={url} alt={`Foto ${index + 2} de ${saved.display_name}`} className="profile-photo" />)}</div>
          <h2>{saved.display_name}, {ageFromBirthDate(saved.birth_date)}</h2>
          <p className="muted">{saved.city}, {saved.state}</p>
          <p className="profile-about">{saved.about}</p>
          <div className="chips">{saved.interests.map(value => <span className="chip" key={value}>{value}</span>)}</div>
          {saved.objectives.length > 0 && <p>Procuro: {saved.objectives.join(", ")}</p>}
          <p className="notice">Sua data de nascimento e seu e-mail não aparecem na prévia. Visitantes só veem a reputação depois de avaliar.</p>
          <ReputationPanel target={userId} readOnly />
        </article>
      ) : (
        <form key={paths.join(",")} action={action} className="panel form profile-form">
          <div className="photo-field">
            {photoUrl && <Image src={photoUrl} alt="Sua foto principal salva" width={160} height={160} unoptimized className="profile-photo" />}
            <label>Foto principal {saved ? "(trocar é opcional)" : "*"}<input type="file" name="photo" accept="image/jpeg,image/png,image/webp" required={!saved} /></label>
            <p className="muted">JPG, PNG ou WebP, até 3 MB. Removemos os metadados da imagem ao salvar.</p>
          </div>
          <fieldset><legend>Seu álbum · até 6 fotos</legend>
            {saved ? <div className="album-editor">{paths.map((path, index) => <div key={path}>
              {urls[index] ? <img src={urls[index]} alt={`Sua foto ${index + 1}`} className="profile-photo" /> : null}
              <label><input type="radio" name="main_photo" value={path} defaultChecked={index === 0} /> Foto principal</label>
              <label><input type="checkbox" name="remove_photo" value={path} /> Remover ao salvar</label>
            </div>)}</div> : null}
            <label>Adicionar fotos ao álbum<input type="file" name="gallery" multiple accept="image/jpeg,image/png,image/webp" /></label>
            <p className="field-help">Até 3 MB por foto. Para remover a principal, escolha outra ou envie uma substituta.</p>
          </fieldset>
          <div className="profile-fields">
            <label>Nome *<input name="display_name" autoComplete="nickname" defaultValue={saved?.display_name} required minLength={2} maxLength={80} /></label>
            <label>Data de nascimento *<input name="birth_date" type="date" autoComplete="bday" defaultValue={saved?.birth_date} required /><span className="field-help">Mostramos apenas sua idade. Uso permitido a partir de 18 anos.</span></label>
            <label>Cidade *<input name="city" autoComplete="address-level2" defaultValue={saved?.city} required minLength={2} maxLength={100} /></label>
            <label>Estado *<select name="state" autoComplete="address-level1" defaultValue={saved?.state ?? ""} required><option value="" disabled>Selecione</option>{stateOptions.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
          </div>
          <label>Gênero (opcional)<select name="gender" defaultValue={saved?.gender??""}><option value="">Prefiro não informar</option>{Object.entries(genderOptions).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select><span className="field-help">Usado nas preferências de descoberta. Você pode alterar ou remover essa informação.</span></label>
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
