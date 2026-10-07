"use server";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { photoBucket, readProfile, type ProfileState } from "@/lib/profile";

export async function saveProfile(previous: ProfileState, form: FormData): Promise<ProfileState> {
  const supabase = await createServerSupabaseClient();
  const { data: identity, error: authError } = await supabase.auth.getUser();
  if (authError || !identity.user?.email_confirmed_at) return { success: false, message: "Entre na conta com e-mail confirmado para salvar." };
  const userId = identity.user.id;
  let fields;
  try { fields = readProfile(form); }
  catch (error) { return { success: false, message: error instanceof Error ? error.message : "Confira os dados do perfil." }; }
  const { data: existing, error: readError } = await supabase.from("duoeto_profiles").select("photo_path,gallery_paths").eq("user_id", userId).maybeSingle();
  if (readError) return { success: false, message: "O armazenamento de perfis ainda não está disponível. Tente novamente mais tarde." };
  const existingPaths: string[] = existing ? [existing.photo_path, ...(existing.gallery_paths ?? [])] : [];
  const removed = new Set(form.getAll("remove_photo").map(String));
  const selected = String(form.get("main_photo") ?? existing?.photo_path ?? "");
  if (selected && !existingPaths.includes(selected)) return { success: false, message: "Escolha uma foto salva no seu perfil." };
  let photoPath = selected;
  const mainUpload = String(form.get("uploaded_main") ?? "");
  const extras = form.getAll("uploaded_gallery").map(String);
  if ([mainUpload, ...extras].filter(Boolean).some(path => !path.startsWith(userId + "/") || path.length > 200)) return { success: false, message: "Foto inválida." };
  if (removed.has(photoPath) && !mainUpload) return { success: false, message: "Escolha outra foto principal antes de remover esta." };
  const gallery = [...existingPaths.filter(path => path !== selected && !removed.has(path)), ...extras];
  if (gallery.length > 5) return { success: false, message: "Seu perfil pode ter até 6 fotos, incluindo a principal." };
  if (mainUpload) photoPath = mainUpload;
  if (!photoPath) return { success: false, message: "Adicione uma foto principal para salvar seu perfil." };
  const profile = { ...fields, photo_path: photoPath, gallery_paths: gallery };
  const { error } = await supabase.from("duoeto_profiles").upsert({ ...profile, user_id: userId }, { onConflict: "user_id" });
  if (error) {
    return { success: false, message: "Não foi possível salvar o perfil. Seus dados anteriores foram preservados." };
  }
  const { data: signedPhoto } = await supabase.storage.from(photoBucket).createSignedUrl(photoPath, 3600);
  const galleryPhotos = await supabase.storage.from(photoBucket).createSignedUrls(gallery, 3600);
  revalidatePath("/perfil");
  return { success: true, message: "Perfil salvo. Você pode editar ou pré-visualizar quando quiser.", profile, photoUrl: signedPhoto?.signedUrl, galleryUrls: galleryPhotos.data?.map(photo => photo.signedUrl ?? "") };
}

// One request per file keeps each transfer below the hosting platform's request limit.
export async function uploadProfilePhoto(form: FormData): Promise<{ path?: string; error?: string }> {
  const supabase = await createServerSupabaseClient();
  const { data, error: authError } = await supabase.auth.getUser();
  if (authError || !data.user?.email_confirmed_at) return { error: "Entre com sua conta confirmada para enviar fotos." };
  const file = form.get("photo");
  if (!(file instanceof File) || !file.size || file.size > 3 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) return { error: "Cada foto deve ser JPG, PNG ou WebP de até 3 MB." };
  try {
    const input = sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 25000000, animated: false });
    const metadata = await input.metadata();
    if (!["jpeg", "png", "webp"].includes(metadata.format ?? "") || (metadata.pages ?? 1) > 1) throw new Error();
    const processed = await input.rotate().resize(1600, 1600, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
    const path = data.user.id + "/" + randomUUID() + ".jpg";
    const { error } = await supabase.storage.from(photoBucket).upload(path, processed, { contentType: "image/jpeg", upsert: false });
    if (error) throw error;
    return { path };
  } catch { return { error: "Não foi possível processar ou enviar a foto. Tente outra imagem." }; }
}
